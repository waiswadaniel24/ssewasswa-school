import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

var UGANDA_DISTRICTS = ['Kampala','Wakiso','Mukono','Mpigi','Masaka','Mityana','Mubende','Buikwe','Bukomansimbi','Butambala','Buvuma','Gomba','Kalangala','Kalungu','Kayunga','Kiboga','Kyankwanzi','Lwengo','Lyantonde','Nakaseke','Nakasongola','Rakai','Ssembabule','Jinja','Mbale','Soroti','Tororo','Iganga','Kamuli','Kumi','Busia','Bugiri','Budaka','Bududa','Bukedea','Bulambuli','Butaleja','Butebo','Kaberamaido','Kaliro','Kapchorwa','Katakwi','Kibuku','Namayingo','Namutumba','Ngora','Pallisa','Serere','Sironko','Mbarara','Kasese','Kabale','Hoima','Masindi','Kisoro','Rukungiri','Ntungamo','Bushenyi','Ibanda','Isingiro','Kabarole','Kamwenge','Kanungu','Kyenjojo','Kiruhura','Kibaale','Kyegegwa','Mitooma','Ntoroko','Rubirizi','Sheema','Gulu','Lira','Kitgum','Pader','Apac','Amolatar','Amuru','Nwoya','Otuke','Oyam','Alebtong','Abim','Agago','Amudat','Lamwo','Napak','Nakapiripirit','Kaabong','Kotido','Arua','Nebbi','Adjumani','Moyo','Yumbe','Koboko','Maracha','Zombo','Other'];

