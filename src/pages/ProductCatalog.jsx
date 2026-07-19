import React, { useState, useEffect, useRef, useMemo } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import Modal from '../components/Modal';

const STATUS_PILL = { pending: 'accent', approved: 'primary', rejected: 'danger' };
const UNITS = ['piece', 'kg', 'liter', 'pack', 'box', 'dozen', 'other'];

const emptyEditForm = {
  name: '',
  description: '',
  category: '',
  unit: 'piece',
  weight: '',
  price: '',
  adminPrice: '',
  retailPrice: '',
  stock: '',
  lowStockThreshold: '',
  isActive: true,
  status: 'pending',
};

const ProductCatalog = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [categories, setCategories] = useState([]);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Server-side pagination — `products` accumulates as more pages load.
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const searchDebounceRef = useRef(null);

  // CSV import/export
  const csvInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Image modal
  const [showImageModal, setShowImageModal] = useState(false);
  const [newImageFile, setNewImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [savingImage, setSavingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Edit (all-data) modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchProducts = async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const { data } = await api.get('/admin/products', {
        params: {
          page: targetPage,
          limit: 50,
          search: search.trim() || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
        },
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
    if (page < totalPages && !loadingMore) fetchProducts(page + 1, true);
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories/admin');
      setCategories(data.categories || []);
    } catch (err) {
      // Non-fatal — category select just falls back to whatever products already carry
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  // Refetch from page 1 whenever the search term or category filter changes,
  // debounced so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchProducts(1, false);
    }, 350);
    return () => clearTimeout(searchDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter]);

  // Merge global categories with any category already used on a product,
  // so nothing already saved on a product ever "disappears" from the dropdown.
  const categoryOptions = useMemo(() => {
    const names = new Set(categories.map((c) => c.name));
    products.forEach((p) => { if (p.category) names.add(p.category); });
    return Array.from(names).sort();
  }, [categories, products]);

  const grouped = products.reduce((acc, product) => {
    const cat = product.category || 'Uncategorised';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {});

  // ---------- Image modal ----------
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
    setSavingImage(true);
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
      setSavingImage(false);
    }
  };

  // ---------- Edit (all-data) modal ----------
  const openEditModal = (product) => {
    setSelectedProduct(product);
    setEditForm({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      unit: product.unit || 'piece',
      weight: product.weight ?? '',
      price: product.price ?? product.wholesalerPrice ?? '',
      adminPrice: product.adminPrice ?? '',
      retailPrice: product.retailPrice ?? '',
      stock: product.stock ?? '',
      lowStockThreshold: product.lowStockThreshold ?? '',
      isActive: product.isActive !== undefined ? product.isActive : true,
      status: product.status || (product.isApproved ? 'approved' : 'pending'),
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSaveEdit = async () => {
    if (!selectedProduct) return;
    if (!editForm.name.trim()) { toast.error('Product name is required'); return; }
    if (!editForm.category.trim()) { toast.error('Category is required'); return; }
    if (editForm.price === '' || Number(editForm.price) < 0) { toast.error('Enter a valid price'); return; }

    setSavingEdit(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        description: editForm.description,
        category: editForm.category.trim(),
        unit: editForm.unit,
        weight: editForm.weight === '' ? undefined : Number(editForm.weight),
        price: Number(editForm.price),
        wholesalerPrice: Number(editForm.price),
        adminPrice: editForm.adminPrice === '' ? 0 : Number(editForm.adminPrice),
        retailPrice: editForm.retailPrice === '' ? 0 : Number(editForm.retailPrice),
        stock: editForm.stock === '' ? 0 : Number(editForm.stock),
        lowStockThreshold: editForm.lowStockThreshold === '' ? 5 : Number(editForm.lowStockThreshold),
        isActive: editForm.isActive,
        status: editForm.status,
      };
      await api.put(`/admin/products/${selectedProduct._id}`, payload);
      toast.success('Product updated');
      setShowEditModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update product');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}" permanently? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/products/${product._id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  // ---------- CSV export ----------
  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await api.get('/admin/products/export', {
        params: {
          search: search.trim() || undefined,
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
        },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `groxo-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  // ---------- CSV import ----------
  const triggerCsvInput = () => csvInputRef.current?.click();

  const handleCsvFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow re-selecting the same file next time
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('csvFile', file);
      const { data } = await api.post('/admin/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: [(d) => d],
      });

      if (data.created || data.updated) {
        toast.success(`Import done: ${data.created} created, ${data.updated} updated`);
      }
      if (data.errors?.length) {
        toast.error(`${data.errors.length} row(s) skipped — first issue: ${data.errors[0]}`);
      }
      if (!data.created && !data.updated && !data.errors?.length) {
        toast.error('Nothing was imported — check the CSV columns');
      }

      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="gx-searchbar">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5.2" stroke="currentColor" strokeWidth="1.6" /><path d="M14 14l-3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <input placeholder="Search product, category or wholesaler…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={handleExportCSV} disabled={exporting}>
          {exporting ? 'Exporting…' : '⬇️ Export CSV'}
        </button>
        <button className="gx-btn gx-btn-outline gx-btn-sm" onClick={triggerCsvInput} disabled={importing}>
          {importing ? 'Importing…' : '⬆️ Import CSV'}
        </button>
        <input type="file" accept=".csv,text/csv" ref={csvInputRef} style={{ display: 'none' }} onChange={handleCsvFileChange} />
      </div>

      <div className="gx-chip-scroll">
        <div className={`gx-chip ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')}>
          All categories
        </div>
        {categoryOptions.map((cat) => (
          <div key={cat} className={`gx-chip ${categoryFilter === cat ? 'active' : ''}`} onClick={() => setCategoryFilter(cat)}>
            {cat}
          </div>
        ))}
      </div>

      <div className="gx-section-title">
        {loading ? 'Loading…' : `${total} product${total === 1 ? '' : 's'}${products.length < total ? ` (${products.length} loaded)` : ''}`}
      </div>

      {loading ? (
        <div className="gx-empty"><div className="gx-glyph">🛍️</div><h4>Loading catalog…</h4></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="gx-empty">
          <div className="gx-glyph">🛍️</div>
          <h4>No products found</h4>
          <p>Try a different search term or category filter.</p>
        </div>
      ) : null}

      {!loading && Object.keys(grouped).length > 0 && (
        Object.keys(grouped).sort().map((category) => (
          <div key={category}>
            <div className="gx-section-title">{category}</div>
            <div className="gx-prod-grid">
              {grouped[category].map((p) => {
                const lowStock = p.stock !== undefined && p.stock <= (p.lowStockThreshold ?? 5);
                return (
                  <div className="gx-prod-card" key={p._id}>
                    <div className="gx-prod-img" style={p.image ? { backgroundImage: `url(${p.image})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
                      {!p.image && '🛍️'}
                      <button
                        className="gx-btn gx-btn-outline gx-btn-sm"
                        style={{ position: 'absolute', bottom: 6, right: 6, padding: '4px 8px' }}
                        onClick={(e) => { e.stopPropagation(); openImageModal(p); }}
                        title="Change image"
                      >
                        🖼️
                      </button>
                    </div>
                    <div className="gx-prod-body">
                      <h5 title={p.name}>{p.name}</h5>
                      <div className="gx-row-sub" style={{ marginTop: 2 }}>{p.wholesaler?.storeName || p.wholesaler?.name || 'N/A'}</div>
                      <div className="gx-prod-price"><span>Wholesale</span><b>Rs.{p.price ?? p.wholesalerPrice ?? 0}</b></div>
                      <div className="gx-prod-price"><span>Admin</span><b>{p.adminPrice ? `Rs.${p.adminPrice}` : '—'}</b></div>
                      <div className="gx-prod-price"><span>Retail</span><b>{p.retailPrice ? `Rs.${p.retailPrice}` : '—'}</b></div>
                      <div className="gx-prod-price">
                        <span>Stock</span>
                        <b style={lowStock ? { color: 'var(--danger)' } : undefined}>{p.stock ?? 0} {p.unit}</b>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={`gx-pill gx-pill-${STATUS_PILL[p.isApproved ? 'approved' : p.status] || 'muted'}`}>
                          <span className="gx-pill-dot" />{p.isApproved ? 'approved' : p.status}
                        </span>
                        {!p.isActive && (
                          <span className="gx-pill gx-pill-muted"><span className="gx-pill-dot" />hidden</span>
                        )}
                        {lowStock && (
                          <span className="gx-pill gx-pill-danger"><span className="gx-pill-dot" />low stock</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button className="gx-btn gx-btn-primary gx-btn-sm" style={{ flex: 1 }} onClick={() => openEditModal(p)}>Edit</button>
                        <button className="gx-btn gx-btn-danger-outline gx-btn-sm" onClick={() => handleDelete(p)}>Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {!loading && page < totalPages && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0' }}>
          <button className="gx-btn gx-btn-outline" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading…' : `Load more (${total - products.length} remaining)`}
          </button>
        </div>
      )}

      <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} capture="environment" />

      {/* ---------- Image modal ---------- */}
      <Modal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        title={`Edit image — ${selectedProduct?.name || ''}`}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowImageModal(false)}>Cancel</button>
            <button className="gx-btn gx-btn-primary" onClick={handleSaveImage} disabled={!newImageFile || savingImage}>
              {savingImage ? 'Uploading…' : 'Upload & save'}
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

      {/* ---------- Edit (all product data) modal ---------- */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title={`Edit product — ${selectedProduct?.name || ''}`}
        footer={
          <>
            <button className="gx-btn gx-btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
            <button className="gx-btn gx-btn-primary" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save changes'}
            </button>
          </>
        }
      >
        <div className="gx-field gx-mt-0">
          <label>Product name *</label>
          <input name="name" value={editForm.name} onChange={handleEditChange} />
        </div>

        <div className="gx-field">
          <label>Description</label>
          <textarea name="description" value={editForm.description} onChange={handleEditChange} />
        </div>

        <div className="gx-field-row">
          <div className="gx-field">
            <label>Category *</label>
            <input name="category" list="gx-category-list" value={editForm.category} onChange={handleEditChange} />
            <datalist id="gx-category-list">
              {categoryOptions.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="gx-field">
            <label>Unit</label>
            <select name="unit" value={editForm.unit} onChange={handleEditChange}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <div className="gx-section-title">Pricing</div>
        <div className="gx-field-row">
          <div className="gx-field gx-mt-0">
            <label>Wholesale price (Rs.) *</label>
            <input name="price" type="number" min="0" value={editForm.price} onChange={handleEditChange} />
          </div>
          <div className="gx-field gx-mt-0">
            <label>Admin price (Rs.)</label>
            <input name="adminPrice" type="number" min="0" value={editForm.adminPrice} onChange={handleEditChange} />
          </div>
        </div>
        <div className="gx-field">
          <label>Retail price (Rs.)</label>
          <input name="retailPrice" type="number" min="0" value={editForm.retailPrice} onChange={handleEditChange} />
        </div>

        <div className="gx-section-title">Inventory</div>
        <div className="gx-field-row">
          <div className="gx-field gx-mt-0">
            <label>Stock</label>
            <input name="stock" type="number" min="0" value={editForm.stock} onChange={handleEditChange} />
          </div>
          <div className="gx-field gx-mt-0">
            <label>Low stock alert at</label>
            <input name="lowStockThreshold" type="number" min="0" value={editForm.lowStockThreshold} onChange={handleEditChange} />
          </div>
        </div>
        <div className="gx-field">
          <label>Weight (kg, optional)</label>
          <input name="weight" type="number" min="0" step="0.01" value={editForm.weight} onChange={handleEditChange} />
        </div>

        <div className="gx-section-title">Visibility</div>
        <div className="gx-field gx-mt-0">
          <label>Approval status</label>
          <select name="status" value={editForm.status} onChange={handleEditChange}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="gx-switch-row">
          <span style={{ fontSize: 13, fontWeight: 600 }}>Active (visible to customers)</span>
          <label className="gx-switch">
            <input type="checkbox" name="isActive" checked={editForm.isActive} onChange={handleEditChange} />
            <span className="gx-slider" />
          </label>
        </div>
      </Modal>
    </>
  );
};

export default ProductCatalog;