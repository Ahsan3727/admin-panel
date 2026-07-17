import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';

const emptyForm = { imageUrl: '', link: '', isActive: true, order: 0 };

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchBanners = async () => {
    try {
      const { data } = await api.get('/admin/banners');
      setBanners(data);
    } catch (err) {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleOpenModal = (banner = null) => {
    if (banner) {
      setEditingBanner(banner);
      setForm({ imageUrl: banner.imageUrl, link: banner.link || '', isActive: banner.isActive, order: banner.order });
    } else {
      setEditingBanner(null);
      setForm(emptyForm);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.imageUrl.trim()) { toast.error('Image URL is required'); return; }
    try {
      if (editingBanner) {
        await api.put(`/admin/banners/${editingBanner._id}`, form);
        toast.success('Banner updated');
      } else {
        await api.post('/admin/banners', form);
        toast.success('Banner created');
      }
      setShowModal(false);
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await api.delete(`/admin/banners/${id}`);
      toast.success('Banner deleted');
      fetchBanners();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  return (
    <>
      <div className="gx-section-title gx-mt-0">{loading ? 'Loading…' : `${banners.length} banners`}</div>

      {!loading && banners.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">📢</div>
          <h4>No banners yet</h4>
          <p>Tap + to add your first promo banner.</p>
        </div>
      )}

      {banners.map((b) => (
        <div className="gx-stack-card" key={b._id}>
          <div className="gx-stack-head">
            <div style={{ display: 'flex', gap: 11, alignItems: 'center', minWidth: 0 }}>
              <div className="gx-row-avatar" style={{ background: 'var(--bg-sunk)', overflow: 'hidden' }}>
                {b.imageUrl ? <img src={b.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📢'}
              </div>
              <div style={{ minWidth: 0 }}>
                <h4 style={{ whiteSpace: 'normal' }}>{b.link || 'No link set'}</h4>
              </div>
            </div>
            <span className={`gx-pill gx-pill-${b.isActive ? 'primary' : 'muted'}`}><span className="gx-pill-dot" />{b.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="gx-stack-meta"><div>Order<b>{b.order}</b></div></div>
          <div className="gx-stack-actions">
            <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={() => handleOpenModal(b)}>Edit</button>
            <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => handleDelete(b._id)}>Delete</button>
          </div>
        </div>
      ))}

      <button className="gx-fab-floating" onClick={() => handleOpenModal()} aria-label="Add banner">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 4v14M4 11h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingBanner ? 'Edit banner' : 'Add banner'}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="gx-btn gx-btn-primary" onClick={handleSave}>{editingBanner ? 'Update' : 'Create'}</button>
          </>
        }
      >
        <div className="gx-field gx-mt-0">
          <label>Image URL *</label>
          <input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
        </div>
        <div className="gx-field">
          <label>Link (optional)</label>
          <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/promo/…" />
        </div>
        <div className="gx-field-row">
          <div className="gx-field">
            <label>Order</label>
            <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 0 })} />
          </div>
        </div>
        <div className="gx-switch-row">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Active</span>
          <label className="gx-switch">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            <span className="gx-slider" />
          </label>
        </div>
      </Modal>
    </>
  );
};

export default Banners;
