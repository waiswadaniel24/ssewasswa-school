import React, { useState, useEffect } from 'react';

export default function CoCurricular() {
  const [activities, setActivities] = useState([]);
  const [sports, setSports] = useState([]);
  const [activeTab, setActiveTab] = useState('activities');
  const [form, setForm] = useState({ activity_type: 'Sports', activity_name: '', meeting_day: 'Monday', meeting_time: '16:00', member_count: 0, achievements: '' });
  const [sportForm, setSportForm] = useState({ student_id: '', sport: '', position: '', competition: '', level: 'School', date: '' });
  const [students, setStudents] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetchActivities(); fetchSports(); fetchStudents(); }, []);

  const fetchStudents = async () => {
    const r = await window.electronAPI.queryDatabase("SELECT id, first_name, last_name FROM students WHERE status='Active' ORDER BY first_name");
    if (r.success) setStudents(r.data || []);
  };

  const fetchActivities = async () => {
    const r = await window.electronAPI.queryDatabase("SELECT * FROM cocurricular_activities WHERE status='Active' ORDER BY activity_type, activity_name");
    if (r.success) setActivities(r.data || []);
  };

  const fetchSports = async () => {
    const r = await window.electronAPI.queryDatabase("SELECT sr.*, s.first_name, s.last_name FROM sports_records sr JOIN students s ON sr.student_id=s.id ORDER BY sr.date DESC");
    if (r.success) setSports(r.data || []);
  };

  const handleAddActivity = async (e) => {
    e.preventDefault();
    const r = await window.electronAPI.queryDatabase(
      "INSERT INTO cocurricular_activities (activity_type, activity_name, meeting_day, meeting_time, member_count, achievements) VALUES (?,?,?,?,?,?)",
      [form.activity_type, form.activity_name, form.meeting_day, form.meeting_time, form.member_count, form.achievements]
    );
    if (r.success) { setMsg('Activity added!'); fetchActivities(); setForm({ activity_type: 'Sports', activity_name: '', meeting_day: 'Monday', meeting_time: '16:00', member_count: 0, achievements: '' }); }
    else setMsg('Error: ' + r.error);
  };

  const handleAddSport = async (e) => {
    e.preventDefault();
    const r = await window.electronAPI.queryDatabase(
      "INSERT INTO sports_records (student_id, sport, position, competition, level, date) VALUES (?,?,?,?,?,?)",
      [sportForm.student_id, sportForm.sport, sportForm.position, sportForm.competition, sportForm.level, sportForm.date]
    );
    if (r.success) { setMsg('Sport record added!'); fetchSports(); setSportForm({ student_id: '', sport: '', position: '', competition: '', level: 'School', date: '' }); }
    else setMsg('Error: ' + r.error);
  };

  const getLevelColor = (l) => l === 'National' ? 'badge-success' : l === 'Regional' ? 'badge-primary' : l === 'District' ? 'badge-warning' : 'badge-info';

  return (
    <div className="page-container">
      <h1 className="page-title">Co-Curricular Activities</h1>
      {msg && <p style={{ color: msg.includes('Error') ? 'red' : 'green', marginBottom: 15 }}>{msg}</p>}

      <div className="tabs">
        <button className={'tab ' + (activeTab === 'activities' ? 'active' : '')} onClick={() => setActiveTab('activities')}>Clubs & Societies</button>
        <button className={'tab ' + (activeTab === 'sports' ? 'active' : '')} onClick={() => setActiveTab('sports')}>Sports Records</button>
      </div>

      {activeTab === 'activities' && (
        <>
          <div className="card">
            <div className="card-header">Add Activity</div>
            <div className="card-body">
              <form onSubmit={handleAddActivity}>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select className="form-input" value={form.activity_type} onChange={e => setForm({...form, activity_type: e.target.value})}>
                      <option>Sports</option><option>Club</option><option>MDD</option><option>Debate</option><option>Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Name *</label>
                    <input className="form-input" value={form.activity_name} onChange={e => setForm({...form, activity_name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Meeting Day</label>
                    <select className="form-input" value={form.meeting_day} onChange={e => setForm({...form, meeting_day: e.target.value})}>
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time</label>
                    <input type="time" className="form-input" value={form.meeting_time} onChange={e => setForm({...form, meeting_time: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Members</label>
                    <input type="number" className="form-input" value={form.member_count} onChange={e => setForm({...form, member_count: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Achievements</label>
                    <input className="form-input" value={form.achievements} onChange={e => setForm({...form, achievements: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 30px', marginTop: 10 }}>Add Activity</button>
              </form>
            </div>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-body">
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Type</th><th>Name</th><th>Day</th><th>Time</th><th>Members</th><th>Achievements</th></tr></thead>
                  <tbody>
                    {activities.map((a, i) => (
                      <tr key={i}>
                        <td><span className="badge badge-primary">{a.activity_type}</span></td>
                        <td>{a.activity_name}</td>
                        <td>{a.meeting_day}</td>
                        <td>{a.meeting_time}</td>
                        <td>{a.member_count || 0}</td>
                        <td>{a.achievements || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'sports' && (
        <>
          <div className="card">
            <div className="card-header">Add Sport Record</div>
            <div className="card-body">
              <form onSubmit={handleAddSport}>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label className="form-label">Student *</label>
                    <select className="form-input" value={sportForm.student_id} onChange={e => setSportForm({...sportForm, student_id: e.target.value})} required>
                      <option value="">Select</option>
                      {students.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Sport *</label>
                    <input className="form-input" value={sportForm.sport} onChange={e => setSportForm({...sportForm, sport: e.target.value})} required placeholder="Football, Athletics..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Position</label>
                    <input className="form-input" value={sportForm.position} onChange={e => setSportForm({...sportForm, position: e.target.value})} placeholder="1st, 2nd..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Competition</label>
                    <input className="form-input" value={sportForm.competition} onChange={e => setSportForm({...sportForm, competition: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Level</label>
                    <select className="form-input" value={sportForm.level} onChange={e => setSportForm({...sportForm, level: e.target.value})}>
                      <option>School</option><option>District</option><option>Regional</option><option>National</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={sportForm.date} onChange={e => setSportForm({...sportForm, date: e.target.value})} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '10px 30px', marginTop: 10 }}>Add Record</button>
              </form>
            </div>
          </div>

          <div className="card" style={{ marginTop: 20 }}>
            <div className="card-body">
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Student</th><th>Sport</th><th>Position</th><th>Competition</th><th>Level</th><th>Date</th></tr></thead>
                  <tbody>
                    {sports.map((s, i) => (
                      <tr key={i}>
                        <td>{s.first_name} {s.last_name}</td>
                        <td>{s.sport}</td>
                        <td>{s.position || '-'}</td>
                        <td>{s.competition || '-'}</td>
                        <td><span className={'badge ' + getLevelColor(s.level)}>{s.level}</span></td>
                        <td>{s.date || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}