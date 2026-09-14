// FileName: src/pages/Calendar.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useState, useEffect, useRef } from 'react';

// Uganda public holidays (fixed dates)
// Note: Easter-based holidays (Good Friday, Easter Monday) vary each year.
// The dates below are for 2024. Update annually or implement Easter computus.
const UGANDA_HOLIDAYS = [
  { date: '01-01', name: "New Year's Day", type: 'public' },
  { date: '01-26', name: "NRM Liberation Day", type: 'public' },
  { date: '03-08', name: "International Women's Day", type: 'public' },
  { date: '03-29', name: "Good Friday", type: 'public', note: '2024 date — varies each year' },
  { date: '04-01', name: "Easter Monday", type: 'public', note: '2024 date — varies each year' },
  { date: '05-01', name: "Labour Day", type: 'public' },
  { date: '06-03', name: "Uganda Martyrs' Day", type: 'public' },
  { date: '06-09', name: "National Heroes' Day", type: 'public' },
  { date: '10-09', name: "Independence Day", type: 'public' },
  { date: '12-25', name: "Christmas Day", type: 'public' },
  { date: '12-26', name: "Boxing Day", type: 'public' }
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Calendar() {
  const [academicYear, setAcademicYear] = useState(null);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ─── Load academic year on mount ───────────────────────────
  useEffect(() => {
    const loadYear = async () => {
      try {
        const res = await window.electronAPI.emisGetAcademicYears();
        if (!mountedRef.current) return;

        if (res && res.success && res.data && res.data.length > 0) {
          const current = res.data.find(y => y.is_current === 1 || y.is_current === true) || res.data[0];
          setAcademicYear(current);
        }
      } catch (e) {
        if (!mountedRef.current) return;
        console.error('Calendar: load year error:', e.message);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };
    loadYear();
  }, []);

  // ─── Get term dates with fallbacks ────────────────────────
  const getTerms = () => {
    if (!academicYear) return [];
    return [
      {
        term: 'Term 1',
        start: academicYear.term_1_start || 'February',
        end: academicYear.term_1_end || 'May',
        color: '#1a73e8'
      },
      {
        term: 'Term 2',
        start: academicYear.term_2_start || 'May',
        end: academicYear.term_2_end || 'August',
        color: '#0d904f'
      },
      {
        term: 'Term 3',
        start: academicYear.term_3_start || 'September',
        end: academicYear.term_3_end || 'December',
        color: '#f9ab00'
      }
    ];
  };

  const terms = getTerms();

  // ─── Parse holiday date (MM-DD format) ────────────────────
  const parseHolidayDate = (mmdd) => {
    const [mm, dd] = mmdd.split('-');
    const year = new Date().getFullYear();
    return new Date(year, parseInt(mm) - 1, parseInt(dd));
  };

  // ─── Check if a holiday has passed this year ──────────────
  const isHolidayPast = (mmdd) => {
    const holidayDate = parseHolidayDate(mmdd);
    return holidayDate < new Date();
  };

  // ─── Format holiday date for display ──────────────────────
  const formatHolidayDate = (mmdd) => {
    const [mm, dd] = mmdd.split('-');
    return MONTH_NAMES[parseInt(mm) - 1] + ' ' + dd;
  };

  // ─── Check if currently in a term ─────────────────────────
  const getCurrentTerm = () => {
    if (!academicYear) return null;
    const now = new Date();
    for (const t of terms) {
      if (t.start && t.end) {
        const start = new Date(t.start);
        const end = new Date(t.end);
        if (!isNaN(start) && !isNaN(end) && now >= start && now <= end) {
          return t;
        }
      }
    }
    return null;
  };

  const currentTerm = getCurrentTerm();

  // ─── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="page-container">
        <h1 className="page-title">📅 Academic Calendar</h1>
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
            <p style={{ color: '#666' }}>Loading calendar...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '12px'
      }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>📅 Academic Calendar</h1>
          <p style={{ color: '#666', margin: '5px 0 0 0', fontSize: '14px' }}>
            {academicYear ? academicYear.year_name + ' Academic Year' : 'Academic Calendar & Holidays'}
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="btn btn-primary"
          style={{ width: 'auto' }}
        >
          🖨️ Print Calendar
        </button>
      </div>

      {/* ─── Current Term Alert ──────────────────────────────── */}
      {currentTerm && (
        <div style={{
          background: currentTerm.color + '15',
          borderLeft: `4px solid ${currentTerm.color}`,
          padding: '12px 20px', borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>📍</span>
          <span style={{ color: currentTerm.color, fontWeight: '600', fontSize: '14px' }}>
            Currently in {currentTerm.term} ({currentTerm.start} — {currentTerm.end})
          </span>
        </div>
      )}

      {/* ─── Academic Terms ─────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '25px' }}>
        <div className="card-header">📚 Academic Terms</div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            {terms.map((t, i) => (
              <div
                key={i}
                style={{
                  flex: 1, minWidth: '200px',
                  background: t.color + '10',
                  borderLeft: `4px solid ${t.color}`,
                  borderRadius: '8px', padding: '20px'
                }}
              >
                <div style={{
                  fontSize: '13px', color: t.color,
                  fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: '1px', marginBottom: '10px'
                }}>
                  {t.term}
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
                  {t.start} — {t.end}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                  Teaching & Learning Period
                </div>
              </div>
            ))}
          </div>

          {/* ─── Visual Timeline ─────────────────────────────── */}
          <div style={{ marginTop: '25px', padding: '20px 0' }}>
            <div style={{
              height: '8px', background: '#e0e0e0',
              borderRadius: '4px', position: 'relative'
            }}>
              {/* Term 1 */}
              <div style={{
                position: 'absolute', left: '0%', width: '33%',
                height: '100%', background: '#1a73e8',
                borderRadius: '4px 0 0 4px'
              }} />
              {/* Term 2 */}
              <div style={{
                position: 'absolute', left: '33%', width: '34%',
                height: '100%', background: '#0d904f'
              }} />
              {/* Term 3 */}
              <div style={{
                position: 'absolute', left: '67%', width: '33%',
                height: '100%', background: '#f9ab00',
                borderRadius: '0 4px 4px 0'
              }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginTop: '10px', fontSize: '12px', color: '#666'
            }}>
              <span>Feb</span>
              <span>May</span>
              <span>Sep</span>
              <span>Dec</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Public Holidays ────────────────────────────────── */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🇺🇬 Uganda Public Holidays</span>
          <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666' }}>
            {UGANDA_HOLIDAYS.length} holidays
          </span>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <table className="data-table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Date</th>
                <th>Holiday</th>
                <th style={{ width: '120px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {UGANDA_HOLIDAYS.map((h, i) => {
                const past = isHolidayPast(h.date);
                return (
                  <tr key={i} style={{ opacity: past ? 0.6 : 1 }}>
                    <td style={{
                      fontWeight: '600', color: '#1a73e8',
                      whiteSpace: 'nowrap'
                    }}>
                      {formatHolidayDate(h.date)}
                    </td>
                    <td>
                      {!past && (
                        <span style={{
                          display: 'inline-block', width: '8px',
                          height: '8px', background: '#d32f2f',
                          borderRadius: '50%', marginRight: '8px'
                        }} />
                      )}
                      {h.name}
                      {h.note && (
                        <span style={{
                          fontSize: '10px', color: '#999',
                          marginLeft: '8px', fontStyle: 'italic'
                        }}>
                          ({h.note})
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: '12px',
                        fontSize: '11px', fontWeight: '600',
                        background: past ? '#f1f3f4' : '#e8f0fe',
                        color: past ? '#999' : '#1a73e8'
                      }}>
                        {past ? 'Passed' : 'Upcoming'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── School Events Placeholder ───────────────────────── */}
      <div className="card" style={{ marginTop: '25px' }}>
        <div className="card-header">🎯 School Events & Important Dates</div>
        <div className="card-body">
          <div style={{
            textAlign: 'center', padding: '30px',
            color: '#666', border: '2px dashed #dadce0', borderRadius: '8px'
          }}>
            <p style={{ fontSize: '36px', margin: '0 0 10px 0' }}>📋</p>
            <p style={{ margin: 0, fontWeight: '600' }}>Add school-specific events in Settings</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#999' }}>
              Opening days, Parents&apos; meetings, Exam periods, Sports days, etc.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Print-only note ─────────────────────────────────── */}
      <div style={{
        marginTop: '20px', textAlign: 'center',
        fontSize: '11px', color: '#999'
      }}>
        📅 Generated by Ssewasswa School ERP V10 — {new Date().toLocaleDateString()}
      </div>
    </div>
  );
}