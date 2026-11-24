import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const SUGGESTED_CATEGORIES = [
  'Forklift',
  'Pallet',
  'Barcode Scanner',
  'Storage Rack',
  'Machinery',
  'Shipping Container',
  'Electronics',
];

function App() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ asset_id: '', category: '', image: null });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const fileInputRef = useRef(null);

  const fetchAssets = async (query = '') => {
    setLoading(true);
    try {
      const url = query.trim()
        ? `/api/search?q=${encodeURIComponent(query.trim())}`
        : '/api/assets';
      const res = await axios.get(url);
      setAssets(res.data);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: 'Could not connect to the warehouse backend server on port 5000.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      const file = files && files[0] ? files[0] : null;
      setForm((prev) => ({ ...prev, image: file }));
      setPreviewUrl(file ? URL.createObjectURL(file) : null);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const data = new FormData();
      data.append('asset_id', form.asset_id.trim());
      data.append('category', form.category.trim());
      if (form.image) {
        data.append('image', form.image);
      }
      await axios.post('/api/assets', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm({ asset_id: '', category: '', image: null });
      setPreviewUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatusMsg({ type: 'success', text: 'Asset record saved to database.' });
      fetchAssets(search);
    } catch (err) {
      setStatusMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to save asset record.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAssets(search);
  };

  const handleClearSearch = () => {
    setSearch('');
    fetchAssets('');
  };

  const openAssetDetail = async (id) => {
    try {
      const res = await axios.get(`/api/assets/${id}`);
      setSelectedAsset(res.data);
    } catch (err) {
      setStatusMsg({ type: 'error', text: 'Could not load asset details.' });
    }
  };

  const uniqueCategories = new Set(assets.map((a) => a.category)).size;
  const withPhotos = assets.filter((a) => Boolean(a.image_url)).length;

  return (
    <div className="app-wrapper">
      <header className="app-header">
        <div className="header-inner">
          <div className="brand-block">
            <div className="brand-badge">ZL</div>
            <div>
              <h1>ZeeLinks Asset Tracker</h1>
              <p className="subtitle">On-Premises Warehouse Inventory &amp; Inspection Portal</p>
            </div>
          </div>
          <div className="header-stats">
            <div className="stat-pill">
              <span className="stat-value">{assets.length}</span>
              <span className="stat-label">Assets</span>
            </div>
            <div className="stat-pill">
              <span className="stat-value">{uniqueCategories}</span>
              <span className="stat-label">Categories</span>
            </div>
            <div className="stat-pill">
              <span className="stat-value">{withPhotos}</span>
              <span className="stat-label">With Photo</span>
            </div>
          </div>
        </div>
      </header>

      <main className="container">
        {statusMsg && (
          <div className={`alert ${statusMsg.type}`} role="alert">
            <span>{statusMsg.text}</span>
            <button
              className="alert-close"
              onClick={() => setStatusMsg(null)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        )}

        <section className="panel">
          <div className="panel-header">
            <h2>Register New Asset</h2>
            <span className="panel-hint">Timestamp is recorded automatically on submission</span>
          </div>
          <form onSubmit={handleSubmit} className="asset-form">
            <div className="form-group">
              <label htmlFor="asset_id">Asset ID / Identification Number *</label>
              <input
                id="asset_id"
                type="text"
                name="asset_id"
                placeholder="e.g. ZL-WH-1042"
                value={form.asset_id}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Asset Category *</label>
              <input
                id="category"
                type="text"
                name="category"
                list="category-suggestions"
                placeholder="e.g. Forklift, Pallet, Scanner"
                value={form.category}
                onChange={handleInputChange}
                required
              />
              <datalist id="category-suggestions">
                {SUGGESTED_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div className="form-group">
              <label htmlFor="image">Asset Photograph</label>
              <input
                id="image"
                ref={fileInputRef}
                type="file"
                name="image"
                accept="image/*"
                onChange={handleInputChange}
              />
            </div>

            {previewUrl && (
              <div className="preview-box">
                <span className="preview-label">Selected Photograph Preview</span>
                <img src={previewUrl} alt="Asset preview" />
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Saving Record...' : 'Save Asset Record'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="dashboard-top">
            <div>
              <h2>Saved Asset Records</h2>
              <p className="panel-hint">Click any card to inspect full record &amp; photograph</p>
            </div>
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="Search by Asset ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search by Asset ID"
              />
              <button type="submit" className="btn-secondary">Search</button>
              {search && (
                <button type="button" className="btn-ghost" onClick={handleClearSearch}>
                  Clear
                </button>
              )}
            </form>
          </div>

          {loading ? (
            <div className="empty-state">Loading warehouse records...</div>
          ) : assets.length === 0 ? (
            <div className="empty-state">
              {search
                ? `No assets matching "${search}".`
                : 'No asset records yet. Register your first asset above.'}
            </div>
          ) : (
            <div className="grid">
              {assets.map((a) => (
                <div
                  key={a.id}
                  className="card"
                  onClick={() => openAssetDetail(a.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && openAssetDetail(a.id)}
                >
                  <div className="card-img-wrap">
                    {a.image_url ? (
                      <img src={a.image_url} alt={a.asset_id} className="thumb" />
                    ) : (
                      <div className="no-photo">No Photo Uploaded</div>
                    )}
                    <span className="record-tag">#{a.id}</span>
                  </div>
                  <div className="card-body">
                    <div className="card-header-row">
                      <strong className="asset-title">{a.asset_id}</strong>
                      <span className="badge">{a.category}</span>
                    </div>
                    <p className="timestamp">
                      {new Date(a.timestamp).toLocaleString()}
                    </p>
                    <span className="view-link">Inspect record →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedAsset && (
        <div className="modal-backdrop" onClick={() => setSelectedAsset(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedAsset(null)}
              aria-label="Close detail view"
            >
              ×
            </button>
            <h3>Asset Record #{selectedAsset.id}</h3>
            {selectedAsset.image_url ? (
              <div className="modal-img-wrap">
                <img
                  src={selectedAsset.image_url}
                  alt={selectedAsset.asset_id}
                  className="modal-img"
                />
                <a
                  href={selectedAsset.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="open-img-link"
                >
                  Open full-size image ↗
                </a>
              </div>
            ) : (
              <div className="modal-no-photo">No photograph uploaded for this asset</div>
            )}
            <div className="modal-meta">
              <div><span>Database ID</span><strong>#{selectedAsset.id}</strong></div>
              <div><span>Asset ID</span><strong>{selectedAsset.asset_id}</strong></div>
              <div><span>Category</span><strong>{selectedAsset.category}</strong></div>
              <div><span>Created At</span><strong>{new Date(selectedAsset.timestamp).toLocaleString()}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
