import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';

const ROLE_TABS = ['all', 'customer', 'rider', 'wholesaler'];
const ROLE_PILL = { customer: 'info', rider: 'primary', wholesaler: 'accent', admin: 'danger' };
const PAGE_SIZE = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;

const emptyForm = {
  name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'customer', isActive: true,
  address: { street: '', city: '', state: '', zip: '' },
  vehicle: { type: '', plateNumber: '', color: '' },
  storeName: '', businessLicense: '',
};

// Rough client-side strength hint — not a security boundary, just guidance.
// The server still enforces the real minimum (6 chars).
const passwordStrength = (pwd) => {
  if (!pwd) return null;
  if (pwd.length < 6) return { label: 'Too short', color: 'var(--danger)' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 2) return { label: 'Weak', color: 'var(--danger)' };
  if (score <= 3) return { label: 'Okay', color: '#8A5410' };
  return { label: 'Strong', color: 'var(--primary)' };
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef(null);

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [viewTarget, setViewTarget] = useState(null);
  const [viewSummary, setViewSummary] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async (pageArg, roleArg, searchArg) => {
    try {
      setLoading(true);
      const params = { page: pageArg, limit: PAGE_SIZE };
      if (roleArg !== 'all') params.role = roleArg;
      if (searchArg.trim()) params.search = searchArg.trim();
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.users || []);
      setPages(data.pages || 1);
      setTotal(data.total ?? (data.users || []).length);
    } catch (err) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(page, roleFilter, search); }, [page, roleFilter, fetchUsers]);

  const handleRoleFilter = (r) => { setRoleFilter(r); setPage(1); };

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchUsers(1, roleFilter, value);
    }, 400);
  };

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
      confirmPassword: '',
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
    if (!PHONE_RE.test(form.phone.trim())) { toast.error('Enter a valid phone number'); return; }
    if (form.email.trim() && !EMAIL_RE.test(form.email.trim())) { toast.error('Enter a valid email address'); return; }

    if (!editingUser) {
      if (!form.password.trim()) { toast.error('Password is required'); return; }
      if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
      if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    } else if (form.password && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const payload = { ...form };
      delete payload.confirmPassword;
      if (editingUser) {
        if (!payload.password) delete payload.password;
        await api.put(`/admin/users/${editingUser._id}`, payload);
        toast.success('User updated');
      } else {
        await api.post('/admin/users', payload);
        toast.success('User created');
      }
      setShowModal(false);
      fetchUsers(page, roleFilter, search);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    }
  };

  // ---------- Read-only view mode ----------
  const openView = async (user) => {
    setViewTarget(user);
    setViewSummary(null);
    setViewLoading(true);
    try {
      const { data } = await api.get(`/admin/users/${user._id}/summary`);
      setViewSummary(data);
    } catch (err) {
      toast.error('Failed to load profile summary');
    } finally {
      setViewLoading(false);
    }
  };

  // ---------- Delete (confirmation dialog instead of window.confirm) ----------
  const requestDelete = (user) => { setDeleteTarget(user); setDeleteError(''); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/admin/users/${deleteTarget._id}`);
      toast.success('User deleted');
      setDeleteTarget(null);
      fetchUsers(page, roleFilter, search);
    } catch (err) {
      // Surface the backend's actual reason (e.g. a wholesaler still has
      // products listed) instead of a generic "Delete failed".
      setDeleteError(err.response?.data?.message || 'Delete failed. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const strength = passwordStrength(form.password);

  return (
    <>
      <div className="gx-searchbar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.6" /><path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <input placeholder="Search name, email or phone…" value={search} onChange={(e) => handleSearchChange(e.target.value)} />
      </div>

      <div className="gx-chip-scroll">
        {ROLE_TABS.map((r) => (
          <div
            key={r}
            className={`gx-chip ${roleFilter === r ? 'active' : ''}`}
            onClick={() => handleRoleFilter(r)}
          >
            {r === 'all' ? 'All roles' : r.charAt(0).toUpperCase() + r.slice(1) + 's'}
          </div>
        ))}
      </div>

      <div className="gx-section-title">{loading ? 'Loading…' : `${total} people · page ${page} of ${pages}`}</div>

      {!loading && users.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">👥</div>
          <h4>No users found</h4>
          <p>Try a different role filter or search term.</p>
        </div>
      )}

      {users.map((u) => (
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
            <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={() => openView(u)}>View</button>
            <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={() => openEditModal(u)}>Edit</button>
            <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => requestDelete(u)}>Delete</button>
          </div>
        </div>
      ))}

      {!loading && pages > 1 && (
        <div className="gx-flex-between" style={{ marginTop: 14 }}>
          <button className="gx-btn gx-btn-outline gx-btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Prev</button>
          <span className="gx-muted" style={{ fontSize: 12 }}>Page {page} of {pages}</span>
          <button className="gx-btn gx-btn-outline gx-btn-sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      )}

      <button className="gx-fab-floating" onClick={openCreateModal} aria-label="Add user">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>

      {/* ---------- Create / Edit modal ---------- */}
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
            <input name="phone" value={form.phone} onChange={handleChange} placeholder="+92 300 1234567" />
          </div>
        </div>
        <div className="gx-field">
          <label>Password {editingUser ? '(leave blank to keep)' : '*'}</label>
          <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} />
          {strength && (
            <div style={{ fontSize: 11, marginTop: 4, color: strength.color, fontWeight: 700 }}>{strength.label}</div>
          )}
        </div>
        {(!editingUser || form.password) && (
          <div className="gx-field">
            <label>Confirm password {editingUser ? '' : '*'}</label>
            <input name="confirmPassword" type="password" placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} />
            {form.confirmPassword && form.confirmPassword !== form.password && (
              <div style={{ fontSize: 11, marginTop: 4, color: 'var(--danger)', fontWeight: 700 }}>Passwords don't match</div>
            )}
          </div>
        )}
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

      {/* ---------- Read-only view modal ---------- */}
      <Modal
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={viewTarget ? `${viewTarget.name}` : 'Profile'}
        footer={<button className="gx-btn gx-btn-outline gx-btn-block" onClick={() => setViewTarget(null)}>Close</button>}
      >
        {viewTarget && (
          <>
            <div className="gx-stack-meta gx-mt-0">
              <div>Role<b>{viewTarget.role}</b></div>
              <div>Status<b style={{ color: viewTarget.isActive ? 'var(--primary)' : 'var(--danger)' }}>{viewTarget.isActive ? 'Active' : 'Inactive'}</b></div>
              <div>Email<b>{viewTarget.email || '—'}</b></div>
              <div>Phone<b>{viewTarget.phone}</b></div>
            </div>

            <div className="gx-section-title">Activity</div>
            {viewLoading && <p className="gx-muted" style={{ fontSize: 13 }}>Loading…</p>}

            {!viewLoading && viewSummary && viewSummary.role === 'customer' && (
              <div className="gx-card gx-card-pad">
                <div className="gx-stack-meta gx-mt-0">
                  <div>Orders placed<b>{viewSummary.totalOrders}</b></div>
                  <div>Total spent<b>Rs. {viewSummary.totalSpent}</b></div>
                </div>
                {viewSummary.lastOrder ? (
                  <p style={{ fontSize: 12.5, marginTop: 10 }}>
                    Last order: {viewSummary.lastOrder.orderNumber || `#${viewSummary.lastOrder._id?.slice(-6)}`} · {viewSummary.lastOrder.status} · {new Date(viewSummary.lastOrder.createdAt).toLocaleDateString()}
                  </p>
                ) : <p className="gx-muted" style={{ fontSize: 12.5, marginTop: 10 }}>No orders yet.</p>}
              </div>
            )}

            {!viewLoading && viewSummary && viewSummary.role === 'rider' && (
              <div className="gx-card gx-card-pad">
                <div className="gx-stack-meta gx-mt-0">
                  <div>Deliveries completed<b>{viewSummary.totalDeliveries}</b></div>
                  <div>Active assignments<b>{viewSummary.activeAssignments}</b></div>
                </div>
                {viewSummary.lastDelivery ? (
                  <p style={{ fontSize: 12.5, marginTop: 10 }}>
                    Last delivery: {viewSummary.lastDelivery.orderNumber || `#${viewSummary.lastDelivery._id?.slice(-6)}`} · {new Date(viewSummary.lastDelivery.createdAt).toLocaleDateString()}
                  </p>
                ) : <p className="gx-muted" style={{ fontSize: 12.5, marginTop: 10 }}>No completed deliveries yet.</p>}
              </div>
            )}

            {!viewLoading && viewSummary && viewSummary.role === 'wholesaler' && (
              <div className="gx-card gx-card-pad">
                <div className="gx-stack-meta gx-mt-0">
                  <div>Total products<b>{viewSummary.totalProducts}</b></div>
                  <div>Approved<b>{viewSummary.approvedProducts}</b></div>
                  <div>Pending<b>{viewSummary.pendingProducts}</b></div>
                </div>
              </div>
            )}

            {!viewLoading && viewSummary && viewSummary.role === 'admin' && (
              <p className="gx-muted" style={{ fontSize: 12.5 }}>No activity stats tracked for admin accounts.</p>
            )}
          </>
        )}
      </Modal>

      {/* ---------- Delete confirmation ---------- */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete user"
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button className="gx-btn gx-btn-danger-outline" onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </button>
          </>
        }
      >
        {deleteTarget && (
          <>
            <p style={{ fontSize: 13.5, marginTop: 0 }}>
              This will permanently delete <b>{deleteTarget.name}</b> ({deleteTarget.role}). This can't be undone.
            </p>
            {deleteError && (
              <div className="gx-card gx-card-pad" style={{ background: 'var(--danger-tint)', color: 'var(--danger)', fontSize: 12.8, marginTop: 10 }}>
                {deleteError}
              </div>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default UserManagement;
