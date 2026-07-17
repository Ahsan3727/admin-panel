import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';

const STATUS_PILL = { pending: 'accent', approved: 'primary', rejected: 'danger' };

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  const fetchProducts = async () => {
    try {
      const { data } = await api.get('/admin/products');
      setProducts(data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const grouped = products.reduce((acc, product) => {
    const cat = product.category || 'Uncategorised';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  const openImageModal = (product) => {
    setSelectedProduct(product);
    setNewImageFile(null);
    setNewImagePreview('');
    setShowImageModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setNewImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setNewImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleSaveImage = async () => {
    if (!selectedProduct || !newImageFile) { toast.error('Please select an image'); return; }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('productImage', newImageFile);
      await api.put(`/admin/products/${selectedProduct._id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: [(data) => data],
      });
      toast.success('Image updated');
      setShowImageModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update image');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="gx-empty"><div className="gx-glyph">🛍️</div><h4>Loading catalog…</h4></div>;
  }

  return (
    <>
      {Object.keys(grouped).length === 0 ? (
        <div className="gx-empty">
          <div className="gx-glyph">🛍️</div>
          <h4>No products yet</h4>
          <p>Approved products will show up here.</p>
        </div>
      ) : (
        Object.keys(grouped).map((category) => (
          <div key={category}>
            <div className="gx-section-title">{category}</div>
            <div className="gx-prod-grid">
              {grouped[category].map((p) => (
                <div className="gx-prod-card" key={p._id}>
                  <div className="gx-prod-img" style={p.image ? { backgroundImage: `url(${p.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
                    {!p.image && '🛍️'}
                    <button
                      className="gx-btn gx-btn-outline gx-btn-sm"
                      style={{ position: 'absolute', bottom: 6, right: 6, padding: '4px 8px' }}
                      onClick={(e) => { e.stopPropagation(); openImageModal(p); }}
                    >
                      🖼️
                    </button>
                  </div>
                  <div className="gx-prod-body">
                    <h5>{p.name}</h5>
                    <div className="gx-prod-price"><span>Wholesale</span><b>Rs.{p.price}</b></div>
                    <div className="gx-prod-price"><span>Retail</span><b>{p.retailPrice ? `Rs.${p.retailPrice}` : '—'}</b></div>
                    <div className="gx-prod-price"><span>Stock</span><b>{p.stock} {p.unit}</b></div>
                    <div style={{ marginTop: 8 }}>
                      <span className={`gx-pill gx-pill-${STATUS_PILL[p.isApproved ? 'approved' : p.status] || 'muted'}`}>
                        <span className="gx-pill-dot" />{p.isApproved ? 'approved' : p.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} capture="environment" />

      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title={`Edit image — ${selectedProduct?.name || ''}`}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowImageModal(false)}>Cancel</button>
            <button className="gx-btn gx-btn-primary" onClick={handleSaveImage} disabled={!newImageFile || saving}>
              {saving ? 'Uploading…' : 'Upload & save'}
            </button>
          </>
        }
      >
        <div style={{ width: 200, height: 200, margin: '0 auto', borderRadius: 16, background: 'var(--bg-sunk)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 70 }}>
          {newImagePreview ? (
            <img src={newImagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : selectedProduct?.image ? (
            <img src={selectedProduct.image} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : '🛍️'}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 18 }}>
          <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={triggerFileInput}>📁 Choose file</button>
          <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={triggerFileInput}>📷 Take photo</button>
        </div>
        <p className="gx-muted" style={{ textAlign: 'center', fontSize: '11.5px', marginTop: 10 }}>Supported formats: JPG, PNG, GIF (max 5MB)</p>
      </Modal>
    </>
  );
};

export default ProductCatalog;
