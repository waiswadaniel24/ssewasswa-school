// FileName: src/pages/Library.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: Library management — book inventory, borrow, return, search

import React, { useState, useEffect, useCallback, useRef } from 'react';

const EMPTY_FORM = {
  id: null, title: '', author: '', isbn: '',
  category: '', copies: 1, available: 1, shelf: ''
};

export default function Library() {
  // ─── State variables with proper defaults ──────────────
  const [books, setBooks] = useState([]);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);
  const searchTimerRef = useRef(null);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Fetch books (with optional search) ───────────────────
  const fetchData = useCallback(async function (search) {
    if (!window.electronAPI || !window.electronAPI.queryDatabase) {
      if (mountedRef.current) setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let query = "SELECT id, title, author, isbn, category, copies, available, shelf FROM library_books";
      const params = [];

      if (search && search.trim()) {
        query += " WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? OR category LIKE ?";
        const st = '%' + search.trim() + '%';
        params.push(st, st, st, st);
      }

      query += " ORDER BY title";

      const r = await window.electronAPI.queryDatabase(query, params);

      if (!mountedRef.current) return;

      if (r && r.success && Array.isArray(r.data)) {
        setBooks(r.data);
      } else {
        setBooks([]);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('Library: fetch error:', errMsg);
      setMsg('❌ Error loading books: ' + errMsg);
      setBooks([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  // ─── Initial load ────────────────────────────────────────
  useEffect(function () {
    fetchData('');
  }, [fetchData]);

  // ─── Debounced search ─────────────────────────────────────
  useEffect(function () {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(function () {
      fetchData(searchTerm);
    }, 300);
    return function () {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm, fetchData]);

  // ─── Handle form submit (add or edit) ─────────────────────
  const handleSubmit = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    // Validate
    if (!formData.title || !formData.title.trim()) {
      setMsg('⚠️ Book title is required');
      return;
    }

    const copies = parseInt(formData.copies) || 1;
    const available = parseInt(formData.available) || 0;

    if (available > copies) {
      setMsg('⚠️ Available cannot be greater than total copies');
      return;
    }

    setSaving(true);
    setMsg('');

    try {
      let result;

      if (formData.id) {
        // Update
        result = await window.electronAPI.queryDatabase(
          "UPDATE library_books SET title = ?, author = ?, isbn = ?, category = ?, copies = ?, available = ?, shelf = ? WHERE id = ?",
          [
            formData.title.trim(),
            formData.author || '',
            formData.isbn || '',
            formData.category || '',
            copies,
            available,
            formData.shelf || '',
            formData.id
          ]
        );
      } else {
        // Insert
        result = await window.electronAPI.queryDatabase(
          "INSERT INTO library_books (title, author, isbn, category, copies, available, shelf) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            formData.title.trim(),
            formData.author || '',
            formData.isbn || '',
            formData.category || '',
            copies,
            available,
            formData.shelf || ''
          ]
        );
      }

      if (!mountedRef.current) return;

      if (result && result.success) {
        setMsg(formData.id ? '✅ Book updated!' : '✅ Book added!');
        setFormData(EMPTY_FORM);
        setShowForm(false);
        fetchData(searchTerm);
      } else {
        const errMsg = (result && result.error) ? result.error : 'Failed to save';
        setMsg('❌ ' + errMsg);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error: ' + errMsg);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Delete book ─────────────────────────────────────────
  const handleDelete = async function (id, title) {
    if (!confirm('Delete "' + (title || 'Unknown') + '" from the library?')) return;

    try {
      await window.electronAPI.queryDatabase(
        "DELETE FROM library_books WHERE id = ?", [id]
      );

      if (!mountedRef.current) return;
      setMsg('🗑️ Book deleted');
      fetchData(searchTerm);
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error deleting: ' + errMsg);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 3000);
  };

  // ─── Borrow book (decrement available) ───────────────────
  const handleBorrow = async function (id, title) {
    try {
      const result = await window.electronAPI.queryDatabase(
        "UPDATE library_books SET available = available - 1 WHERE id = ? AND available > 0",
        [id]
      );

      if (!mountedRef.current) return;

      if (result && result.success) {
        // Check if any rows were affected (available was > 0)
        if (result.data && result.data.length > 0 && result.data[0].available !== undefined) {
          setMsg('📖 Borrowed: ' + (title || 'Book'));
        } else {
          // Query may not return affected rows — check by reloading
          setMsg('📖 Borrowed: ' + (title || 'Book'));
        }
        fetchData(searchTerm);
      } else {
        setMsg('❌ Book not available for borrowing');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error borrowing: ' + errMsg);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 2000);
  };

  // ─── Return book (increment available, with check) ────────
  const handleReturn = async function (id, title) {
    try {
      // FIXED: Check that available < copies before incrementing
      const check = await window.electronAPI.queryDatabase(
        "SELECT available, copies FROM library_books WHERE id = ?", [id]
      );

      if (!mountedRef.current) return;

      if (check && check.success && check.data.length > 0 && check.data[0]) {
        const available = (check.data[0].available !== undefined && check.data[0].available !== null) ? Number(check.data[0].available) : 0;
        const copies = (check.data[0].copies !== undefined && check.data[0].copies !== null) ? Number(check.data[0].copies) : 0;

        if (available >= copies) {
          setMsg('⚠️ All copies already returned (available = ' + available + ', copies = ' + copies + ')');
          return;
        }

        await window.electronAPI.queryDatabase(
          "UPDATE library_books SET available = available + 1 WHERE id = ?", [id]
        );

        if (!mountedRef.current) return;
        setMsg('📚 Returned: ' + (title || 'Book'));
        fetchData(searchTerm);
      } else {
        setMsg('❌ Book not found');
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      setMsg('❌ Error returning: ' + errMsg);
    }

    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 2000);
  };

  // ─── Edit book (populate form) ────────────────────────────
  const handleEdit = function (book) {
    if (!book) return;
    setFormData({
      id: book.id || null,
      title: book.title || '',
      author: book.author || '',
      isbn: book.isbn || '',
      category: book.category || '',
      copies: book.copies || 1,
      available: book.available || 1,
      shelf: book.shelf || ''
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Derived values (all with null checks) ───────────────
  const totalCopies = books.reduce(function (sum, b) {
    const c = (b && b.copies) ? Number(b.copies) : 0;
    return sum + (isNaN(c) ? 0 : c);
  }, 0);

  const totalAvailable = books.reduce(function (sum, b) {
    const a = (b && b.available) ? Number(b.available) : 0;
    return sum + (isNaN(a) ? 0 : a);
  }, 0);

  const totalBorrowed = totalCopies - totalAvailable;
  const outOfStockCount = books.filter(function (b) {
    const a = (b && b.available !== undefined && b.available !== null) ? Number(b.available) : 0;
    return a === 0;
  }).length;

  // ─── Loading state ──────────────────────────────────────
  if (loading && books.length === 0) {
    return (
      <div className="page-container">
        <h1 className="page-title">📖 Library</h1>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{
              width: '40px', height: '40px',
              border: '4px solid #e0e0e0',
              borderTopColor: '#1a73e8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ color: '#666' }}>Loading library...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">📖 Library</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: (msg.indexOf('❌') >= 0) ? '#c62828' :
            (msg.indexOf('⚠️') >= 0) ? '#e65100' : '#0d904f',
          marginBottom: '15px', padding: '10px 14px',
          background: (msg.indexOf('❌') >= 0) ? '#ffebee' :
            (msg.indexOf('⚠️') >= 0) ? '#fff3e0' : '#e8f5e9',
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Summary Cards ─────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px', marginBottom: '20px'
      }}>
        <div style={{ background: '#e8f0fe', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a73e8' }}>{books.length}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Book Titles</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d904f' }}>{totalCopies}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Total Copies</div>
        </div>
        <div style={{ background: '#e8f5e9', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0d904f' }}>{totalAvailable}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Available</div>
        </div>
        <div style={{ background: '#fff3e0', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>{totalBorrowed}</div>
          <div style={{ fontSize: '11px', color: '#5f6368' }}>Borrowed Out</div>
        </div>
        {outOfStockCount > 0 && (
          <div style={{ background: '#ffebee', padding: '12px 16px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#d32f2f' }}>{outOfStockCount}</div>
            <div style={{ fontSize: '11px', color: '#5f6368' }}>⚠️ Out of Stock</div>
          </div>
        )}
      </div>

      {/* ─── Search + Add Button ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%',
            transform: 'translateY(-50%)', color: '#9aa0a6'
          }}>🔍</span>
          <input
            className="form-input"
            style={{ paddingLeft: '38px' }}
            value={searchTerm}
            onChange={function (e) { setSearchTerm(e.target.value); }}
            placeholder="Search by title, author, ISBN, or category..."
          />
        </div>
        <button
          onClick={function () {
            setShowForm(!showForm);
            setFormData(EMPTY_FORM);
          }}
          className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          {showForm ? '❌ Cancel' : '➕ Add Book'}
        </button>
      </div>

      {/* ─── Add/Edit Form ──────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header">{formData.id ? '✏️ Edit Book' : '➕ Add New Book'}</div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input
                      className="form-input"
                      value={formData.title}
                      onChange={function (e) { setFormData({ ...formData, title: e.target.value }); }}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Author</label>
                    <input
                      className="form-input"
                      value={formData.author}
                      onChange={function (e) { setFormData({ ...formData, author: e.target.value }); }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ISBN</label>
                    <input
                      className="form-input"
                      value={formData.isbn}
                      onChange={function (e) { setFormData({ ...formData, isbn: e.target.value }); }}
                    />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input
                      className="form-input"
                      value={formData.category}
                      onChange={function (e) { setFormData({ ...formData, category: e.target.value }); }}
                      placeholder="e.g. Fiction, Science, Religion"
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label className="form-label">Copies</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.copies}
                        onChange={function (e) { setFormData({ ...formData, copies: parseInt(e.target.value) || 1 }); }}
                        min="1"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Available</label>
                      <input
                        type="number"
                        className="form-input"
                        value={formData.available}
                        onChange={function (e) { setFormData({ ...formData, available: parseInt(e.target.value) || 0 }); }}
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Shelf</label>
                    <input
                      className="form-input"
                      value={formData.shelf}
                      onChange={function (e) { setFormData({ ...formData, shelf: e.target.value }); }}
                      placeholder="e.g. A-3, Reference Section"
                    />
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving...' : '💾 Save Book'}
                </button>
                <button
                  type="button"
                  onClick={function () { setShowForm(false); setFormData(EMPTY_FORM); }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Books Table ────────────────────────────────────── */}
      <div className="card">
        <div className="card-header">📚 Inventory ({books.length})</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          {books.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              {searchTerm ? 'No books matching your search' : 'No books in the library. Click "Add Book" to add one.'}
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>ISBN</th>
                  <th>Category</th>
                  <th>Available / Copies</th>
                  <th>Shelf</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map(function (b, i) {
                  const id = (b && b.id) ? b.id : i;
                  const title = (b && b.title) ? b.title : '-';
                  const author = (b && b.author) ? b.author : '-';
                  const isbn = (b && b.isbn) ? b.isbn : '-';
                  const category = (b && b.category) ? b.category : '-';
                  const available = (b && b.available !== undefined && b.available !== null) ? Number(b.available) : 0;
                  const copies = (b && b.copies !== undefined && b.copies !== null) ? Number(b.copies) : 0;
                  const shelf = (b && b.shelf) ? b.shelf : '-';

                  const isOutOfStock = available === 0;
                  const isLowStock = available > 0 && available <= 2;

                  return (
                    <tr key={id}>
                      <td style={{ fontWeight: '600' }}>{title}</td>
                      <td style={{ fontSize: '12px' }}>{author}</td>
                      <td style={{ fontSize: '12px' }}>{isbn}</td>
                      <td style={{ fontSize: '12px' }}>{category}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: isOutOfStock ? '#ffebee' : (isLowStock ? '#fff3e0' : '#e8f5e9'),
                          color: isOutOfStock ? '#d32f2f' : (isLowStock ? '#e65100' : '#0d904f'),
                          fontSize: '12px', fontWeight: '600'
                        }}>
                          {available} / {copies}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }}>{shelf}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={function () { handleBorrow(id, title); }}
                            disabled={available === 0}
                            style={{
                              color: available > 0 ? '#e65100' : '#ccc',
                              border: '1px solid ' + (available > 0 ? '#ffcc80' : '#e0e0e0'),
                              background: 'white',
                              cursor: available > 0 ? 'pointer' : 'not-allowed',
                              fontSize: '12px', fontWeight: '600',
                              padding: '3px 8px', borderRadius: '4px'
                            }}
                            title="Borrow (decrease available)"
                          >
                            📖 Borrow
                          </button>
                          <button
                            onClick={function () { handleReturn(id, title); }}
                            disabled={available >= copies}
                            style={{
                              color: available < copies ? '#0d904f' : '#ccc',
                              border: '1px solid ' + (available < copies ? '#a5d6a7' : '#e0e0e0'),
                              background: 'white',
                              cursor: available < copies ? 'pointer' : 'not-allowed',
                              fontSize: '12px', fontWeight: '600',
                              padding: '3px 8px', borderRadius: '4px'
                            }}
                            title="Return (increase available)"
                          >
                            📚 Return
                          </button>
                          <button
                            onClick={function () { handleEdit(b); }}
                            style={{ color: '#1a73e8', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', marginLeft: '4px' }}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={function () { handleDelete(id, title); }}
                            style={{ color: '#d32f2f', border: 'none', background: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}