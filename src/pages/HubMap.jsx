import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container, Row, Col, Card, Form, Badge, Button,
  InputGroup, ListGroup, Spinner, Modal
} from 'react-bootstrap';
import {
  MapContainer, TileLayer, Marker, Popup, Circle, Polyline,
  useMap, ZoomControl
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../services/api';
import { toast } from 'react-toastify';

// --------------------------------------------------------------------
// 1. Fix Leaflet default icon issue
// --------------------------------------------------------------------
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// --------------------------------------------------------------------
// 2. Custom icons based on user type/status
// --------------------------------------------------------------------
const createRiderIcon = (status, type) => {
  const colors = {
    online: '#4CAF50',
    offline: '#9E9E9E',
    busy: '#FF9800',
    inactive: '#f44336',
    customer: '#2196F3',
    wholesaler: '#FF9800',
  };
  const color = colors[status] || colors[type] || '#9E9E9E';
  let emoji = '🛵';
  if (type === 'customer') emoji = '🛒';
  else if (type === 'wholesaler') emoji = '🏭';
  else if (status === 'busy') emoji = '🏍️';

  return L.divIcon({
    className: 'custom-rider-icon',
    html: `<div style="
      width: 40px; height: 40px;
      background: ${color};
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; color: white; font-weight: bold;
    ">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

// Hub location icon
const hubIcon = L.divIcon({
  className: 'hub-icon',
  html: `<div style="
    width: 50px; height: 50px;
    background: #2196F3;
    border-radius: 50%;
    border: 4px solid white;
    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; color: white;
  ">🏪</div>`,
  iconSize: [50, 50],
  iconAnchor: [25, 50],
  popupAnchor: [0, -50],
});

// --------------------------------------------------------------------
// 3. Auto‑center map component
// --------------------------------------------------------------------
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 14, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
};

// --------------------------------------------------------------------
// 4. Main HubMap Component
// --------------------------------------------------------------------
const HubMap = () => {
  // ---------- State ----------
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

  const hubLocation = { lat: 31.72, lng: 72.98 };
  const [riderPaths, setRiderPaths] = useState({});

  // ---------- Derived safe array for map markers ----------
  const usersWithLocation = filteredUsers.filter(
    (user) => user.location?.lat != null && user.location?.lng != null
  );

  // ---------- Fetch all user locations ----------
  const fetchAllLocations = useCallback(async () => {
    try {
      const [ridersRes, customersRes, wholesalersRes] = await Promise.all([
        api.get('/admin/riders/locations'),
        api.get('/admin/customers/locations'),
        api.get('/admin/wholesalers/locations'),
      ]);

      // Process riders
      const ridersData = (ridersRes.data || []).map(r => ({
        ...r,
        type: 'rider',
        location: r.currentLocation || null,
      }));

      // Process customers
      const customersData = (customersRes.data || []).map(c => ({
        ...c,
        type: 'customer',
        location: c.currentLocation || null,
        vehicle: { type: 'Customer' },
        status: 'customer',
      }));

      // Process wholesalers: use shopLocation if available, else currentLocation
const wholesalersData = (wholesalersRes.data || []).map(w => {
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

      // Paths only for riders (optional)
      const paths = {};
      allUsers.forEach(user => {
        if (user.path && user.path.length > 1) {
          paths[user._id] = user.path.map(p => [p.lat, p.lng]);
        }
      });
      setRiderPaths(paths);
    } catch (error) {
      console.error('Fetch locations error', error);
      toast.error('Could not load locations');
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- Initial load & auto‑refresh ----------
  useEffect(() => {
    fetchAllLocations();
  }, [fetchAllLocations]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchAllLocations, refreshInterval * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, refreshInterval, fetchAllLocations]);

  // ---------- Filtering ----------
  useEffect(() => {
    let filtered = [...users];

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(s) ||
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

  // ---------- Handlers ----------
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

  // ---------- Helpers ----------
  const statusBadge = (status, type) => {
    if (type === 'wholesaler') return <Badge bg="warning">Wholesaler</Badge>;
    if (type === 'customer') return <Badge bg="info">Customer</Badge>;
    const map = {
      online: { bg: 'success', text: 'Online' },
      offline: { bg: 'secondary', text: 'Offline' },
      busy: { bg: 'warning', text: 'Busy' },
      inactive: { bg: 'danger', text: 'Inactive' },
    };
    const s = map[status] || map.offline;
    return <Badge bg={s.bg}>{s.text}</Badge>;
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

  // ---------- Stats ----------
  const onlineCount = users.filter(r => r.status === 'online' && r.type === 'rider').length;
  const busyCount = users.filter(r => r.status === 'busy' && r.type === 'rider').length;
  const offlineCount = users.filter(r => r.status === 'offline' && r.type === 'rider').length;
  const customerCount = users.filter(u => u.type === 'customer').length;
  const wholesalerCount = users.filter(u => u.type === 'wholesaler').length;

  // ---------- Loading state ----------
  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
          <p className="mt-3 text-muted">Loading locations...</p>
        </div>
      </Container>
    );
  }

  // ---------- Render ----------
  return (
    <Container fluid className="p-0">
      {/* ----- Stats Bar ----- */}
      <Row className="g-3 mb-3 px-3">
        <Col md={2}>
          <Card className="border-0 shadow-sm" style={{ borderLeft: '4px solid #4CAF50' }}>
            <Card.Body className="py-2 px-3">
              <small className="text-muted">Online Riders</small>
              <h4 className="mb-0 fw-bold text-success">{onlineCount}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="border-0 shadow-sm" style={{ borderLeft: '4px solid #FF9800' }}>
            <Card.Body className="py-2 px-3">
              <small className="text-muted">Busy (Delivering)</small>
              <h4 className="mb-0 fw-bold text-warning">{busyCount}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="border-0 shadow-sm" style={{ borderLeft: '4px solid #9E9E9E' }}>
            <Card.Body className="py-2 px-3">
              <small className="text-muted">Offline Riders</small>
              <h4 className="mb-0 fw-bold text-secondary">{offlineCount}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="border-0 shadow-sm" style={{ borderLeft: '4px solid #2196F3' }}>
            <Card.Body className="py-2 px-3">
              <small className="text-muted">Customers</small>
              <h4 className="mb-0 fw-bold text-info">{customerCount}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="border-0 shadow-sm" style={{ borderLeft: '4px solid #FF9800' }}>
            <Card.Body className="py-2 px-3">
              <small className="text-muted">Wholesalers</small>
              <h4 className="mb-0 fw-bold text-warning">{wholesalerCount}</h4>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ----- Controls Bar ----- */}
      <Row className="mb-3 px-3">
        <Col md={4}>
          <InputGroup>
            <InputGroup.Text className="bg-white">🔍</InputGroup.Text>
            <Form.Control
              placeholder="Search name, email, store..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={3}>
          <Form.Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Users</option>
            <option value="online">🟢 Riders Online</option>
            <option value="busy">🟠 Riders Busy</option>
            <option value="offline">⚫ Riders Offline</option>
            <option value="customer">🛒 Customers</option>
            <option value="wholesaler">🏭 Wholesalers</option>
          </Form.Select>
        </Col>
        <Col md={3}>
          <div className="d-flex align-items-center gap-2">
            <Form.Check
              type="switch"
              label="Auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            {autoRefresh && (
              <Form.Select
                size="sm"
                style={{ width: '80px' }}
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
              >
                <option value="5">5s</option>
                <option value="10">10s</option>
                <option value="30">30s</option>
                <option value="60">60s</option>
              </Form.Select>
            )}
          </div>
        </Col>
        <Col md={2} className="text-end">
          <Button variant="outline-primary" onClick={fetchAllLocations}>
            🔄 Refresh
          </Button>
        </Col>
      </Row>

      {/* ----- Map & Sidebar ----- */}
      <Row className="px-3" style={{ height: 'calc(100vh - 280px)' }}>
        {/* Sidebar: User List */}
        <Col md={3}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-bottom">
              <strong>Users ({filteredUsers.length})</strong>
            </Card.Header>
            <Card.Body className="p-0 overflow-auto">
              <ListGroup variant="flush">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-4 text-muted">No users found</div>
                ) : (
                  filteredUsers.map((user) => (
                    <ListGroup.Item
                      key={user._id}
                      className={`cursor-pointer ${selectedUser?._id === user._id ? 'bg-light' : ''}`}
                      onClick={() => handleListItemClick(user)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className="fw-bold">{user.name}</div>
                          <small className="text-muted">
                            {user.type === 'wholesaler' ? user.storeName : user.vehicle?.plateNumber || 'N/A'}
                          </small>
                        </div>
                        {statusBadge(user.status, user.type)}
                      </div>
                      <div className="d-flex justify-content-between mt-1">
                        <small className="text-muted">
                          {user.type === 'wholesaler' ? '🏭' : '⭐'} {user.rating || 'N/A'}
                        </small>
                        <small className="text-muted">
                          📍 {user.lastLocationUpdate ? formatTime(user.lastLocationUpdate) : 'No data'}
                        </small>
                      </div>
                    </ListGroup.Item>
                  ))
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>

        {/* Map */}
        <Col md={9}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body className="p-0 position-relative">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                zoomControl={false}
              >
                <TileLayer
                  url="https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://wikimediafoundation.org/wiki/Maps_Terms_of_Use">Wikimedia</a> | Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                <ZoomControl position="topright" />
                <MapController center={mapCenter} zoom={mapZoom} />

                {/* Hub Marker */}
                <Marker position={[hubLocation.lat, hubLocation.lng]} icon={hubIcon}>
                  <Popup>
                    <strong>🏪 Groxo Hub</strong>
                    <br />
                    <small>Main Distribution Center – Chiniot</small>
                  </Popup>
                </Marker>

                {/* Hub Radius */}
                <Circle
                  center={[hubLocation.lat, hubLocation.lng]}
                  radius={2000}
                  pathOptions={{ color: '#2196F3', fillColor: '#2196F3', fillOpacity: 0.1 }}
                />

                {/* User Markers */}
                {usersWithLocation.map((user) => (
                  <React.Fragment key={user._id}>
                    <Marker
                      position={[user.location.lat, user.location.lng]}
                      icon={createRiderIcon(user.status, user.type)}
                      eventHandlers={{ click: () => handleMarkerClick(user) }}
                    >
                      <Popup>
                        <div style={{ minWidth: '200px' }}>
                          <strong>{user.name}</strong>
                          {user.type === 'wholesaler' ? (
                            <>
                              <br />
                              <small>
                                🏪 {user.storeName || 'Store'}
                                {user.shopLocation?.address ? <><br />📍 {user.shopLocation.address}</> : null}
                                <br />📱 {user.phone}
                                <br />📧 {user.email}
                              </small>
                            </>
                          ) : (
                            <>
                              <br />
                              <small>
                                🛵 {user.vehicle?.type || 'Vehicle'}
                                <br />📋 {user.vehicle?.plateNumber || 'N/A'}
                                <br />📱 {user.phone}
                                <br />⭐ {user.rating} | 📦 {user.totalDeliveries || 0} deliveries
                                <br />💰 ₹{user.earnings?.today || 0} today
                                <br />📍 Last update: {user.lastLocationUpdate
                                  ? new Date(user.lastLocationUpdate).toLocaleTimeString()
                                  : 'Never'}
                              </small>
                              <div className="mt-2">{statusBadge(user.status, user.type)}</div>
                            </>
                          )}
                        </div>
                      </Popup>
                    </Marker>

                    {/* Rider movement path (if available) */}
                    {user.type === 'rider' && riderPaths[user._id] && riderPaths[user._id].length > 1 && (
                      <Polyline
                        positions={riderPaths[user._id]}
                        pathOptions={{
                          color: user.status === 'online' ? '#4CAF50' : '#FF9800',
                          weight: 3,
                          opacity: 0.6,
                          dashArray: '8 4',
                        }}
                      />
                    )}
                  </React.Fragment>
                ))}
              </MapContainer>

              {/* Legend Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  left: '20px',
                  background: 'white',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  fontSize: '13px',
                }}
              >
                <div className="mb-1"><strong>Legend</strong></div>
                <div>🟢 Online Rider</div>
                <div>🟠 Busy Rider</div>
                <div>⚫ Offline Rider</div>
                <div>🔵 Customer</div>
                <div>🟠 Wholesaler (Shop)</div>
                <div>🏪 Hub Location</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ----- Detail Modal (adapted for any user type) ----- */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedUser?.type === 'wholesaler' ? '🏭' : selectedUser?.type === 'customer' ? '🛒' : '🛵'}{' '}
            {selectedUser?.name}
            <span className="ms-2">{selectedUser && statusBadge(selectedUser.status, selectedUser.type)}</span>
          </Modal.Title>
        </Modal.Header>
        {selectedUser && (
          <Modal.Body>
            {selectedUser.type === 'wholesaler' ? (
              <>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Store Name</Col>
                  <Col xs={7}>{selectedUser.storeName || '-'}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Email</Col>
                  <Col xs={7}>{selectedUser.email}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Phone</Col>
                  <Col xs={7}>{selectedUser.phone}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Business License</Col>
                  <Col xs={7}>{selectedUser.businessLicense || '-'}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Shop Address</Col>
                  <Col xs={7}>{selectedUser.shopLocation?.address || 'Not set'}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Shop Location</Col>
                  <Col xs={7}>
                    {selectedUser.location?.lat?.toFixed(4)}, {selectedUser.location?.lng?.toFixed(4)}
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Account Status</Col>
                  <Col xs={7}>
                    <Badge bg={selectedUser.isActive ? 'success' : 'danger'}>
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Col>
                </Row>
              </>
            ) : (
              // Rider / Customer fields
              <>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Email</Col>
                  <Col xs={7}>{selectedUser.email}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Phone</Col>
                  <Col xs={7}>{selectedUser.phone}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Vehicle</Col>
                  <Col xs={7}>
                    {selectedUser.vehicle?.type} ({selectedUser.vehicle?.plateNumber})
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Rating</Col>
                  <Col xs={7}>⭐ {selectedUser.rating} / 5.0</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Total Deliveries</Col>
                  <Col xs={7}>{selectedUser.totalDeliveries || 0}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Today's Earnings</Col>
                  <Col xs={7}>₹{selectedUser.earnings?.today || 0}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Last Active</Col>
                  <Col xs={7}>{formatTime(selectedUser.lastActive)}</Col>
                </Row>
                <Row className="mb-2">
                  <Col xs={5} className="text-muted">Account Status</Col>
                  <Col xs={7}>
                    <Badge bg={selectedUser.isActive ? 'success' : 'danger'}>
                      {selectedUser.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </Col>
                </Row>
                <Row>
                  <Col xs={5} className="text-muted">Current Location</Col>
                  <Col xs={7}>
                    {selectedUser.location?.lat?.toFixed(4)},{' '}
                    {selectedUser.location?.lng?.toFixed(4)}
                  </Col>
                </Row>
              </>
            )}
          </Modal.Body>
        )}
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUserModal(false)}>Close</Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowUserModal(false);
              if (selectedUser?.location?.lat) {
                setMapCenter([selectedUser.location.lat, selectedUser.location.lng]);
                setMapZoom(16);
              }
            }}
          >
            📍 Center on Map
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default HubMap;