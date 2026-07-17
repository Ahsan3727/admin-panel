import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';

const ROLE_TABS = ['all', 'customer', 'rider', 'wholesaler'];
const ROLE_PILL = { customer: 'info', rider: 'primary', wholesaler: 'accent', admin: 'danger' };

const emptyForm = {
  name: '', email: '', phone: '', password: '', role: 'customer', isActive: true,
  address: { street: '', city: '', state: '', zip: '' },
  vehicle: { type: '', plateNumber: '', color: '' },
  storeName: '', businessLicense: '',
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = roleFilter !== 'all' ? { role: roleFilter } : {};
      const { data } = await api.get('/admin/users', { params });
      setUsers(data);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const visibleUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const s = search.trim().toLowerCase();
    return (
      u.name?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.phone?.toLowerCase().includes(s)
    );
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('address.')) {
      const field = name.split('.')[1];
      setForm((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));
    } else if (name.startsWith('vehicle.')) {
      const field = name.split('.')[1];
      setForm((prev) => ({ ...prev, vehicle: { ...prev.vehicle, [field]: value } }));
    } else if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: user.role || 'customer',
      isActive: user.isActive !== undefined ? user.isActive : true,
      address: user.address || { street: '', city: '', state: '', zip: '' },
      vehicle: user.vehicle || { type: '', plateNumber: '', color: '' },
      storeName: user.storeName || '',
      businessLicense: user.businessLicense || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.phone.trim()) { toast.error('Phone is required'); return; }
    if (!editingUser && !form.password.trim()) { toast.error('Password is required'); return; }
    try {
      const payload = { ...form };
      if (editingUser) {
        if (!payload.password) delete payload.password;
        await api.put(`/admin/users/${editingUser._id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/admin/users', payload);
        toast.success('User created');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      fetchUsers();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <>
      <div className="gx-searchbar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.6" /><path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <input placeholder="Search name, email or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="gx-chip-scroll">
        {ROLE_TABS.map((r) => (
          <div
            key={r}
            className={`gx-chip ${roleFilter === r ? 'active' : ''}`}
            onClick={() => setRoleFilter(r)}
          >
            {r === 'all' ? 'All roles' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
          </div>
        ))}
      </div>

      <div className="gx-section-title">{loading ? 'Loading…' : `${visibleUsers.length} people`}</div>

      {!loading && visibleUsers.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">👥</div>
          <h4>No users found</h4>
          <p>Try a different role filter or search term.</p>
        </div>
      )}

      {visibleUsers.map((u) => (
        <div className="gx-stack-card" key={u._id}>
          <div className="gx-stack-head">
            <div style={{ display: 'flex', gap: 11, alignItems: 'center', minWidth: 0 }}>
              <div className="gx-row-avatar" style={{ background: 'var(--bg-sunk)', color: 'var(--ink)' }}>
                {u.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div style={{ minWidth: 0 }}>
                <h4 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</h4>
                <div className="gx-row-sub">{u.email}</div>
              </div>
            </div>
            <span className={`gx-pill gx-pill-${ROLE_PILL[u.role] || 'muted'}`}>
              <span className="gx-pill-dot" />{u.role}
            </span>
          </div>
          <div className="gx-stack-meta">
            <div>Phone<b>{u.phone}</b></div>
            <div>Status<b style={{ color: u.isActive ? 'var(--primary)' : 'var(--danger)' }}>{u.isActive ? 'Active' : 'Inactive'}</b></div>
          </div>
          <div className="gx-stack-actions">
            <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={() => openEditModal(u)}>Edit</button>
            <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => handleDelete(u._id)}>Delete</button>
          </div>
        </div>
      ))}

      <button className="gx-fab-floating" onClick={openCreateModal} aria-label="Add user">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit user' : 'Add new user'}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="gx-btn gx-btn-primary" onClick={handleSubmit}>{editingUser ? 'Save changes' : 'Create user'}</button>
          </>
        }
      >
        <div className="gx-field gx-mt-0">
          <label>Name *</label>
          <input name="name" value={form.name} onChange={handleChange} />
        </div>
        <div className="gx-field-row">
          <div className="gx-field">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="gx-field">
            <label>Phone *</label>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </div>
        </div>
        <div className="gx-field">
          <label>Password {editingUser ? '(leave blank to keep)' : '*'}</label>
          <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} />
        </div>
        <div className="gx-field">
          <label>Role</label>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="customer">Customer</option>
            <option value="rider">Rider</option>
            <option value="wholesaler">Wholesaler</option>
          </select>
        </div>
        <div className="gx-switch-row">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Active</span>
          <label className="gx-switch">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={handleChange} />
            <span className="gx-slider" />
          </label>
        </div>

        {form.role === 'customer' && (
          <>
            <div className="gx-section-title">Customer address</div>
            <div className="gx-field-row">
              <div className="gx-field gx-mt-0"><label>Street</label><input name="address.street" value={form.address.street} onChange={handleChange} /></div>
              <div className="gx-field gx-mt-0"><label>City</label><input name="address.city" value={form.address.city} onChange={handleChange} /></div>
            </div>
            <div className="gx-field-row">
              <div className="gx-field"><label>State</label><input name="address.state" value={form.address.state} onChange={handleChange} /></div>
              <div className="gx-field"><label>ZIP</label><input name="address.zip" value={form.address.zip} onChange={handleChange} /></div>
            </div>
          </>
        )}

        {form.role === 'rider' && (
          <>
            <div className="gx-section-title">Vehicle details</div>
            <div className="gx-field-row">
              <div className="gx-field gx-mt-0"><label>Type</label><input name="vehicle.type" value={form.vehicle.type} onChange={handleChange} /></div>
              <div className="gx-field gx-mt-0"><label>Plate no.</label><input name="vehicle.plateNumber" value={form.vehicle.plateNumber} onChange={handleChange} /></div>
            </div>
            <div className="gx-field"><label>Color</label><input name="vehicle.color" value={form.vehicle.color} onChange={handleChange} /></div>
          </>
        )}

        {form.role === 'wholesaler' && (
          <>
            <div className="gx-section-title">Business details</div>
            <div className="gx-field-row">
              <div className="gx-field gx-mt-0"><label>Store name</label><input name="storeName" value={form.storeName} onChange={handleChange} /></div>
              <div className="gx-field gx-mt-0"><label>Licence #</label><input name="businessLicense" value={form.businessLicense} onChange={handleChange} /></div>
            </div>
          </>
        )}
      </Modal>
    </>
  );
};

export default UserManagement;
