import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';
import ProductCatalog from './ProductCatalog';

const STATUS_PILL = { pending: 'accent', approved: 'primary', rejected: 'danger' };

const ProductApprovals = () => {
  const [activeTab, setActiveTab] = useState('approvals'); // 'approvals' | 'catalog'

  // Product approvals
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adminPrice, setAdminPrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');

  // Category management
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');

  useEffect(() => {
    fetchPendingProducts();
    fetchCategories();
  }, []);

  const fetchPendingProducts = async () => {
    try {
      const { data } = await api.get('/admin/products/pending');
      setProducts(data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPriceModal = (product) => {
    setSelectedProduct(product);
    setAdminPrice(product.adminPrice || product.wholesalerPrice || '');
    setRetailPrice(product.retailPrice || '');
    setShowPriceModal(true);
  };

  const handleOpenDetailModal = (product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleApprove = async () => {
    if (!selectedProduct) return;
    try {
      await api.put(`/admin/products/${selectedProduct._id}`, {
        status: 'approved',
        adminPrice: Number(adminPrice),
        retailPrice: Number(retailPrice) || 0,
      });
      toast.success('Product approved!');
      setShowPriceModal(false);
      fetchPendingProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  const handleReject = async (productId) => {
    try {
      await api.put(`/admin/products/${productId}`, { status: 'rejected' });
      toast.success('Product rejected');
      fetchPendingProducts();
    } catch (err) {
      toast.error('Rejection failed');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories/admin');
      setCategories(data.categories || []);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) { toast.error('Category name required'); return; }
    try {
      const { data } = await api.post('/categories/admin', { name: newCategoryName.trim() });
      setCategories([...categories, data.category]);
      setNewCategoryName('');
      toast.success('Category created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Delete this category? It will no longer be available to wholesalers.')) return;
    try {
      await api.delete(`/categories/admin/${categoryId}`);
      setCategories(categories.filter((cat) => cat._id !== categoryId));
      toast.success('Category deleted');
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  return (
    <>
      <div className="gx-segmented">
        <button className={activeTab === 'approvals' ? 'active' : ''} onClick={() => setActiveTab('approvals')}>Approvals</button>
        <button className={activeTab === 'catalog' ? 'active' : ''} onClick={() => setActiveTab('catalog')}>Catalog</button>
      </div>

      {activeTab === 'catalog' ? (
        <ProductCatalog />
      ) : (
        <>
          <div className="gx-section-title">
            Pending &amp; reviewed
          </div>

          {(loading || categoriesLoading) && (
            <div className="gx-empty"><div className="gx-glyph">🛍️</div><h4>Loading…</h4></div>
          )}

          {!loading && products.length === 0 && (
            <div className="gx-empty">
              <div className="gx-glyph">✅</div>
              <h4>No pending products</h4>
              <p>New wholesaler submissions will show up here.</p>
            </div>
          )}

          {products.map((p) => (
            <div className="gx-stack-card" key={p._id}>
              <div className="gx-stack-head">
                <div style={{ display: 'flex', gap: 11, alignItems: 'center', minWidth: 0 }}>
                  <div className="gx-row-avatar" style={{ background: 'var(--bg-sunk)', overflow: 'hidden' }}>
                    {p.image ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🛍️'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h4>{p.name}</h4>
                    <div className="gx-row-sub">{p.wholesaler?.storeName || p.wholesaler?.name || 'N/A'}</div>
                  </div>
                </div>
                <span className={`gx-pill gx-pill-${STATUS_PILL[p.status] || 'muted'}`}>
                  <span className="gx-pill-dot" />{p.status}
                </span>
              </div>
              <div className="gx-stack-meta">
                <div>Wholesaler price<b>Rs. {p.wholesalerPrice || p.price || 0}</b></div>
                <div>Admin price<b>{p.adminPrice ? `Rs. ${p.adminPrice}` : '—'}</b></div>
                <div>Retail price<b>{p.retailPrice ? `Rs. ${p.retailPrice}` : '—'}</b></div>
              </div>
              <div className="gx-stack-actions">
                <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={() => handleOpenDetailModal(p)}>Details</button>
                {p.status === 'pending' && (
                  <>
                    <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={() => handleOpenPriceModal(p)}>Approve &amp; set price</button>
                    <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => handleReject(p._id)}>Reject</button>
                  </>
                )}
                {p.status === 'rejected' && (
                  <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={() => handleOpenPriceModal(p)}>Reconsider</button>
                )}
              </div>
            </div>
          ))}

          <div className="gx-section-title">Global categories</div>
          <div className="gx-card gx-card-pad">
            <div className="gx-field-row gx-mt-0">
              <div className="gx-field gx-mt-0">
                <input placeholder="New category name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} />
              </div>
              <button className="gx-btn gx-btn-primary" onClick={handleCreateCategory}>Add</button>
            </div>
            <div style={{ marginTop: 12 }}>
              {categories.length === 0 ? (
                <p className="gx-muted" style={{ textAlign: 'center', fontSize: 13 }}>No categories yet</p>
              ) : (
                categories.map((c) => (
                  <div className="gx-row-item" key={c._id}>
                    <div className="gx-row-body gx-row-title">{c.name}</div>
                    <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => handleDeleteCategory(c._id)}>Delete</button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        title={`Set final price — ${selectedProduct?.name || ''}`}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowPriceModal(false)}>Cancel</button>
            <button className="gx-btn gx-btn-primary" onClick={handleApprove}>Approve</button>
          </>
        }
      >
        <div className="gx-field gx-mt-0">
          <label>Wholesaler price: Rs. {selectedProduct?.wholesalerPrice || selectedProduct?.price}</label>
          <input type="number" placeholder="Admin selling price" value={adminPrice} onChange={(e) => setAdminPrice(e.target.value)} />
        </div>
        <div className="gx-field">
          <label>Retail price (optional)</label>
          <input type="number" placeholder="Suggested retail price" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} />
        </div>
      </Modal>

      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Product details"
        footer={<button className="gx-btn gx-btn-outline gx-btn-block" onClick={() => setShowDetailModal(false)}>Close</button>}
      >
        {selectedProduct && (
          <>
            {selectedProduct.image && (
              <div style={{ textAlign: 'center', marginBottom: 10 }}>
                <img src={selectedProduct.image} alt={selectedProduct.name} style={{ maxWidth: 200, maxHeight: 200, borderRadius: 16 }} />
              </div>
            )}
            <h3 style={{ textAlign: 'center', margin: '0 0 14px' }}>{selectedProduct.name}</h3>
            <div className="gx-stack-meta gx-mt-0">
              <div>Wholesaler<b>{selectedProduct.wholesaler?.storeName || selectedProduct.wholesaler?.name || 'N/A'}</b></div>
              <div>Category<b>{selectedProduct.category}</b></div>
              <div>Unit<b>{selectedProduct.unit || 'N/A'}</b></div>
              <div>Stock<b>{selectedProduct.stock || 0}</b></div>
              <div>Wholesaler price<b>Rs. {selectedProduct.wholesalerPrice || selectedProduct.price || 0}</b></div>
              <div>Admin price<b>{selectedProduct.adminPrice ? `Rs. ${selectedProduct.adminPrice}` : 'Not set'}</b></div>
              <div>Retail price<b>{selectedProduct.retailPrice ? `Rs. ${selectedProduct.retailPrice}` : 'Not set'}</b></div>
              <div>Status<b>{selectedProduct.status}</b></div>
            </div>
            <div className="gx-section-title">Description</div>
            <p className="gx-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedProduct.description || 'No description provided'}</p>
          </>
        )}
      </Modal>
    </>
  );
};

export default ProductApprovals;
