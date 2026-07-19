import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, Polyline,
  useMap, useMapEvents, ZoomControl
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';

// --------------------------------------------------------------------
// Fix Leaflet default icon issue
// --------------------------------------------------------------------
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons based on user type/status
const createRiderIcon = (status, type) => {
  const colors = {
    online: '#1F6F50', offline: '#9E9E9E', busy: '#C97A1E', inactive: '#C0433F',
    customer: '#3763C9', wholesaler: '#C97A1E',
  };
  const color = colors[status] || colors[type] || '#9E9E9E';
  let emoji = '🛵';
  if (type === 'customer') emoji = '🛒';
  else if (type === 'wholesaler') emoji = '🏭';
  else if (status === 'busy') emoji = '🏍️';

  return L.divIcon({
    className: 'custom-rider-icon',
    html: `<div style="width:38px;height:38px;background:${color};border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:15px;">${emoji}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38],
  });
};

const hubIcon = L.divIcon({
  className: 'hub-icon',
  html: `<div style="width:46px;height:46px;background:#1F6F50;border-radius:50%;border:4px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:19px;color:white;">🏪</div>`,
  iconSize: [46, 46],
  iconAnchor: [23, 46],
  popupAnchor: [0, -46],
});

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 14, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

// Reports the current viewport so fetches can be scoped to it instead of
// always pulling every rider/customer/wholesaler regardless of map position —
// this is what keeps polling cheap as user counts grow.
const BoundsWatcher = ({ onBoundsChange }) => {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
    zoomend: () => onBoundsChange(map.getBounds()),
  });
  useEffect(() => {
    onBoundsChange(map.getBounds()); // report the initial viewport too
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'online', label: '🟢 Online' },
  { value: 'busy', label: '🟠 Busy' },
  { value: 'offline', label: '⚫ Offline' },
  { value: 'customer', label: '🛒 Customers' },
  { value: 'wholesaler', label: '🏭 Wholesalers' },
];

const HubMap = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  const [mapCenter, setMapCenter] = useState([31.72, 72.98]);
  const [mapZoom, setMapZoom] = useState(14);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(10);
  const intervalRef = useRef(null);

  // Current map viewport, debounced — passed to the location endpoints so
  // they can filter server-side instead of returning full collections.
  const [bounds, setBounds] = useState(null);
  const boundsDebounceRef = useRef(null);
  const handleBoundsChange = useCallback((leafletBounds) => {
    if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
    boundsDebounceRef.current = setTimeout(() => {
      const sw = leafletBounds.getSouthWest();
      const ne = leafletBounds.getNorthEast();
      setBounds({ swLat: sw.lat, swLng: sw.lng, neLat: ne.lat, neLng: ne.lng });
    }, 400);
  }, []);

  const hubLocation = { lat: 31.72, lng: 72.98 };
  const [riderPaths, setRiderPaths] = useState({});

  const usersWithLocation = filteredUsers.filter(
    (user) => user.location?.lat != null && user.location?.lng != null
  );

  const fetchAllLocations = useCallback(async () => {
    try {
      const params = bounds
        ? { swLat: bounds.swLat, swLng: bounds.swLng, neLat: bounds.neLat, neLng: bounds.neLng }
        : {};
      const [ridersRes, customersRes, wholesalersRes] = await Promise.all([
        api.get('/admin/riders/locations', { params }),
        api.get('/admin/customers/locations', { params }),
        api.get('/admin/wholesalers/locations', { params }),
      ]);

      const ridersData = (ridersRes.data || []).map((r) => ({ ...r, type: 'rider', location: r.currentLocation || null }));
      const customersData = (customersRes.data || []).map((c) => ({
        ...c, type: 'customer', location: c.currentLocation || null, vehicle: { type: 'Customer' }, status: 'customer',
      }));
      const wholesalersData = (wholesalersRes.data || []).map((w) => {
        let location = null;
        if (w.shopLocation?.coordinates && w.shopLocation.coordinates.length === 2 &&
            (w.shopLocation.coordinates[0] !== 0 || w.shopLocation.coordinates[1] !== 0)) {
          const [lng, lat] = w.shopLocation.coordinates;
          location = { lat, lng };
        } else if (w.currentLocation?.lat && w.currentLocation?.lng) {
          location = w.currentLocation;
        }
        return { ...w, type: 'wholesaler', location, status: 'wholesaler' };
      });

      const allUsers = [...ridersData, ...customersData, ...wholesalersData];
      setUsers(allUsers);
      setFilteredUsers(allUsers);

      const paths = {};
      allUsers.forEach((user) => {
        if (user.path && user.path.length > 1) {
          paths[user._id] = user.path.map((p) => [p.lat, p.lng]);
        }
      });
      setRiderPaths(paths);
    } catch (error) {
      toast.error('Could not load locations');
    } finally {
      setLoading(false);
    }
  }, [bounds]);

  useEffect(() => { fetchAllLocations(); }, [fetchAllLocations]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAllLocations, refreshInterval * 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, refreshInterval, fetchAllLocations]);

  // Real-time rider location push — this is what actually keeps rider
  // positions fresh between polls. REST polling above still runs (and is
  // still needed for customers/wholesalers, initial load, and status
  // changes like busy/online that aren't location pings), but rider
  // position no longer has to wait for the next poll tick.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleLocationUpdate = ({ riderId, lat, lng, lastLocationUpdate }) => {
      setUsers((prev) =>
        prev.map((u) =>
          u.type === 'rider' && u._id === riderId
            ? { ...u, location: { lat, lng }, lastLocationUpdate: lastLocationUpdate || new Date().toISOString() }
            : u
        )
      );
    };

    socket.on('rider_location_update', handleLocationUpdate);
    return () => socket.off('rider_location_update', handleLocationUpdate);
  }, []);

  useEffect(() => {
    let filtered = [...users];
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) => u.name?.toLowerCase().includes(s) ||
          u.email?.toLowerCase().includes(s) ||
          (u.vehicle?.plateNumber || '').toLowerCase().includes(s) ||
          (u.storeName || '').toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter((u) => u.status === statusFilter || u.type === statusFilter);
    }
    setFilteredUsers(filtered);
  }, [searchTerm, statusFilter, users]);

  const handleMarkerClick = (user) => {
    if (!user?.location?.lat) return;
    setSelectedUser(user);
    setMapCenter([user.location.lat, user.location.lng]);
    setMapZoom(16);
    setShowUserModal(true);
  };

  const handleListItemClick = (user) => {
    if (!user?.location?.lat) return;
    setSelectedUser(user);
    setMapCenter([user.location.lat, user.location.lng]);
    setMapZoom(16);
  };

  const statusPillKind = (status, type) => {
    if (type === 'wholesaler') return 'accent';
    if (type === 'customer') return 'info';
    const map = { online: 'primary', offline: 'muted', busy: 'accent', inactive: 'danger' };
    return map[status] || 'muted';
  };
  const statusPillLabel = (status, type) => {
    if (type === 'wholesaler') return 'Wholesaler';
    if (type === 'customer') return 'Customer';
    const map = { online: 'Online', offline: 'Offline', busy: 'Busy', inactive: 'Inactive' };
    return map[status] || 'Offline';
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  const onlineCount = users.filter((r) => r.status === 'online' && r.type === 'rider').length;
  const busyCount = users.filter((r) => r.status === 'busy' && r.type === 'rider').length;
  const offlineCount = users.filter((r) => r.status === 'offline' && r.type === 'rider').length;
  const customerCount = users.filter((u) => u.type === 'customer').length;
  const wholesalerCount = users.filter((u) => u.type === 'wholesaler').length;

  const stats = [
    { label: 'Online', value: onlineCount, color: 'var(--primary)' },
    { label: 'Busy', value: busyCount, color: 'var(--accent)' },
    { label: 'Offline', value: offlineCount, color: 'var(--muted)' },
    { label: 'Customers', value: customerCount, color: 'var(--info)' },
    { label: 'Wholesalers', value: wholesalerCount, color: 'var(--accent)' },
  ];

  if (loading) {
    return <div className="gx-empty"><div className="gx-glyph">📍</div><h4>Loading locations…</h4></div>;
  }

  return (
    <>
      <div className="gx-searchbar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.6" /><path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <input placeholder="Search name, email, store…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="gx-chip-scroll">
        {FILTERS.map((f) => (
          <div key={f.value} className={`gx-chip ${statusFilter === f.value ? 'active' : ''}`} onClick={() => setStatusFilter(f.value)}>{f.label}</div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 12, paddingBottom: 2 }}>
        {stats.map((s) => (
          <div key={s.label} className="gx-card" style={{ flex: '0 0 auto', padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="gx-flex-between" style={{ marginTop: 14 }}>
        <div className="gx-switch-row" style={{ margin: 0 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>Auto-refresh</span>
          <label className="gx-switch" style={{ marginLeft: 8 }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            <span className="gx-slider" />
          </label>
        </div>
        {autoRefresh && (
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            style={{ border: '1px solid var(--border)', borderRadius: 9, padding: '5px 8px', fontSize: 12 }}
          >
            <option value="5">5s</option>
            <option value="10">10s</option>
            <option value="30">30s</option>
            <option value="60">60s</option>
          </select>
        )}
        <button className="gx-icon-btn" onClick={fetchAllLocations} aria-label="Refresh">🔄</button>
      </div>

      <div className="gx-card" style={{ marginTop: 12, height: 300, position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-l)' }}>
        <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer
            url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use">Wikimedia</a> | Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <ZoomControl position="topright" />
          <MapController center={mapCenter} zoom={mapZoom} />
          <BoundsWatcher onBoundsChange={handleBoundsChange} />

          <Marker position={[hubLocation.lat, hubLocation.lng]} icon={hubIcon}>
            <Popup><strong>🏪 Groxo Hub</strong><br /><small>Main Distribution Center – Chiniot</small></Popup>
          </Marker>
          <Circle center={[hubLocation.lat, hubLocation.lng]} radius={2000} pathOptions={{ color: '#1F6F50', fillColor: '#1F6F50', fillOpacity: 0.08 }} />

          {usersWithLocation.map((user) => (
            <React.Fragment key={user._id}>
              <Marker
                position={[user.location.lat, user.location.lng]}
                icon={createRiderIcon(user.status, user.type)}
                eventHandlers={{ click: () => handleMarkerClick(user) }}
              >
                <Popup>
                  <div style={{ minWidth: 180 }}>
                    <strong>{user.name}</strong>
                    {user.type === 'wholesaler' ? (
                      <><br /><small>🏪 {user.storeName || 'Store'}<br />📱 {user.phone}</small></>
                    ) : (
                      <><br /><small>🛵 {user.vehicle?.type || 'Vehicle'} · {user.vehicle?.plateNumber || 'No plate on file'}</small></>
                    )}
                  </div>
                </Popup>
              </Marker>
              {user.type === 'rider' && riderPaths[user._id]?.length > 1 && (
                <Polyline
                  positions={riderPaths[user._id]}
                  pathOptions={{ color: user.status === 'online' ? '#1F6F50' : '#C97A1E', weight: 3, opacity: 0.6, dashArray: '8 4' }}
                />
              )}
            </React.Fragment>
          ))}
        </MapContainer>
      </div>
      <div className="gx-map-legend">
        <span><i style={{ background: '#1F6F50' }} />Online</span>
        <span><i style={{ background: '#C97A1E' }} />Busy</span>
        <span><i style={{ background: '#9E9E9E' }} />Offline</span>
        <span><i style={{ background: '#3763C9' }} />Customer</span>
        <span><i style={{ background: '#C97A1E' }} />Wholesaler</span>
      </div>

      <div className="gx-section-title">Nearby ({filteredUsers.length})</div>
      {filteredUsers.length === 0 ? (
        <div className="gx-empty">
          <div className="gx-glyph">📍</div>
          <h4>No users found</h4>
          <p>Try a different search or filter.</p>
        </div>
      ) : (
        filteredUsers.map((user) => (
          <div className="gx-row-item" key={user._id} style={{ cursor: 'pointer' }} onClick={() => handleListItemClick(user)}>
            <div className="gx-row-avatar" style={{ background: 'var(--bg-sunk)' }}>
              {user.type === 'wholesaler' ? '🏭' : user.type === 'customer' ? '🛒' : '🛵'}
            </div>
            <div className="gx-row-body">
              <div className="gx-row-title">{user.name}</div>
              <div className="gx-row-sub">{user.type === 'wholesaler' ? user.storeName : (user.vehicle?.plateNumber || formatTime(user.lastLocationUpdate))}</div>
            </div>
            <div className="gx-row-end">
              <span className={`gx-pill gx-pill-${statusPillKind(user.status, user.type)}`}><span className="gx-pill-dot" />{statusPillLabel(user.status, user.type)}</span>
            </div>
          </div>
        ))
      )}

      <Modal
        isOpen={showUserModal}
        onClose={() => setShowUserModal(false)}
        title={`${selectedUser?.type === 'wholesaler' ? '🏭' : selectedUser?.type === 'customer' ? '🛒' : '🛵'} ${selectedUser?.name || ''}`}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowUserModal(false)}>Close</button>
            <button
              className="gx-btn gx-btn-primary"
              onClick={() => {
                setShowUserModal(false);
                if (selectedUser?.location?.lat) {
                  setMapCenter([selectedUser.location.lat, selectedUser.location.lng]);
                  setMapZoom(16);
                }
              }}
            >
              📍 Center on map
            </button>
          </>
        }
      >
        {selectedUser && (
          selectedUser.type === 'wholesaler' ? (
            <div className="gx-stack-meta gx-mt-0">
              <div>Store name<b>{selectedUser.storeName || '-'}</b></div>
              <div>Email<b>{selectedUser.email}</b></div>
              <div>Phone<b>{selectedUser.phone}</b></div>
              <div>Business licence<b>{selectedUser.businessLicense || '-'}</b></div>
              <div>Shop address<b>{selectedUser.shopLocation?.address || 'Not set'}</b></div>
              <div>Account status<b style={{ color: selectedUser.isActive ? 'var(--primary)' : 'var(--danger)' }}>{selectedUser.isActive ? 'Active' : 'Inactive'}</b></div>
            </div>
          ) : (
            <div className="gx-stack-meta gx-mt-0">
              <div>Email<b>{selectedUser.email}</b></div>
              <div>Phone<b>{selectedUser.phone}</b></div>
              <div>Vehicle<b>{selectedUser.vehicle?.type} ({selectedUser.vehicle?.plateNumber})</b></div>
              <div>Total deliveries<b>{selectedUser.totalDeliveries || 0}</b></div>
              <div>Today's earnings<b>Rs. {selectedUser.earnings?.today || 0}</b></div>
              <div>Last location update<b>{formatTime(selectedUser.lastLocationUpdate)}</b></div>
              <div>Account status<b style={{ color: selectedUser.isActive ? 'var(--primary)' : 'var(--danger)' }}>{selectedUser.isActive ? 'Active' : 'Inactive'}</b></div>
            </div>
          )
        )}
      </Modal>
    </>
  );
};

export default HubMap;
