// FileName: src/pages/SchoolFinances.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant
// Description: School finances (EMIS) — grants, income, expenditure tracking per term

import React, { useState, useEffect, useCallback, useRef } from 'react';

// Default form state
const EMPTY_FORM = {
  academic_year_id: '', term: '', upe_grant: 0, use_grant: 0, wash_grant: 0,
  special_needs_grant: 0, school_feeding_grant: 0, school_fees_collected: 0,
  pta_contributions: 0, donor_funding: 0, other_income: 0, other_income_source: '',
  expenditure_instructional: 0, expenditure_administration: 0, expenditure_development: 0,
  expenditure_co_curricular: 0, expenditure_school_feeding: 0, expenditure_utilities: 0,
  expenditure_transport: 0, expenditure_staff_wages: 0, expenditure_maintenance: 0,
  expenditure_other: 0, bank_name: '', bank_account: '', bank_branch: '',
  last_audit_date: '', smc_budget_approval: 0
};

// Whitelist of allowed columns (prevents SQL injection via column names)
const ALLOWED_COLUMNS = [
  'academic_year_id', 'term', 'upe_grant', 'use_grant', 'wash_grant',
  'special_needs_grant', 'school_feeding_grant', 'school_fees_collected',
  'pta_contributions', 'donor_funding', 'other_income', 'other_income_source',
  'expenditure_instructional', 'expenditure_administration', 'expenditure_development',
  'expenditure_co_curricular', 'expenditure_school_feeding', 'expenditure_utilities',
  'expenditure_transport', 'expenditure_staff_wages', 'expenditure_maintenance',
  'expenditure_other', 'bank_name', 'bank_account', 'bank_branch',
  'last_audit_date', 'smc_budget_approval'
];

// Income fields configuration
const INCOME_FIELDS = [
  { key: 'upe_grant', label: 'UPE Capitation Grant' },
  { key: 'use_grant', label: 'USE Capitation Grant' },
  { key: 'wash_grant', label: 'WASH Grant' },
  { key: 'special_needs_grant', label: 'Special Needs Grant' },
  { key: 'school_feeding_grant', label: 'School Feeding Grant' },
  { key: 'school_fees_collected', label: 'School Fees Collected' },
  { key: 'pta_contributions', label: 'PTA Contributions' },
  { key: 'donor_funding', label: 'Donor Funding' },
  { key: 'other_income', label: 'Other Income' }
];

// Expenditure fields configuration
const EXPENDITURE_FIELDS = [
  { key: 'expenditure_instructional', label: 'Instructional Materials' },
  { key: 'expenditure_administration', label: 'Administration' },
  { key: 'expenditure_development', label: 'Development / Construction' },
  { key: 'expenditure_co_curricular', label: 'Co-curricular Activities' },
  { key: 'expenditure_school_feeding', label: 'School Feeding' },
  { key: 'expenditure_utilities', label: 'Utilities (Water / Electricity)' },
  { key: 'expenditure_transport', label: 'Transport' },
  { key: 'expenditure_staff_wages', label: 'Staff Wages (Non-Government)' },
  { key: 'expenditure_maintenance', label: 'Maintenance / Repairs' },
  { key: 'expenditure_other', label: 'Other Expenditure' }
];

