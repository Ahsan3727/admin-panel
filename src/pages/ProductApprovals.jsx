import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Table, Badge, Button,
  Modal, Form, Spinner, InputGroup,
} from 'react-bootstrap';
import api from '../services/api';
import { toast } from 'react-toastify';

const ProductApprovals = () => {
  // ────────── Product Approvals State ──────────
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adminPrice, setAdminPrice] = useState('');
  const [retailPrice, setRetailPrice] = useState('');   // NEW

  // ────────── Category Management State ──────────
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');

  // ────────── Fetch Data on Mount ──────────
  useEffect(() => {
    fetchPendingProducts();
    fetchCategories();
  }, []);

  // ------------------- Products -------------------
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
    setRetailPrice(product.retailPrice || '');   // pre-fill retail price
    setShowPriceModal(true);
  };

  const handleOpenDetailModal = (product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };

  const handleApprove = async (productId) => {
    try {
      await api.put(`/admin/products/${productId}`, {
        status: 'approved',
        adminPrice: Number(adminPrice),
        retailPrice: Number(retailPrice) || 0,   // send retail price
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

  // ------------------- Categories -------------------
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

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      toast.error('Category name required');
      return;
    }
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

  // ------------------- Render -------------------
  if (loading || categoriesLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading data...</p>
      </div>
    );
  }

  return (
    <Container fluid>
      <Row>
        {/* ────────── Product Approvals ────────── */}
        <Col md={7} className="mb-4">
          <h4 className="mb-3">📦 Product Approvals</h4>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {products.length === 0 ? (
                <div className="text-center py-4 text-muted">No pending products</div>
              ) : (
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Wholesaler</th>
                      <th>Wholesaler Price</th>
                      <th>Admin Price</th>
                      <th>Retail Price</th>      {/* NEW column */}
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product._id}>
                        <td>
                          <strong>{product.name}</strong>
                          {product.image && (
                            <img src={product.image} alt="" width="40" className="ms-2 rounded" />
                          )}
                        </td>
                        <td>{product.wholesaler?.storeName || product.wholesaler?.name || 'N/A'}</td>
                        <td>Rs. {product.wholesalerPrice || product.price || 0}</td>
                        <td>Rs. {product.adminPrice || '-'}</td>
                        <td>Rs. {product.retailPrice || '-'}</td>   {/* NEW */}
                        <td>
                          <Badge
                            bg={
                              product.status === 'pending'
                                ? 'warning'
                                : product.status === 'approved'
                                ? 'success'
                                : 'danger'
                            }
                          >
                            {product.status}
                          </Badge>
                        </td>
                        <td>
                          {/* Details button always visible */}
                          <Button
                            size="sm"
                            variant="outline-info"
                            className="me-1"
                            onClick={() => handleOpenDetailModal(product)}
                          >
                            Details
                          </Button>
                          {product.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="success"
                                className="me-1"
                                onClick={() => handleOpenPriceModal(product)}
                              >
                                Approve & Set Price
                              </Button>
                              <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleReject(product._id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          {product.status === 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline-success"
                              onClick={() => handleOpenPriceModal(product)}
                            >
                              Reconsider
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* ────────── Category Management ────────── */}
        <Col md={5}>
          <h4 className="mb-3">🏷️ Global Categories</h4>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <Form onSubmit={handleCreateCategory} className="mb-3">
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <Button type="submit" variant="primary">
                    Add
                  </Button>
                </InputGroup>
              </Form>

              {categories.length === 0 ? (
                <p className="text-muted text-center">No categories yet</p>
              ) : (
                <ul className="list-group">
                  {categories.map((cat) => (
                    <li
                      key={cat._id}
                      className="list-group-item d-flex justify-content-between align-items-center"
                    >
                      {cat.name}
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDeleteCategory(cat._id)}
                      >
                        🗑
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ────────── Price Setting Modal (updated) ────────── */}
      <Modal show={showPriceModal} onHide={() => setShowPriceModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Set Final Price – {selectedProduct?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>
              Wholesaler Price: Rs. {selectedProduct?.wholesalerPrice || selectedProduct?.price}
            </Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter admin selling price"
              value={adminPrice}
              onChange={(e) => setAdminPrice(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mt-3">
            <Form.Label>Retail Price (optional)</Form.Label>
            <Form.Control
              type="number"
              placeholder="Enter suggested retail price"
              value={retailPrice}
              onChange={(e) => setRetailPrice(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPriceModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={() => handleApprove(selectedProduct._id)}>
            Approve at Rs. {adminPrice}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ────────── Product Detail Modal (updated) ────────── */}
      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="lg"
        scrollable
      >
        <Modal.Header closeButton>
          <Modal.Title>📋 Product Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct && (
            <div className="p-2">
              {/* Image (if available) */}
              {selectedProduct.image && (
                <div className="text-center mb-3">
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px' }}
                  />
                </div>
              )}

              {/* Basic Information */}
              <h5 className="mb-3">{selectedProduct.name}</h5>
              <Row className="mb-3">
                <Col md={6}>
                  <p><strong>Wholesaler:</strong> {selectedProduct.wholesaler?.storeName || selectedProduct.wholesaler?.name || 'N/A'}</p>
                  <p><strong>Category:</strong> {selectedProduct.category}</p>
                  <p><strong>Unit:</strong> {selectedProduct.unit || 'N/A'}</p>
                  <p><strong>Weight:</strong> {selectedProduct.weight ? `${selectedProduct.weight} kg` : 'N/A'}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Wholesaler Price:</strong> Rs. {selectedProduct.wholesalerPrice || selectedProduct.price || 0}</p>
                  <p><strong>Admin Price:</strong> Rs. {selectedProduct.adminPrice || 'Not set'}</p>
                  <p><strong>Retail Price:</strong> Rs. {selectedProduct.retailPrice || 'Not set'}</p>   {/* NEW */}
                  <p><strong>Stock:</strong> {selectedProduct.stock || 0}</p>
                  <p><strong>Status:</strong>{' '}
                    <Badge
                      bg={
                        selectedProduct.status === 'pending'
                          ? 'warning'
                          : selectedProduct.status === 'approved'
                          ? 'success'
                          : 'danger'
                      }
                    >
                      {selectedProduct.status}
                    </Badge>
                  </p>
                </Col>
              </Row>

              {/* Description */}
              <div className="mb-3">
                <strong>Description:</strong>
                <p className="mt-1">{selectedProduct.description || 'No description provided'}</p>
              </div>

              {/* Additional details if available */}
              {selectedProduct.isApproved !== undefined && (
                <p>
                  <strong>Approval Status:</strong>{' '}
                  {selectedProduct.isApproved ? 'Approved' : 'Not Approved'}
                </p>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ProductApprovals;