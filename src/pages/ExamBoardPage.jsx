// FileName: src/pages/ExamBoardPage.jsx
// Ssewasswa Comforts — Generic Exam Board Registration Page
// Used for UBTEB, NCHE, Nurses Council, AHPC, Kyambogo
// (UNEB has its own dedicated UNEBRegistration.jsx page)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { EXAM_BOARDS, getExamBoardsForLevel } from '../config/examBoards.js';

const BOARD_INFO = {
  'ubteb-exams': {
    boardKey: 'UBTEB',
    title: 'UBTEB Registration',
    desc: 'Uganda Business and Technical Examinations Board — register candidates for Business, Technical, and Vocational exams.',
    features: [
      'Register candidates for Certificate and Diploma exams',
      'Upload candidate photos and details',
      'Generate registration forms (PDF)',
      'Track exam schedules and results',
      'Print exam entry permits',
    ],
  },
  'nche-accreditation': {
    boardKey: 'NCHE',
    title: 'NCHE Accreditation',
    desc: 'National Council for Higher Education — manage institutional accreditation and program reviews.',
    features: [
      'Track institutional accreditation status',
      'Manage program review submissions',
      'Quality audit checklists',
      'Generate compliance reports',
      'Track accreditation expiry dates',
    ],
  },
  'nurses-council-exams': {
    boardKey: 'NURSES_COUNCIL',
    title: 'Nurses Council Exams',
    desc: 'Nurses Council of Uganda — register candidates for nursing and midwifery certification exams.',
    features: [
      'Register nursing candidates (Cert + Diploma)',
      'Register midwifery candidates',
      'Track clinical hours + logbooks',
      'Generate registration forms',
      'Print exam permits',
    ],
  },
  'ahpc-exams': {
    boardKey: 'AHPC',
    title: 'AHPC Exams',
    desc: 'Allied Health Professionals Council — register candidates for lab tech, pharmacy, radiography exams.',
    features: [
      'Register lab technology candidates',
      'Register pharmacy candidates',
      'Register radiography candidates',
      'Track clinical attachments',
      'Print exam entry permits',
    ],
  },
  'kyambogo-teacher-ed': {
    boardKey: 'KYAMBOGO',
    title: 'Kyambogo Teacher Education',
    desc: 'Kyambogo University — manage teacher education and certification programs.',
    features: [
      'Register teacher training candidates',
      'Track teaching practice placements',
      'Manage PTC (Primary Teachers College) registrations',
      'Generate graduation lists',
      'Print certificates',
    ],
  },
};

export default function ExamBoardPage() {
  const navigate = useNavigate();
  const path = window.location.pathname.split('/').pop();
  const info = BOARD_INFO[path] || BOARD_INFO['ubteb-exams'];
  const board = EXAM_BOARDS[info.boardKey];

  const [candidates, setCandidates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ name: '', regNo: '', program: '' });

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(`erp_${path}_candidates`) || '[]');
      setCandidates(stored);
    } catch {}
  }, [path]);

  const saveCandidates = (updated) => {
    setCandidates(updated);
    localStorage.setItem(`erp_${path}_candidates`, JSON.stringify(updated));
  };

  const addCandidate = () => {
    if (!newCandidate.name.trim()) return;
    const cand = {
      id: Date.now(),
      ...newCandidate,
      board: info.boardKey,
      registeredAt: new Date().toISOString(),
      status: 'pending',
    };
    saveCandidates([cand, ...candidates]);
    setNewCandidate({ name: '', regNo: '', program: '' });
    setShowForm(false);
  };

  const removeCandidate = (id) => saveCandidates(candidates.filter(c => c.id !== id));

  return (
    <div className="page-container">
      <h1 className="page-title">{info.title}</h1>
      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>{info.desc}</p>

      {/* Board info card */}
      {board && (
        <div style={{
          padding: 20, borderRadius: 12, marginBottom: 24,
          background: '#e8f0fe', border: '1px solid #1a73e8',
        }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>BOARD NAME</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a73e8' }}>{board.name}</div>
            </div>
            {board.website && (
              <div>
                <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>WEBSITE</div>
                <a href={board.website} target="_blank" rel="noreferrer" style={{ color: '#1a73e8', fontSize: 14 }}>{board.website}</a>
              </div>
            )}
            {board.registrationRequired && (
              <div>
                <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>REGISTRATION</div>
                <div style={{ fontSize: 14, color: '#0b8043' }}>Required ✓</div>
              </div>
            )}
            {board.apiIntegration !== undefined && (
              <div>
                <div style={{ fontSize: 12, color: '#666', fontWeight: 600 }}>API INTEGRATION</div>
                <div style={{ fontSize: 14, color: board.apiIntegration ? '#0b8043' : '#f9ab00' }}>
                  {board.apiIntegration ? 'Available ✓' : 'Coming soon'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Features list */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, color: '#333', marginBottom: 12 }}>What you can do here:</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
          {info.features.map((f, i) => (
            <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#666' }}>
              <span style={{ color: '#1a73e8', fontWeight: 700 }}>✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Candidate registration */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Registered Candidates ({candidates.length})</h3>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: '8px 16px', background: '#1a73e8', color: 'white',
          border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14,
        }}>+ Add Candidate</button>
      </div>

      {showForm && (
        <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 8, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Candidate name" value={newCandidate.name}
            onChange={e => setNewCandidate({ ...newCandidate, name: e.target.value })}
            style={{ flex: 1, minWidth: 200, padding: 10, border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }} />
          <input placeholder="Registration #" value={newCandidate.regNo}
            onChange={e => setNewCandidate({ ...newCandidate, regNo: e.target.value })}
            style={{ width: 150, padding: 10, border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }} />
          <input placeholder="Program" value={newCandidate.program}
            onChange={e => setNewCandidate({ ...newCandidate, program: e.target.value })}
            style={{ width: 200, padding: 10, border: '1px solid #ccc', borderRadius: 6, fontSize: 14 }} />
          <button onClick={addCandidate} style={{ padding: '10px 20px', background: '#0b8043', color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>Save</button>
        </div>
      )}

      {candidates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666', background: '#f8f9fa', borderRadius: 8 }}>
          <p>No candidates registered yet. Click "Add Candidate" to register your first candidate.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f0f2f5', textAlign: 'left' }}>
              <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Name</th>
              <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Reg #</th>
              <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Program</th>
              <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Status</th>
              <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}>Registered</th>
              <th style={{ padding: 10, borderBottom: '2px solid #ccc' }}></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                <td style={{ padding: 10, fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: 10 }}>{c.regNo || '—'}</td>
                <td style={{ padding: 10 }}>{c.program || '—'}</td>
                <td style={{ padding: 10 }}>
                  <span style={{
                    background: c.status === 'approved' ? '#0b8043' : '#f9ab00',
                    color: 'white', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  }}>{c.status}</span>
                </td>
                <td style={{ padding: 10, color: '#999' }}>{new Date(c.registeredAt).toLocaleDateString()}</td>
                <td style={{ padding: 10 }}>
                  <button onClick={() => removeCandidate(c.id)} style={{ background: 'none', border: 0, color: '#d32f2f', cursor: 'pointer', fontSize: 18 }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