export default function SchoolFinances() {
  // ─── State variables with proper defaults ──────────────
  const [years, setYears] = useState([]);
  const [selYear, setSelYear] = useState('');
  const [selTerm, setSelTerm] = useState(1);
  const [finData, setFinData] = useState(EMPTY_FORM);
  const [records, setRecords] = useState([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Refs ───────────────────────────────────────────────
  const mountedRef = useRef(true);

  // ─── Cleanup on unmount ─────────────────────────────────
  useEffect(function () {
    mountedRef.current = true;
    return function () { mountedRef.current = false; };
  }, []);

  // ─── Load academic years on mount ────────────────────────
  useEffect(function () {
    const loadYears = async function () {
      if (!window.electronAPI || !window.electronAPI.emisGetAcademicYears) {
        return;
      }

      try {
        const r = await window.electronAPI.emisGetAcademicYears();
        if (!mountedRef.current) return;

        if (r && r.success && r.data && r.data.length > 0) {
          setYears(r.data);
          const current = r.data.find(function (y) {
            return y && (y.is_current === 1 || y.is_current === true);
          });
          setSelYear(current ? current.id : r.data[0].id);
        }
      } catch (e) {
        if (!mountedRef.current) return;
        console.error('SchoolFinances: load years error:', (e && e.message) ? e.message : 'Unknown');
      }
    };
    loadYears();
  }, []);

  // ─── Load records + existing form data when year/term changes ──
  const loadRecords = useCallback(async function () {
    if (!selYear) return;
    if (!window.electronAPI || !window.electronAPI.queryDatabase) return;

    setLoading(true);

    try {
      // Load saved records
      const r = await window.electronAPI.queryDatabase(
        "SELECT f.id, f.academic_year_id, f.term, f.upe_grant, f.use_grant, f.wash_grant, " +
        "f.special_needs_grant, f.school_feeding_grant, f.school_fees_collected, " +
        "f.pta_contributions, f.donor_funding, f.other_income, f.other_income_source, " +
        "f.expenditure_instructional, f.expenditure_administration, f.expenditure_development, " +
        "f.expenditure_co_curricular, f.expenditure_school_feeding, f.expenditure_utilities, " +
        "f.expenditure_transport, f.expenditure_staff_wages, f.expenditure_maintenance, " +
        "f.expenditure_other, f.bank_name, f.bank_account, f.bank_branch, " +
        "f.last_audit_date, f.smc_budget_approval, ay.year_name " +
        "FROM school_finances_emis f " +
        "JOIN academic_years ay ON f.academic_year_id = ay.id " +
        "WHERE f.academic_year_id = ? AND f.term = ? " +
        "ORDER BY f.id DESC",
        [selYear, selTerm]
      );

      if (!mountedRef.current) return;

      if (r && r.success && Array.isArray(r.data)) {
        setRecords(r.data);

        // Load existing data into form (if a record exists)
        if (r.data.length > 0 && r.data[0]) {
          const existing = r.data[0];
          const formData = { ...EMPTY_FORM };

          // Safely copy each field
          ALLOWED_COLUMNS.forEach(function (col) {
            if (existing[col] !== undefined && existing[col] !== null) {
              formData[col] = existing[col];
            }
          });

          // Ensure academic_year_id and term are set
          formData.academic_year_id = selYear;
          formData.term = selTerm;

          setFinData(formData);
        } else {
          // No existing record — start with empty form
          setFinData({ ...EMPTY_FORM, academic_year_id: selYear, term: selTerm });
        }
      } else {
        setRecords([]);
        setFinData({ ...EMPTY_FORM, academic_year_id: selYear, term: selTerm });
      }
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('SchoolFinances: load records error:', errMsg);
      setMsg('❌ Error loading records: ' + errMsg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [selYear, selTerm]);

  // ─── Trigger load when year or term changes ───────────────
  useEffect(function () {
    loadRecords();
  }, [loadRecords]);

  // ─── Value setter for numeric fields ──────────────────────
  const v = useCallback(function (key, val) {
    const numVal = parseFloat(val);
    setFinData(function (prev) {
      return { ...prev, [key]: isNaN(numVal) ? 0 : numVal };
    });
  }, []);

  // ─── Value setter for text fields ─────────────────────────
  const setText = useCallback(function (key, val) {
    setFinData(function (prev) {
      return { ...prev, [key]: val };
    });
  }, []);

  // ─── Calculate totals (all with null checks) ─────────────
  const totalIncome = INCOME_FIELDS.reduce(function (sum, f) {
    const val = (finData && finData[f.key]) ? Number(finData[f.key]) : 0;
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const totalExpenditure = EXPENDITURE_FIELDS.reduce(function (sum, f) {
    const val = (finData && finData[f.key]) ? Number(finData[f.key]) : 0;
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  const balance = totalIncome - totalExpenditure;

  // ─── Handle save (FIXED: no SQL injection) ────────────────
  const handleSave = async function (e) {
    if (e && e.preventDefault) e.preventDefault();

    if (!selYear) {
      setMsg('⚠️ Please select an academic year');
      return;
    }

    setSaving(true);
    setMsg('⏳ Saving...');

    try {
      // Prepare data with academic_year_id and term
      const d = { ...finData, academic_year_id: selYear, term: selTerm };

      // Build column list from whitelist (prevents injection via column names)
      const cols = ALLOWED_COLUMNS.filter(function (col) {
        return d[col] !== undefined && d[col] !== null;
      });
      const vals = cols.map(function (col) {
        return d[col];
      });

      if (cols.length === 0) {
        setMsg('⚠️ No data to save');
        if (mountedRef.current) setSaving(false);
        return;
      }

      // Check if record already exists
      const ex = await window.electronAPI.queryDatabase(
        "SELECT id FROM school_finances_emis WHERE academic_year_id = ? AND term = ?",
        [selYear, selTerm]
      );

      if (!mountedRef.current) return;

      if (ex && ex.success && ex.data.length > 0 && ex.data[0]) {
        // ─── UPDATE existing record ────────────────────
        // FIXED: Uses ? placeholder for id (was string concatenation: "WHERE id=" + ex.data[0].id)
        const setClause = cols.map(function (c) { return c + ' = ?'; }).join(', ');
        const updateVals = vals.slice(); // Copy values
        updateVals.push(ex.data[0].id); // Add id for WHERE clause

        await window.electronAPI.queryDatabase(
          "UPDATE school_finances_emis SET " + setClause + " WHERE id = ?",
          updateVals
        );
      } else {
        // ─── INSERT new record ──────────────────────────
        const placeholders = cols.map(function () { return '?'; }).join(', ');
        await window.electronAPI.queryDatabase(
          "INSERT INTO school_finances_emis (" + cols.join(', ') + ") VALUES (" + placeholders + ")",
          vals
        );
      }

      if (!mountedRef.current) return;
      setMsg('✅ Financial data saved successfully!');
      loadRecords();
    } catch (e) {
      if (!mountedRef.current) return;
      const errMsg = (e && e.message) ? e.message : 'Unknown error';
      console.error('SchoolFinances: save error:', errMsg);
      setMsg('❌ Error saving: ' + errMsg);
    } finally {
      if (mountedRef.current) setSaving(false);
    }

    // Auto-clear message
    setTimeout(function () {
      if (mountedRef.current) setMsg('');
    }, 4000);
  };

  // ─── Input generator for numeric fields ───────────────────
  const renderInput = function (key, label) {
    const value = (finData && finData[key] !== undefined && finData[key] !== null) ? finData[key] : 0;
    return (
      <div className="form-group" key={key}>
        <label className="form-label">{label}</label>
        <input
          type="number"
          className="form-input"
          value={value}
          onChange={function (e) { v(key, e.target.value); }}
          placeholder="0"
          min="0"
        />
      </div>
    );
  };

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">🏦 School Finances (EMIS)</h1>
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
            <p style={{ color: '#666' }}>Loading financial data...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">🏦 School Finances (EMIS)</h1>

      {/* ─── Message ────────────────────────────────────────── */}
      {msg && (
        <p style={{
          color: (msg.indexOf('❌') >= 0) ? '#c62828' :
            (msg.indexOf('⚠️') >= 0) ? '#e65100' :
              (msg.indexOf('⏳') >= 0) ? '#1a73e8' : '#0d904f',
          marginBottom: '15px', padding: '10px 14px',
          background: (msg.indexOf('❌') >= 0) ? '#ffebee' :
            (msg.indexOf('⚠️') >= 0) ? '#fff3e0' :
              (msg.indexOf('⏳') >= 0) ? '#e8f0fe' : '#e8f5e9',
          borderRadius: '6px'
        }}>
          {msg}
        </p>
      )}

      {/* ─── Year + Term Selection ─────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Academic Year</label>
          <select
            className="form-input"
            value={selYear}
            onChange={function (e) { setSelYear(e.target.value); }}
          >
            <option value="">-- Select --</option>
            {years.map(function (y) {
              return <option key={y.id} value={y.id}>{y.year_name}</option>;
            })}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
          <label className="form-label">Term</label>
          <select
            className="form-input"
            value={selTerm}
            onChange={function (e) { setSelTerm(parseInt(e.target.value)); }}
          >
            <option value={1}>Term 1</option>
            <option value={2}>Term 2</option>
            <option value={3}>Term 3</option>
          </select>
        </div>
        <button
          onClick={loadRecords}
          className="btn btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
          disabled={!selYear || loading}
        >
          {loading ? '⏳' : '🔄 Load'}
        </button>
      </div>

      {/* ─── Income & Expenditure Side by Side ──────────────── */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* ═══════════════════════════════════════════════════ */}
        {/* INCOME                                                */}
        {/* ═══════════════════════════════════════════════════ */}
        <div style={{ flex: 1, minWidth: '350px' }} className="card">
          <div className="card-header">💰 Income (UGX)</div>
          <div className="card-body">
            {INCOME_FIELDS.map(function (f) {
              return renderInput(f.key, f.label);
            })}
            <div className="form-group">
              <label className="form-label">Other Income Source</label>
              <input
                className="form-input"
                value={(finData && finData.other_income_source) ? finData.other_income_source : ''}
                onChange={function (e) { setText('other_income_source', e.target.value); }}
                placeholder="e.g. Fundraiser, Hall hire"
              />
            </div>
            <div style={{
              marginTop: '10px', padding: '10px 14px',
              background: '#e8f5e9', borderRadius: '6px',
              fontWeight: 'bold', color: '#0d904f', fontSize: '15px'
            }}>
              💰 Total Income: UGX {totalIncome.toLocaleString()}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* EXPENDITURE                                           */}
        {/* ═══════════════════════════════════════════════════ */}
        <div style={{ flex: 1, minWidth: '350px' }} className="card">
          <div className="card-header">📉 Expenditure (UGX)</div>
          <div className="card-body">
            {EXPENDITURE_FIELDS.map(function (f) {
              return renderInput(f.key, f.label);
            })}
            <div style={{
              marginTop: '10px', padding: '10px 14px',
              background: '#ffebee', borderRadius: '6px',
              fontWeight: 'bold', color: '#d32f2f', fontSize: '15px'
            }}>
              📉 Total Expenditure: UGX {totalExpenditure.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Balance ──────────────────────────────────────────── */}
      <div style={{
        fontSize: '18px', fontWeight: 'bold', margin: '20px 0',
        padding: '15px 20px', borderRadius: '8px',
        background: balance >= 0 ? '#e8f5e9' : '#ffebee',
        color: balance >= 0 ? '#0d904f' : '#d32f2f',
        display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        {balance >= 0 ? '✅' : '⚠️'} Balance: UGX {balance.toLocaleString()}
        <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666' }}>
          ({balance >= 0 ? 'Surplus' : 'Deficit'})
        </span>
      </div>

      {/* ─── Save Button ──────────────────────────────────────── */}
      <button
        onClick={handleSave}
        className="btn btn-primary"
        style={{ fontSize: '16px', padding: '12px 24px', marginBottom: '20px' }}
        disabled={saving || !selYear}
      >
        {saving ? '⏳ Saving...' : '💾 Save Financial Data'}
      </button>

      {/* ─── Bank Details ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">🏦 Bank Account Details</div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input
                className="form-input"
                value={(finData && finData.bank_name) ? finData.bank_name : ''}
                onChange={function (e) { setText('bank_name', e.target.value); }}
                placeholder="e.g. Stanbic Bank"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                className="form-input"
                value={(finData && finData.bank_account) ? finData.bank_account : ''}
                onChange={function (e) { setText('bank_account', e.target.value); }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Branch</label>
              <input
                className="form-input"
                value={(finData && finData.bank_branch) ? finData.bank_branch : ''}
                onChange={function (e) { setText('bank_branch', e.target.value); }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Last Audit Date</label>
              <input
                type="date"
                className="form-input"
                value={(finData && finData.last_audit_date) ? finData.last_audit_date : ''}
                onChange={function (e) { setText('last_audit_date', e.target.value); }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">SMC Budget Approval</label>
              <select
                className="form-input"
                value={(finData && finData.smc_budget_approval) ? String(finData.smc_budget_approval) : '0'}
                onChange={function (e) { setText('smc_budget_approval', parseInt(e.target.value)); }}
              >
                <option value="0">Not Approved</option>
                <option value="1">Approved</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Saved Records ────────────────────────────────────── */}
      {records.length > 0 && (
        <div className="card">
          <div className="card-header">📋 Saved Records ({records.length})</div>
          <div className="card-body" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Term</th>
                  <th>UPE</th>
                  <th>USE</th>
                  <th>WASH</th>
                  <th>Fees</th>
                  <th>Other Income</th>
                  <th>Total Income</th>
                  <th>Total Expenditure</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {records.map(function (r, i) {
                  const yearName = (r && r.year_name) ? r.year_name : '-';
                  const term = (r && r.term) ? 'Term ' + r.term : '-';
                  const upe = (r && r.upe_grant) ? Number(r.upe_grant) : 0;
                  const useG = (r && r.use_grant) ? Number(r.use_grant) : 0;
                  const wash = (r && r.wash_grant) ? Number(r.wash_grant) : 0;
                  const fees = (r && r.school_fees_collected) ? Number(r.school_fees_collected) : 0;
                  const otherInc = (r && r.other_income) ? Number(r.other_income) : 0;

                  // Calculate totals from record
                  const inc = upe + useG + wash + fees + otherInc +
                    ((r && r.special_needs_grant) ? Number(r.special_needs_grant) : 0) +
                    ((r && r.school_feeding_grant) ? Number(r.school_feeding_grant) : 0) +
                    ((r && r.pta_contributions) ? Number(r.pta_contributions) : 0) +
                    ((r && r.donor_funding) ? Number(r.donor_funding) : 0);

                  const expFields = ['expenditure_instructional', 'expenditure_administration',
                    'expenditure_development', 'expenditure_co_curricular',
                    'expenditure_school_feeding', 'expenditure_utilities',
                    'expenditure_transport', 'expenditure_staff_wages',
                    'expenditure_maintenance', 'expenditure_other'];

                  const exp = expFields.reduce(function (sum, key) {
                    const val = (r && r[key]) ? Number(r[key]) : 0;
                    return sum + (isNaN(val) ? 0 : val);
                  }, 0);

                  const bal = inc - exp;

                  return (
                    <tr key={(r && r.id) ? r.id : i}>
                      <td>{yearName}</td>
                      <td>{term}</td>
                      <td>{upe.toLocaleString()}</td>
                      <td>{useG.toLocaleString()}</td>
                      <td>{wash.toLocaleString()}</td>
                      <td>{fees.toLocaleString()}</td>
                      <td>{otherInc.toLocaleString()}</td>
                      <td style={{ fontWeight: 'bold' }}>{inc.toLocaleString()}</td>
                      <td style={{ fontWeight: 'bold', color: '#d32f2f' }}>{exp.toLocaleString()}</td>
                      <td style={{ fontWeight: 'bold', color: bal >= 0 ? '#0d904f' : '#d32f2f' }}>
                        {bal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}