export default function SystemSetup() {
  var navigate = useNavigate();
  var [formData, setFormData] = useState({
    schoolName: '', schoolLevel: 'Primary', genderType: 'Mixed', boardingStatus: 'Day',
    backupEmail: '', secQuestion: "What is your mother's maiden name?", secAnswer: '',
    adminUser: 'admin', adminPass: '', confirmPass: '',
    district: '', county: '', subCounty: '', parish: '', village: '',
    ownerName: '', ownerNin: '', ownerPhone: '',
    headTeacherName: '', headTeacherPhone: '', chairpersonName: '', chairpersonPhone: '',
    phone: '', email: '', postalAddress: '', foundingYear: ''
  });
  var [error, setError] = useState('');
  var [loading, setLoading] = useState(false);

  var handleChange = function(e) { setFormData(function(prev) { var n = {}; for (var k in prev) n[k] = prev[k]; n[e.target.name] = e.target.value; return n; }); };

  var handleSubmit = async function(e) {
    e.preventDefault(); setError('');
    if (!formData.schoolName.trim()) { setError('School Name is required'); return; }
    if (formData.adminPass.length < 8) { setError('Password must be 8+ chars'); return; }
    if (!/[A-Za-z]/.test(formData.adminPass) || !/\d/.test(formData.adminPass)) { setError('Password needs letters AND numbers'); return; }
    if (formData.adminPass !== formData.confirmPass) { setError('Passwords do not match'); return; }
    if (!formData.secAnswer.trim()) { setError('Security answer required'); return; }
    if (!formData.district) { setError('Please select your district'); return; }

    setLoading(true);
    try {
      var schoolCategory = formData.boardingStatus + '_' + formData.genderType;
      var payload = {}; for (var k in formData) payload[k] = formData[k]; payload.schoolCategory = schoolCategory;
      if (!window.electronAPI || typeof window.electronAPI.authSetup !== 'function') {
        setError('Electron not available. Run with start.bat'); setLoading(false); return;
      }
      var res = await window.electronAPI.authSetup(payload);
      setLoading(false);
      if (res && res.success) {
        try { localStorage.removeItem('erp_force_setup'); } catch (e2) { /* no localStorage */ }
        window.location.assign('/login');
      } else { setError((res && res.error) || 'Setup failed'); }
    } catch (err) { setLoading(false); setError(err.message); }
  };

  var ls = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' };
  var is = { width: '100%', padding: '12px', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
  var sd = { borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', fontFamily: "'Segoe UI', sans-serif", padding: '20px 12px' }}>
      <div style={{ background: 'white', width: '100%', maxWidth: '700px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ background: '#1a73e8', padding: '30px', textAlign: 'center', color: 'white' }}>
          <img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa Comforts Technologies logo" style={{ width: '96px', height: '96px', objectFit: 'contain', marginBottom: '10px', filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.2))' }} />
          <div style={{ fontSize: '20px', fontWeight: '800' }}>SSEWASSWA COMFORTS SCHOOL ERP™</div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>School Management SaaS</div>
  <div style={{ fontSize: '11px', opacity: 0.82, marginTop: '8px', letterSpacing: '0.04em' }}>A product of Ssewasswa Comforts Technologies™</div>
        </div>
        <div style={{ padding: '25px', maxHeight: '65vh', overflowY: 'auto' }}>
          <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '20px' }}>System Initialization</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>Fill in all details to set up your school profile.</p>
          {error && (<div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px', border: '1px solid #ef9a9a' }}>{error}</div>)}
          <form onSubmit={handleSubmit}>
            <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>School Information</h4>
            <div style={{ marginBottom: '10px' }}><label style={ls}>School Name *</label><input style={is} type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} placeholder="e.g. St. Peter's Secondary School" required autoFocus /></div>
            <div className="setup-grid setup-grid-3" style={{ gap: '10px', marginBottom: '10px' }}>
              <div><label style={ls}>School Level *</label><select style={is} name="schoolLevel" value={formData.schoolLevel} onChange={handleChange}><option value="Nursery">Nursery</option><option value="Nursery_Primary">Nursery & Primary</option><option value="Primary">Primary</option><option value="Secondary">Secondary (O & A)</option><option value="Primary_Secondary">Primary & Secondary</option><option value="Tertiary">Tertiary / College</option><option value="University">University</option></select></div>
              <div><label style={ls}>Gender Type *</label><select style={is} name="genderType" value={formData.genderType} onChange={handleChange}><option value="Mixed">Mixed (Boys & Girls)</option><option value="Boys">Boys Only</option><option value="Girls">Girls Only</option></select></div>
              <div><label style={ls}>Boarding *</label><select style={is} name="boardingStatus" value={formData.boardingStatus} onChange={handleChange}><option value="Day">Day School</option><option value="Boarding">Boarding School</option><option value="Day_Boarding">Day & Boarding</option></select></div>
            </div>
            <div className="setup-grid setup-grid-2" style={{ gap: '10px', marginBottom: '10px' }}>
              <div><label style={ls}>Founding Year</label><input style={is} type="number" name="foundingYear" value={formData.foundingYear} onChange={handleChange} placeholder="e.g. 1995" /></div>
              <div><label style={ls}>Backup Email</label><input style={is} type="email" name="backupEmail" value={formData.backupEmail} onChange={handleChange} placeholder="gmail@gmail.com" /></div>
            </div>
            <div style={sd}><h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>Location</h4>
              <div className="setup-grid setup-grid-2" style={{ gap: '10px', marginBottom: '10px' }}>
                <div><label style={ls}>District *</label><select style={is} name="district" value={formData.district} onChange={handleChange} required><option value="">-- Select --</option>{UGANDA_DISTRICTS.map(function(d) { return <option key={d} value={d}>{d}</option>; })}</select></div>
                <div><label style={ls}>County</label><input style={is} type="text" name="county" value={formData.county} onChange={handleChange} placeholder="e.g. Kyadondo" /></div>
                <div><label style={ls}>Sub-County</label><input style={is} type="text" name="subCounty" value={formData.subCounty} onChange={handleChange} /></div>
                <div><label style={ls}>Parish</label><input style={is} type="text" name="parish" value={formData.parish} onChange={handleChange} /></div>
                <div><label style={ls}>Village</label><input style={is} type="text" name="village" value={formData.village} onChange={handleChange} /></div>
              </div>
            </div>
            <div style={sd}><h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>Ownership Details</h4>
              <div className="setup-grid setup-grid-3" style={{ gap: '10px', marginBottom: '10px' }}>
                <div><label style={ls}>Owner / Director Name</label><input style={is} type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} /></div>
                <div><label style={ls}>Owner NIN</label><input style={is} type="text" name="ownerNin" value={formData.ownerNin} onChange={handleChange} placeholder="National ID" /></div>
                <div><label style={ls}>Owner Phone</label><input style={is} type="text" name="ownerPhone" value={formData.ownerPhone} onChange={handleChange} placeholder="077X XXX XXX" /></div>
              </div>
            </div>
            <div style={sd}><h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>Leadership & Contacts</h4>
              <div className="setup-grid setup-grid-4" style={{ gap: '10px', marginBottom: '10px' }}>
                <div><label style={ls}>Head Teacher Name</label><input style={is} type="text" name="headTeacherName" value={formData.headTeacherName} onChange={handleChange} /></div>
                <div><label style={ls}>HT Phone</label><input style={is} type="text" name="headTeacherPhone" value={formData.headTeacherPhone} onChange={handleChange} placeholder="077X XXX XXX" /></div>
                <div><label style={ls}>Chairperson Name</label><input style={is} type="text" name="chairpersonName" value={formData.chairpersonName} onChange={handleChange} /></div>
                <div><label style={ls}>CP Phone</label><input style={is} type="text" name="chairpersonPhone" value={formData.chairpersonPhone} onChange={handleChange} placeholder="077X XXX XXX" /></div>
              </div>
              <div className="setup-grid setup-grid-3" style={{ gap: '10px', marginBottom: '10px' }}>
                <div><label style={ls}>School Phone</label><input style={is} type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="0414 XXX XXX" /></div>
                <div><label style={ls}>School Email</label><input style={is} type="email" name="email" value={formData.email} onChange={handleChange} placeholder="school@example.com" /></div>
                <div><label style={ls}>Postal Address</label><input style={is} type="text" name="postalAddress" value={formData.postalAddress} onChange={handleChange} placeholder="P.O. Box XXX" /></div>
              </div>
            </div>
            <div style={sd}><h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>Security & Password Recovery</h4>
              <div style={{ marginBottom: '10px' }}><label style={ls}>Security Question *</label><select style={is} name="secQuestion" value={formData.secQuestion} onChange={handleChange}><option>What is your mother&apos;s maiden name?</option><option>What was the name of your first pet?</option><option>In what city were you born?</option><option>What is the name of your first school?</option></select></div>
              <div style={{ marginBottom: '10px' }}><label style={ls}>Answer *</label><input style={is} type="text" name="secAnswer" value={formData.secAnswer} onChange={handleChange} placeholder="Used to reset your password" required /></div>
            </div>
            <div style={sd}><h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>Super Admin Account</h4>
              <div style={{ marginBottom: '10px' }}><label style={ls}>Admin Username *</label><input style={is} type="text" name="adminUser" value={formData.adminUser} onChange={handleChange} required /></div>
              <div className="setup-grid setup-grid-2" style={{ gap: '10px', marginBottom: '10px' }}>
                <div><label style={ls}>Password *</label><input style={is} type="password" name="adminPass" value={formData.adminPass} onChange={handleChange} placeholder="Min 8 chars, letters + numbers" required /></div>
                <div><label style={ls}>Confirm Password *</label><input style={is} type="password" name="confirmPass" value={formData.confirmPass} onChange={handleChange} required /></div>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#9aa0a6' : '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px', boxShadow: '0 4px 6px rgba(26, 115, 232, 0.3)' }}>
              {loading ? 'Saving Configuration...' : 'Complete Setup & Start System'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
            <p style={{ color: '#666', fontSize: '14px', margin: '0 0 5px 0' }}>Already have an account?</p>
            <button onClick={function() { try { localStorage.removeItem('erp_force_setup'); } catch (e2) { /* no localStorage */ } navigate('/login'); }} style={{ background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>Sign In Here</button>
          </div>
        </div>
      </div>
    </div>
  );
}
