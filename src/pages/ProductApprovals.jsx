import React, { useState, useEffect, useRef } from 'react';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adminPrice, setAdminPrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');

  // Bulk selection — only pending products are selectable
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Reject flow (single or bulk) — always asks for an optional reason
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null); // productId | 'bulk' | null
  const [rejectReason, setRejectReason] = useState('');

  // Category management
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  useEffect(() => {
    fetchPendingProducts(1, false);
    fetchCategories();
  }, []);

  const fetchPendingProducts = async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const { data } = await api.get('/admin/products/pending', {
        params: { page: targetPage, limit: 50 },
      });
      setProducts((prev) => (append ? [...prev, ...data.products] : data.products));
      setPage(data.page);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loadingMore) fetchPendingProducts(page + 1, true);
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
      fetchPendingProducts(1, false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed');
    }
  };

  // ---------- Reject (single or bulk) ----------
  const openRejectModal = (target) => {
    setRejectTarget(target); // a product id, or 'bulk'
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async () => {
    try {
      if (rejectTarget === 'bulk') {
        const ids = Array.from(selectedIds);
        await api.put('/admin/products/bulk', { ids, action: 'reject', rejectionReason: rejectReason.trim() });
        toast.success(`${ids.length} product(s) rejected`);
        setSelectedIds(new Set());
      } else {
        await api.put(`/admin/products/${rejectTarget}`, { status: 'rejected', rejectionReason: rejectReason.trim() });
        toast.success('Product rejected');
      }
      setShowRejectModal(false);
      fetchPendingProducts(1, false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed');
    }
  };

  // ---------- Bulk selection ----------
  const pendingIds = products.filter((p) => p.status === 'pending').map((p) => p._id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selectedIds.has(id));

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    setSelectedIds((prev) => {
      if (allPendingSelected) return new Set();
      return new Set(pendingIds);
    });
  };

  const handleBulkApprove = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(
      `Approve ${ids.length} product(s)? Each will use its existing admin price, or fall back to the wholesaler's submitted price if none was set yet.`
    )) return;
    setBulkProcessing(true);
    try {
      const { data } = await api.put('/admin/products/bulk', { ids, action: 'approve' });
      toast.success(data.message || `${ids.length} product(s) approved`);
      setSelectedIds(new Set());
      fetchPendingProducts(1, false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk approval failed');
    } finally {
      setBulkProcessing(false);
    }
  };

  // ---------- Categories ----------
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
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const startRenameCategory = (category) => {
    setEditingCategoryId(category._id);
    setEditingCategoryName(category.name);
  };

  const cancelRenameCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleRenameCategory = async (categoryId) => {
    if (!editingCategoryName.trim()) { toast.error('Category name required'); return; }
    try {
      const { data } = await api.put(`/categories/admin/${categoryId}`, { name: editingCategoryName.trim() });
      setCategories(categories.map((c) => (c._id === categoryId ? data.category : c)));
      toast.success('Category renamed');
      cancelRenameCategory();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rename failed');
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

          {!loading && pendingIds.length > 0 && (
            <div className="gx-card gx-card-pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
                <input type="checkbox" checked={allPendingSelected} onChange={toggleSelectAllPending} />
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all ${pendingIds.length} pending`}
              </label>
              {selectedIds.size > 0 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={handleBulkApprove} disabled={bulkProcessing}>
                    {bulkProcessing ? 'Working…' : `Approve ${selectedIds.size}`}
                  </button>
                  <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => openRejectModal('bulk')} disabled={bulkProcessing}>
                    Reject {selectedIds.size}
                  </button>
                </div>
              )}
            </div>
          )}

          {products.map((p) => (
            <div className="gx-stack-card" key={p._id}>
              <div className="gx-stack-head">
                <div style={{ display: 'flex', gap: 11, alignItems: 'center', minWidth: 0 }}>
                  {p.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p._id)}
                      onChange={() => toggleSelect(p._id)}
                      style={{ flexShrink: 0 }}
                    />
                  )}
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
              {p.status === 'rejected' && p.rejectionReason && (
                <div className="gx-muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                  Reason: {p.rejectionReason}
                </div>
              )}
              <div className="gx-stack-actions">
                <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={() => handleOpenDetailModal(p)}>Details</button>
                {p.status === 'pending' && (
                  <>
                    <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={() => handleOpenPriceModal(p)}>Approve &amp; set price</button>
                    <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => openRejectModal(p._id)}>Reject</button>
                  </>
                )}
                {p.status === 'rejected' && (
                  <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={() => handleOpenPriceModal(p)}>Reconsider</button>
                )}
              </div>
            </div>
          ))}

          {!loading && page < totalPages && (
            <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
              <button className="gx-btn gx-btn-outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load more (${total - products.length} remaining)`}
              </button>
            </div>
          )}

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
                    {editingCategoryId === c._id ? (
                      <>
                        <input
                          className="gx-row-body"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          autoFocus
                        />
                        <button className="gx-btn gx-btn-primary gx-btn-sm" onClick={() => handleRenameCategory(c._id)}>Save</button>
                        <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={cancelRenameCategory}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <div className="gx-row-body gx-row-title">{c.name}</div>
                        <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={() => startRenameCategory(c)}>Rename</button>
                        <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => handleDeleteCategory(c._id)}>Delete</button>
                      </>
                    )}
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
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={rejectTarget === 'bulk' ? `Reject ${selectedIds.size} product(s)` : 'Reject product'}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowRejectModal(false)}>Cancel</button>
            <button className="gx-btn gx-btn-danger-outline" onClick={handleConfirmReject}>Reject</button>
          </>
        }
      >
        <div className="gx-field gx-mt-0">
          <label>Reason (optional — shown to the wholesaler)</label>
          <textarea
            placeholder="e.g. photo doesn't match description, pricing too high for this category…"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
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
            {selectedProduct.status === 'rejected' && selectedProduct.rejectionReason && (
              <>
                <div className="gx-section-title">Rejection reason</div>
                <p className="gx-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedProduct.rejectionReason}</p>
              </>
            )}
            <div className="gx-section-title">Description</div>
            <p className="gx-muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedProduct.description || 'No description provided'}</p>
          </>
        )}
      </Modal>
    </>
  );
};

export default ProductApprovals;