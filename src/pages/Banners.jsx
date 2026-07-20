import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import { compressImage } from '../utils/compressImage';

const emptyForm = { imageUrl: '', link: '', isActive: true, order: 0, startDate: '', endDate: '' };

// Date <-> yyyy-mm-dd helpers for the <input type="date"> fields.
const toDateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState('');
  const fileInputRef = useRef(null);
  const dragIndexRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

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
    setLocalPreview('');
    if (banner) {
      setEditingBanner(banner);
      setForm({
        imageUrl: banner.imageUrl,
        link: banner.link || '',
        isActive: banner.isActive,
        order: banner.order,
        startDate: toDateInput(banner.startDate),
        endDate: toDateInput(banner.endDate),
      });
    } else {
      setEditingBanner(null);
      setForm(emptyForm);
    }
    setShowModal(true);
  };

  // ---------- Image upload (reuses the same Cloudinary flow products use) ----------
  const triggerFileInput = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const rawFile = e.target.files[0];
    if (!rawFile) return;
    const file = await compressImage(rawFile);

    const reader = new FileReader();
    reader.onloadend = () => setLocalPreview(reader.result);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('bannerImage', file);
      const { data } = await api.post('/admin/banners/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: [(d) => d],
      });
      setForm((prev) => ({ ...prev, imageUrl: data.image }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
      setLocalPreview('');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.imageUrl.trim()) { toast.error('An image is required — upload one or paste a URL'); return; }
    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      toast.error('Start date must be before end date');
      return;
    }
    try {
      const payload = {
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      if (editingBanner) {
        await api.put(`/admin/banners/${editingBanner._id}`, payload);
        toast.success('Banner updated');
      } else {
        await api.post('/admin/banners', payload);
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

  // ---------- Drag-and-drop reordering ----------
  const handleDragStart = (index) => { dragIndexRef.current = index; };

  const handleDragOver = (e, banner) => {
    e.preventDefault();
    setDragOverId(banner._id);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    setDragOverId(null);
    const dragIndex = dragIndexRef.current;
    dragIndexRef.current = null;
    if (dragIndex === null || dragIndex === dropIndex) return;

    const reordered = [...banners];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    setBanners(reordered); // optimistic

    setSavingOrder(true);
    try {
      await api.put('/admin/banners/reorder', { order: reordered.map((b) => b._id) });
    } catch (err) {
      toast.error('Failed to save new order');
      fetchBanners(); // revert to server truth
    } finally {
      setSavingOrder(false);
    }
  };

  const isScheduled = (b) => b.startDate || b.endDate;
  const scheduleLabel = (b) => {
    const start = b.startDate ? new Date(b.startDate).toLocaleDateString() : '—';
    const end = b.endDate ? new Date(b.endDate).toLocaleDateString() : '—';
    return `${start} → ${end}`;
  };

  return (
    <>
      <div className="gx-flex-between gx-mt-0">
        <div className="gx-section-title gx-mt-0">{loading ? 'Loading…' : `${banners.length} banners`}</div>
        {savingOrder && <span className="gx-muted" style={{ fontSize: 11.5 }}>Saving order…</span>}
      </div>

      {!loading && banners.length > 1 && (
        <p className="gx-muted" style={{ fontSize: 11.5, marginTop: -6, marginBottom: 10 }}>
          Drag a card to reorder how banners appear in the app.
        </p>
      )}

      {!loading && banners.length === 0 && (
        <div className="gx-empty">
          <div className="gx-glyph">📢</div>
          <h4>No banners yet</h4>
          <p>Tap + to add your first promo banner.</p>
        </div>
      )}

      {banners.map((b, index) => (
        <div
          className="gx-stack-card"
          key={b._id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, b)}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={() => setDragOverId(null)}
          style={{ cursor: 'grab', outline: dragOverId === b._id ? '2px dashed var(--primary)' : 'none' }}
        >
          <div className="gx-stack-head">
            <div style={{ display: 'flex', gap: 11, alignItems: 'center', minWidth: 0 }}>
              <span className="gx-muted" style={{ fontSize: 15 }} title="Drag to reorder">⠿</span>
              <div className="gx-row-avatar" style={{ background: 'var(--bg-sunk)', overflow: 'hidden' }}>
                {b.imageUrl ? <img src={b.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📢'}
              </div>
              <div style={{ minWidth: 0 }}>
                <h4 style={{ whiteSpace: 'normal' }}>{b.link || 'No link set'}</h4>
              </div>
            </div>
            <span className={`gx-pill gx-pill-${b.isActive ? 'primary' : 'muted'}`}><span className="gx-pill-dot" />{b.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div className="gx-stack-meta">
            <div>Order<b>{b.order}</b></div>
            {isScheduled(b) && <div>Scheduled<b>{scheduleLabel(b)}</b></div>}
          </div>
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
            <button className="gx-btn gx-btn-primary" onClick={handleSave} disabled={uploading}>{editingBanner ? 'Update' : 'Create'}</button>
          </>
        }
      >
        <div className="gx-field gx-mt-0">
          <label>Image</label>
          <div
            style={{
              height: 140, borderRadius: 12, background: 'var(--bg-sunk)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8,
            }}
          >
            {(localPreview || form.imageUrl) ? (
              <img
                src={localPreview || form.imageUrl}
                alt="Preview"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <span className="gx-muted" style={{ fontSize: 12 }}>No image yet</span>
            )}
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
          <button type="button" className="gx-btn gx-btn-outline gx-btn-sm gx-btn-block" onClick={triggerFileInput} disabled={uploading}>
            {uploading ? 'Uploading…' : '⬆ Upload image'}
          </button>
        </div>
        <div className="gx-field">
          <label>Or paste an image URL</label>
          <input
            value={form.imageUrl}
            onChange={(e) => { setLocalPreview(''); setForm({ ...form, imageUrl: e.target.value }); }}
            placeholder="https://…"
          />
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
        <div className="gx-section-title">Schedule (optional)</div>
        <p className="gx-muted" style={{ fontSize: 11.5, marginTop: -4 }}>
          Leave blank to run indefinitely while Active is on. Set both to auto-start/expire.
        </p>
        <div className="gx-field-row">
          <div className="gx-field gx-mt-0">
            <label>Start date</label>
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </div>
          <div className="gx-field gx-mt-0">
            <label>End date</label>
            <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
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
