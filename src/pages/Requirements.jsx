import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

export default function Requirements() {
  var [students, setStudents] = useState([]);
  var [requirements, setRequirements] = useState([]);
  var [newReq, setNewReq] = useState({ name: '', section: 'All' });
  var [records, setRecords] = useState({});
  var [msg, setMsg] = useState('');

  var fetchData = async function() {
    try {
      var sRes = await window.electronAPI.queryDatabase("SELECT id, first_name, last_name, admission_number, student_type FROM students WHERE status = 'Active' ORDER BY first_name");
      if (sRes.success) setStudents(sRes.data);
      
      var rRes = await window.electronAPI.queryDatabase("SELECT value FROM system_settings WHERE key = 'school_requirements'");
      if (rRes.success && rRes.data.length > 0) {
        setRequirements(JSON.parse(rRes.data[0].value));
      }

      var recRes = await window.electronAPI.queryDatabase("SELECT student_id, requirement_name, submitted FROM student_requirements");
      if (recRes.success) {
        var map = {};
        recRes.data.forEach(function(r) { 
          if(!map[r.student_id]) map[r.student_id] = {}; 
          map[r.student_id][r.requirement_name] = r.submitted; 
        });
        setRecords(map);
      }
    } catch(e) { setMsg('Error: ' + e.message); }
  };
  
  useEffect(function() { fetchData(); }, []);

  var addRequirement = async function() {
    if(!newReq.name) return;
    var updated = [...requirements, newReq];
    setRequirements(updated);
    await window.electronAPI.queryDatabase("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('school_requirements', ?)", [JSON.stringify(updated)]);
    setNewReq({name:'', section:'All'});
    setMsg('Requirement added!');
  };

  var deleteRequirement = async function(name) {
    var updated = requirements.filter(function(r) { return r.name !== name; });
    setRequirements(updated);
    await window.electronAPI.queryDatabase("INSERT OR REPLACE INTO system_settings (key, value) VALUES ('school_requirements', ?)", [JSON.stringify(updated)]);
    await window.electronAPI.queryDatabase("DELETE FROM student_requirements WHERE requirement_name=?", [name]);
    fetchData();
  };

  var updateRecord = async function(studentId, reqName, value) {
    // Save text/quantity details as string in 'submitted' column
    await window.electronAPI.queryDatabase("INSERT OR REPLACE INTO student_requirements (student_id, requirement_name, submitted) VALUES (?, ?, ?)", [studentId, reqName, value]);
    setRecords(function(prev) {
      var next = {...prev};
      if(!next[studentId]) next[studentId] = {};
      next[studentId][reqName] = value;
      return next;
    });
  };

  var printForm = function() {
    var doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("School Requirements & Fees Form", 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text("Date: " + new Date().toLocaleDateString(), 14, 30);
    
    var y = 40;
    doc.setFontSize(14);
    doc.text("Requirements Checklist:", 14, y);
    y += 8;
    doc.setFontSize(11);
    
    requirements.forEach(function(r, i) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(i+1 + ". " + r.name + " (" + r.section + ")", 16, y);
      doc.rect(120, y-4, 5, 5); // Checkbox
      y += 8;
    });

    y += 10;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text("Parent/Guardian Declaration:", 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.text("I confirm that the above requirements have been provided:", 14, y);
    y += 15;
    doc.text("Signature: ______________________", 14, y);
    
    doc.save('School_Requirements_Form.pdf');
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Requirements & Tracking Sheet</h1>
      {msg && <p style={{ color: 'green', marginBottom: '15px' }}>{msg}</p>}
      
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Set School Requirements</span>
          <button onClick={printForm} className="btn btn-secondary" style={{ padding: '5px 12px' }}>Print Blank Form</button>
        </div>
        <div className="card-body">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input className="form-input" value={newReq.name} onChange={function(e) { setNewReq({...newReq, name: e.target.value}); }} placeholder="e.g., Medical Form, Books (12)" />
            <select className="form-input" style={{ maxWidth: '200px' }} value={newReq.section} onChange={function(e) { setNewReq({...newReq, section: e.target.value}); }}>
              <option>All</option><option>Day</option><option>Boarding Boys</option><option>Boarding Girls</option>
            </select>
            <button onClick={addRequirement} className="btn btn-primary">Add</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {requirements.map(function(r, i) {
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#e8f0fe', color: '#1a73e8', padding: '5px 15px', borderRadius: '15px', fontSize: '13px', fontWeight: '600' }}>
                  <span>{r.name} ({r.section})</span>
                  <button onClick={function() { deleteRequirement(r.name); }} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Student Requirement Records (Enter Details/Quantity)</div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Adm No</th>
                <th>Student Name</th>
                <th>Section</th>
                {requirements.map(function(r, i) { return <th key={i} style={{ textAlign: 'center', minWidth: '120px' }}>{r.name}</th>; })}
              </tr>
            </thead>
            <tbody>
              {students.map(function(s) {
                return (
                  <tr key={s.id}>
                    <td>{s.admission_number || '-'}</td>
                    <td>{s.first_name} {s.last_name}</td>
                    <td>{s.student_type || 'Day'}</td>
                    {requirements.map(function(r, i) {
                      var val = records[s.id] && records[s.id][r.name] ? records[s.id][r.name] : '';
                      var applies = r.section === 'All' || r.section === s.student_type;
                      return (
                        <td key={i} style={{ textAlign: 'center' }}>
                          {applies ? (
                            <input 
                              type="text" 
                              value={val === 1 ? '' : val} // Clear '1' from old checkbox system
                              placeholder="e.g. 6/12 or Done" 
                              onChange={function(e) { updateRecord(s.id, r.name, e.target.value); }}
                              style={{ width: '90px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'center' }}
                            />
                          ) : (
                            <span style={{ color: '#ccc' }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
