# fix-setup.ps1 — Fix setup, logout, and diagnose Electron
# Run: powershell -ExecutionPolicy Bypass -File fix-setup.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Diagnosing + Fixing Setup Issues" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

 $root = $PSScriptRoot
if (-not $root) { $root = Get-Location }

# ═══════════════════════════════════════════════════════════
# 1. DIAGNOSE: Check main.js for syntax errors
# ═══════════════════════════════════════════════════════════
Write-Host "[1/5] Checking main.js for syntax errors..." -ForegroundColor Yellow

 $mainPath = "$root\electron\main.js"
 $preloadPath = "$root\electron\preload.js"

# Check main.js syntax
if (Test-Path $mainPath) {
    Write-Host "  Checking main.js syntax..." -ForegroundColor Gray
    $result = node -c $mainPath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  main.js: NO SYNTAX ERRORS" -ForegroundColor Green
    } else {
        Write-Host "  main.js: SYNTAX ERROR FOUND!" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        
        # Try to fix common issues
        $content = Get-Content $mainPath -Raw -Encoding UTF8
        
        # Fix: If there are duplicate closing braces at the end
        $content = $content -replace "(?s)\};\s*\n\s*\};\s*$", "};`n"
        
        # Fix: If the developer backdoor was inserted incorrectly
        $content = $content -replace "(?s)// ═+.*?DEVELOPER BACKDOOR.*?// ═+ END DEVELOPER BACKDOOR.*?═+\s*\n", ""
        
        # Fix: If auth-login was modified incorrectly, restore it
        if ($content -match "isDeveloperLogin") {
            # Remove the developer backdoor code and restore clean auth-login
            $content = $content -replace "(?s)// ═+.*?DEVELOPER BACKDOOR.*?// ═+ END DEVELOPER BACKDOOR.*?═+\s*\n", ""
            $content = $content -replace "(?s)// DEVELOPER BACKDOOR.*?// END DEVELOPER BACKDOOR.*?\n", ""
            
            # Restore clean auth-login handler
            $content = $content -replace "(?s)ipcMain\.handle\('auth-login'.*?return \{ success: false, error: e\.message \};\s*\}\);", "ipcMain.handle('auth-login', async (e, c) => {`n    if (!db) return { success: false, error: 'DATABASE FAILED TO LOAD' };`n    if (!bcrypt) return { success: false, error: 'BCRYPTJS MODULE MISSING' };`n    try {`n        var stmt = db.prepare('SELECT * FROM users WHERE username = ?'); stmt.bind([c.username]);`n        if (stmt.step()) {`n            var u = stmt.getAsObject(); stmt.free();`n            if (bcrypt.compareSync(c.password, u.password)) {`n                db.run('UPDATE users SET last_login = datetime(now()) WHERE id = ?', [u.id]);`n                saveDb();`n                return { success: true, user: { id: u.id, username: u.username, role: u.role, permissions: u.permissions } };`n            }`n            return { success: false, error: 'Invalid password' };`n        }`n        stmt.free();`n        return { success: false, error: 'User not found' };`n    } catch (e) { return { success: false, error: e.message }; }`n});"
        }
        
        # Fix empty catch blocks
        $content = $content -replace 'catch\s*\(\s*e\s*\)\s*\{\s*\}', 'catch (e) { /* handled */ }'
        $content = $content -replace 'catch\s*\(\s*err\s*\)\s*\{\s*\}', 'catch (err) { /* handled */ }'
        
        # Remove any orphan code after the last };
        $lastIdx = $content.LastIndexOf("});")
        if ($lastIdx -ge 0) {
            $content = $content.Substring(0, $lastIdx + 3) + "`n"
        }
        
        Set-Content -Path $mainPath -Value $content -Encoding UTF8 -Force
        
        # Re-check
        $result2 = node -c $mainPath 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  main.js: FIXED — no more syntax errors" -ForegroundColor Green
        } else {
            Write-Host "  main.js: Still has errors. Manual fix needed." -ForegroundColor Red
            Write-Host "  Remaining error: $result2" -ForegroundColor Red
        }
    }
} else {
    Write-Host "  main.js not found!" -ForegroundColor Red
}

# Check preload.js syntax
if (Test-Path $preloadPath) {
    Write-Host "  Checking preload.js syntax..." -ForegroundColor Gray
    $result = node -c $preloadPath 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  preload.js: NO SYNTAX ERRORS" -ForegroundColor Green
    } else {
        Write-Host "  preload.js: SYNTAX ERROR!" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        # Fix empty blocks
        $content = Get-Content $preloadPath -Raw -Encoding UTF8
        $content = $content -replace 'catch\s*\(\s*\w+\s*\)\s*\{\s*\}', 'catch (e) { /* handled */ }'
        Set-Content -Path $preloadPath -Value $content -Encoding UTF8 -Force
        $result2 = node -c $preloadPath 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  preload.js: FIXED" -ForegroundColor Green
        }
    }
}

# Check all .js files in electron/
Write-Host "  Checking all electron/ .js files..." -ForegroundColor Gray
 $jsFiles = Get-ChildItem -Path "$root\electron" -Filter "*.js" -ErrorAction SilentlyContinue
foreach ($file in $jsFiles) {
    $result = node -c $file.FullName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "    ERROR in $($file.Name): $result" -ForegroundColor Red
    }
}


# ═══════════════════════════════════════════════════════════
# 2. FIX AuthContext — clear forceSetup on logout
# ═══════════════════════════════════════════════════════════
Write-Host "[2/5] Fixing logout issue (forceSetup)..." -ForegroundColor Yellow

 $authPath = "$root\src\context\AuthContext.jsx"
if (Test-Path $authPath) {
    $content = Get-Content $authPath -Raw -Encoding UTF8
    
    # Fix logout to also clear forceSetup flag
    if ($content -notmatch "erp_force_setup") {
        $content = $content -replace "(var logout = function\(\) \{", "`$1`n        try { localStorage.removeItem('erp_force_setup'); } catch (e) { /* no localStorage */ }"
    }
    
    Set-Content -Path $authPath -Value $content -Encoding UTF8 -Force
    Write-Host "  AuthContext: logout clears forceSetup" -ForegroundColor Green
}


# ═══════════════════════════════════════════════════════════
# 3. FIX main.jsx — clear forceSetup after setup completes
# ═══════════════════════════════════════════════════════════
Write-Host "[3/5] Fixing main.jsx forceSetup clearing..." -ForegroundColor Yellow

 $mainJsxPath = "$root\src\main.jsx"
if (Test-Path $mainJsxPath) {
    $content = Get-Content $mainJsxPath -Raw -Encoding UTF8
    
    # After setup is complete (user is created), clear the forceSetup flag
    if ($content -match "forceSetup" -and $content -notmatch "removeItem.*force_setup.*after") {
        # Add code to clear forceSetup when user is found
        $content = $content -replace "(if \(hasUser\) \{)", "`$1`n        // Clear forceSetup flag since system is now initialized`n        try { localStorage.removeItem('erp_force_setup'); } catch (e) { /* no localStorage */ }"
    }
    
    Set-Content -Path $mainJsxPath -Value $content -Encoding UTF8 -Force
    Write-Host "  main.jsx: forceSetup cleared after init" -ForegroundColor Green
}


# ═══════════════════════════════════════════════════════════
# 4. CREATE enhanced SystemSetup.jsx with ALL fields
# ═══════════════════════════════════════════════════════════
Write-Host "[4/5] Creating enhanced SystemSetup.jsx..." -ForegroundColor Yellow

 $setupContent = @'
import React, { useState } from 'react';

var UGANDA_DISTRICTS = ['Kampala','Wakiso','Mukono','Mpigi','Masaka','Mityana','Mubende','Jinja','Mbale','Soroti','Tororo','Iganga','Kamuli','Kumi','Busia','Bugiri','Mbarara','Kasese','Kabale','Hoima','Masindi','Kisoro','Rukungiri','Ntungamo','Bushenyi','Lira','Gulu','Kitgum','Pader','Apac','Arua','Nebbi','Adjumani','Moyo','Yumbe','Koboko','Maracha','Zombo','Kaabong','Kotido','Abim','Napak','Nakapiripirit','Amudat','Amuru','Nwoya','Amolatar','Dokolo','Alebtong','Otuke','Oyam','Kole','Agago','Lamwo','Kalongo','Budaka','Bududa','Bukedea','Bulambuli','Butaleja','Butebo','Buikwe','Bukomansimbi','Butambala','Buvuma','Gomba','Kalangala','Kalungu','Kayunga','Kiboga','Kyankwanzi','Lwengo','Lyantonde','Nakaseke','Nakasongola','Rakai','Ssembabule','Budaka','Namayingo','Namutumba','Ngora','Pallisa','Serere','Sironko','Kaberamaido','Kaliro','Kapchorwa','Katakwi','Kibuku','Ibanda','Isingiro','Kabarole','Kamwenge','Kanungu','Kyenjojo','Kiruhura','Kibaale','Kyegegwa','Mitooma','Ntoroko','Rubirizi','Sheema','Other'];

export default function SystemSetup() {
  var [formData, setFormData] = useState({
    schoolName: '', schoolLevel: 'Primary', genderType: 'Mixed', boardingStatus: 'Day',
    backupEmail: '', secQuestion: "What is your mother's maiden name?", secAnswer: '',
    adminUser: 'admin', adminPass: '', confirmPass: '',
    // Location
    district: '', county: '', subCounty: '', parish: '', village: '',
    // Ownership
    ownerName: '', ownerNin: '', ownerPhone: '',
    // Leadership
    headTeacherName: '', headTeacherPhone: '', chairpersonName: '', chairpersonPhone: '',
    // Contact
    phone: '', email: '', postalAddress: ''
  });
  var [error, setError] = useState('');
  var [loading, setLoading] = useState(false);

  var handleChange = function(e) { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  var handleSubmit = async function(e) {
    e.preventDefault();
    setError('');

    if (!formData.schoolName.trim()) return setError('School Name is required');
    if (formData.adminPass.length < 8) return setError('Password must be at least 8 characters');
    if (!/[A-Za-z]/.test(formData.adminPass) || !/\d/.test(formData.adminPass)) return setError('Password must include letters AND numbers');
    if (formData.adminPass !== formData.confirmPass) return setError('Passwords do not match');
    if (!formData.secAnswer.trim()) return setError('Security answer is required');
    if (!formData.district) return setError('Please select your district');

    setLoading(true);

    try {
      var schoolCategory = formData.boardingStatus + '_' + formData.genderType;
      var payload = { ...formData, schoolCategory: schoolCategory };

      if (!window.electronAPI || typeof window.electronAPI.authSetup !== 'function') {
        throw new Error('Electron API not available. Make sure the app is running in Electron mode (npm run dev), not just in browser.');
      }

      var res = await window.electronAPI.authSetup(payload);

      if (res && res.success) {
        // After setup, save the extended profile to school_registration
        try {
          await window.electronAPI.emisSaveSchoolProfile({
            school_name: formData.schoolName,
            district_name: formData.district,
            county_name: formData.county,
            sub_county_name: formData.subCounty,
            parish_name: formData.parish,
            village: formData.village,
            head_teacher_name: formData.headTeacherName,
            head_teacher_phone: formData.headTeacherPhone,
            chairperson_name: formData.chairpersonName,
            chairperson_phone: formData.chairpersonPhone,
            phone: formData.phone,
            email: formData.email,
            postal_address: formData.postalAddress
          });
        } catch (profileErr) {
          console.log('Profile save warning:', profileErr.message);
        }

        // Clear forceSetup flag
        try { localStorage.removeItem('erp_force_setup'); } catch (e) { /* no localStorage */ }

        window.location.hash = '#/login';
        window.location.reload();
      } else {
        setError((res && res.error) || 'Setup failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  var labelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#444', marginBottom: '6px' };
  var inputStyle = { width: '100%', padding: '12px', border: '1px solid #dadce0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' };
  var sectionDivider = { borderTop: '1px solid #eee', paddingTop: '15px', marginTop: '15px' };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: "'Segoe UI', Tahoma, sans-serif", padding: '20px' }}>
      <div style={{ background: 'white', width: '100%', maxWidth: '700px', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', overflow: 'hidden' }}>

        <div style={{ background: '#1a73e8', padding: '25px', textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '1px' }}>SSEWASSWA ERP</div>
          <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '4px' }}>School Management System</div>
        </div>

        <div style={{ padding: '25px', maxHeight: '70vh', overflowY: 'auto' }}>
          <h2 style={{ margin: '0 0 5px 0', color: '#333', fontSize: '20px' }}>System Initialization</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '15px' }}>Fill in all details to set up your school profile.</p>

          {error && (
            <div style={{ background: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', marginBottom: '15px', fontSize: '14px', border: '1px solid #ef9a9a' }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ─── SCHOOL DETAILS ─── */}
            <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>School Information</h4>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>School Name *</label>
              <input style={inputStyle} type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} placeholder="e.g. St. Peter's Secondary School" required autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>School Level *</label>
                <select style={inputStyle} name="schoolLevel" value={formData.schoolLevel} onChange={handleChange}>
                  <option value="Nursery">Nursery</option>
                  <option value="Nursery_Primary">Nursery & Primary</option>
                  <option value="Primary">Primary</option>
                  <option value="Secondary">Secondary (O & A Level)</option>
                  <option value="Primary_Secondary">Primary & Secondary</option>
                  <option value="Tertiary">Tertiary / College</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Gender Type *</label>
                <select style={inputStyle} name="genderType" value={formData.genderType} onChange={handleChange}>
                  <option value="Mixed">Mixed (Boys & Girls)</option>
                  <option value="Boys">Boys Only</option>
                  <option value="Girls">Girls Only</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Boarding *</label>
                <select style={inputStyle} name="boardingStatus" value={formData.boardingStatus} onChange={handleChange}>
                  <option value="Day">Day School</option>
                  <option value="Boarding">Boarding School</option>
                  <option value="Day_Boarding">Day & Boarding</option>
                </select>
              </div>
            </div>

            {/* ─── LOCATION ─── */}
            <div style={sectionDivider}>
              <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>Location Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>District *</label>
                  <select style={inputStyle} name="district" value={formData.district} onChange={handleChange} required>
                    <option value="">-- Select District --</option>
                    {UGANDA_DISTRICTS.map(function(d) { return <option key={d} value={d}>{d}</option>; })}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>County</label>
                  <input style={inputStyle} type="text" name="county" value={formData.county} onChange={handleChange} placeholder="e.g. Kyadondo" />
                </div>
                <div>
                  <label style={labelStyle}>Sub-County</label>
                  <input style={inputStyle} type="text" name="subCounty" value={formData.subCounty} onChange={handleChange} placeholder="e.g. Nakawa" />
                </div>
                <div>
                  <label style={labelStyle}>Parish</label>
                  <input style={inputStyle} type="text" name="parish" value={formData.parish} onChange={handleChange} placeholder="e.g. Kira" />
                </div>
                <div>
                  <label style={labelStyle}>Village</label>
                  <input style={inputStyle} type="text" name="village" value={formData.village} onChange={handleChange} placeholder="e.g. Kira Town" />
                </div>
              </div>
            </div>

            {/* ─── OWNERSHIP ─── */}
            <div style={sectionDivider}>
              <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>Ownership Details</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>Owner Name</label>
                  <input style={inputStyle} type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} placeholder="School owner/director" />
                </div>
                <div>
                  <label style={labelStyle}>Owner NIN</label>
                  <input style={inputStyle} type="text" name="ownerNin" value={formData.ownerNin} onChange={handleChange} placeholder="National ID Number" />
                </div>
                <div>
                  <label style={labelStyle}>Owner Phone</label>
                  <input style={inputStyle} type="text" name="ownerPhone" value={formData.ownerPhone} onChange={handleChange} placeholder="077X XXX XXX" />
                </div>
              </div>
            </div>

            {/* ─── LEADERSHIP ─── */}
            <div style={sectionDivider}>
              <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>Leadership & Contacts</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>Head Teacher Name</label>
                  <input style={inputStyle} type="text" name="headTeacherName" value={formData.headTeacherName} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Head Teacher Phone</label>
                  <input style={inputStyle} type="text" name="headTeacherPhone" value={formData.headTeacherPhone} onChange={handleChange} placeholder="077X XXX XXX" />
                </div>
                <div>
                  <label style={labelStyle}>Chairperson Name</label>
                  <input style={inputStyle} type="text" name="chairpersonName" value={formData.chairpersonName} onChange={handleChange} />
                </div>
                <div>
                  <label style={labelStyle}>Chairperson Phone</label>
                  <input style={inputStyle} type="text" name="chairpersonPhone" value={formData.chairpersonPhone} onChange={handleChange} placeholder="077X XXX XXX" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>School Phone</label>
                  <input style={inputStyle} type="text" name="phone" value={formData.phone} onChange={handleChange} placeholder="0414 XXX XXX" />
                </div>
                <div>
                  <label style={labelStyle}>School Email</label>
                  <input style={inputStyle} type="email" name="email" value={formData.email} onChange={handleChange} placeholder="school@example.com" />
                </div>
                <div>
                  <label style={labelStyle}>Backup Email</label>
                  <input style={inputStyle} type="email" name="backupEmail" value={formData.backupEmail} onChange={handleChange} placeholder="gmail@gmail.com" />
                </div>
              </div>
            </div>

            {/* ─── SECURITY ─── */}
            <div style={sectionDivider}>
              <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>Security & Password Recovery</h4>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Security Question *</label>
                <select style={inputStyle} name="secQuestion" value={formData.secQuestion} onChange={handleChange}>
                  <option>What is your mother's maiden name?</option>
                  <option>What was the name of your first pet?</option>
                  <option>In what city were you born?</option>
                  <option>What is the name of your first school?</option>
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Answer *</label>
                <input style={inputStyle} type="text" name="secAnswer" value={formData.secAnswer} onChange={handleChange} required />
              </div>
            </div>

            {/* ─── ADMIN ACCOUNT ─── */}
            <div style={sectionDivider}>
              <h4 style={{ color: '#1a73e8', marginBottom: '10px' }}>Super Admin Account</h4>
              <div style={{ marginBottom: '10px' }}>
                <label style={labelStyle}>Admin Username *</label>
                <input style={inputStyle} type="text" name="adminUser" value={formData.adminUser} onChange={handleChange} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={labelStyle}>Password *</label>
                  <input style={inputStyle} type="password" name="adminPass" value={formData.adminPass} onChange={handleChange} placeholder="Min 8 chars, letters + numbers" required />
                </div>
                <div>
                  <label style={labelStyle}>Confirm Password *</label>
                  <input style={inputStyle} type="password" name="confirmPass" value={formData.confirmPass} onChange={handleChange} required />
                </div>
              </div>
              <div style={{ padding: '8px 12px', background: '#e8f0fe', borderRadius: '6px', fontSize: '12px', color: '#1a73e8', marginBottom: '10px' }}>
                Password must be at least 8 characters and include both letters and numbers.
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px',
              background: loading ? '#9aa0a6' : '#1a73e8',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '10px', boxShadow: '0 4px 6px rgba(26, 115, 232, 0.3)'
            }}>
              {loading ? 'Saving Configuration...' : 'Complete Setup & Start System'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
'@

Set-Content -Path "$root\src\pages\SystemSetup.jsx" -Value $setupContent -Encoding UTF8 -Force
Write-Host "  SystemSetup.jsx created with ALL fields" -ForegroundColor Green
Write-Host "  (School info, Location with district dropdown, Ownership, Leadership, Security, Admin)" -ForegroundColor Gray


# ═══════════════════════════════════════════════════════════
# 5. ADD developer backdoor to main.js (clean version)
# ═══════════════════════════════════════════════════════════
Write-Host "[5/5] Adding developer backdoor to main.js..." -ForegroundColor Yellow

if (Test-Path $mainPath) {
    $content = Get-Content $mainPath -Raw -Encoding UTF8
    
    # Re-check syntax
    $checkResult = node -c $mainPath 2>&1
    if ($LASTEXITCODE -eq 0) {
        # main.js is clean — now safely add developer backdoor
        if ($content -notmatch "A\.S\.S") {
            # Find the auth-login handler
            $loginMatch = "ipcMain.handle('auth-login', async (e, c) => {"
            
            if ($content -match [regex]::Escape($loginMatch)) {
                # Insert developer check at the start of auth-login
                $devCode = @'
    // DEVELOPER BACKDOOR — A.S.S / esau2001%2001
    if (c && c.username === 'A.S.S' && c.password === 'esau2001%2001') {
        try {
            var devRows = [];
            try { devRows = safeQuery("SELECT * FROM users WHERE username = ?", ['A.S.S']); } catch (devE) { /* table might not exist */ }
            if (!devRows || devRows.length === 0) {
                db.run("INSERT INTO users (username, password, role, permissions) VALUES (?, ?, 'Super Admin', '*')",
                    ['A.S.S', bcrypt.hashSync('esau2001%2001', 10)]);
                saveDb();
                devRows = safeQuery("SELECT * FROM users WHERE username = ?", ['A.S.S']);
            }
            if (devRows && devRows.length > 0) {
                var devUser = devRows[0];
                db.run("UPDATE users SET last_login = datetime('now') WHERE id = ?", [devUser.id]);
                saveDb();
                return { success: true, user: { id: devUser.id, username: 'A.S.S', role: 'Super Admin', permissions: '*', isDeveloper: true } };
            }
        } catch (devErr) {
            console.error('Developer login error:', devErr.message);
        }
    }
    // END DEVELOPER BACKDOOR
'@
                $content = $content.Replace($loginMatch, $loginMatch + "`n" + $devCode)
                
                # Also prevent A.S.S registration in auth-setup
                $setupMatch = "if (!d || !d.adminUser"
                if ($content -match [regex]::Escape($setupMatch)) {
                    $content = $content.Replace($setupMatch, "if (d.adminUser === 'A.S.S') { return { success: false, error: 'This username is reserved for the developer' }; }`n    " + $setupMatch)
                }
                
                Set-Content -Path $mainPath -Value $content -Encoding UTF8 -Force
                
                # Final syntax check
                $finalCheck = node -c $mainPath 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  Developer backdoor added — main.js syntax OK" -ForegroundColor Green
                } else {
                    Write-Host "  ERROR: Developer backdoor caused syntax error — reverting" -ForegroundColor Red
                    Write-Host "  $finalCheck" -ForegroundColor Red
                    # Revert by removing the developer code
                    $content = Get-Content $mainPath -Raw -Encoding UTF8
                    $content = $content -replace "(?s)// DEVELOPER BACKDOOR.*?// END DEVELOPER BACKDOOR\s*\n", ""
                    $content = $content -replace "if \(d\.adminUser === 'A\.S\.S'\) \{ return \{ success: false, error: 'This username is reserved for the developer' \}; \}\s*\n", ""
                    Set-Content -Path $mainPath -Value $content -Encoding UTF8 -Force
                    Write-Host "  Reverted — developer backdoor removed to prevent crashes" -ForegroundColor Yellow
                    Write-Host "  The developer login will work after you fix the remaining syntax errors manually" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  auth-login handler not found in main.js" -ForegroundColor Red
            }
        } else {
            Write-Host "  Developer backdoor already in main.js" -ForegroundColor DarkGray
        }
    } else {
        Write-Host "  main.js still has syntax errors — cannot add developer backdoor" -ForegroundColor Red
        Write-Host "  Run: node -c electron/main.js to see the error" -ForegroundColor Yellow
    }
}


# ═══════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DONE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "What was fixed:" -ForegroundColor White
Write-Host "  1. Checked main.js + preload.js for syntax errors" -ForegroundColor Gray
Write-Host "  2. AuthContext: logout now clears forceSetup flag" -ForegroundColor Gray
Write-Host "  3. main.jsx: forceSetup cleared after setup" -ForegroundColor Gray
Write-Host "  4. SystemSetup.jsx: Full form with:" -ForegroundColor Gray
Write-Host "     - School info (name, level, type, gender, boarding)" -ForegroundColor Gray
Write-Host "     - Location (district DROPDOWN, county, sub-county, parish, village)" -ForegroundColor Gray
Write-Host "     - Ownership (owner name, NIN, phone)" -ForegroundColor Gray
Write-Host "     - Leadership (head teacher, chairperson)" -ForegroundColor Gray
Write-Host "     - Contact (phone, email, backup email)" -ForegroundColor Gray
Write-Host "     - Security (question, answer)" -ForegroundColor Gray
Write-Host "     - Admin account (username, password)" -ForegroundColor Gray
Write-Host "  5. Developer backdoor (if main.js is clean)" -ForegroundColor Gray
Write-Host ""
Write-Host "Developer Login:" -ForegroundColor Yellow
Write-Host "  Username: A.S.S" -ForegroundColor White
Write-Host "  Password: esau2001%2001" -ForegroundColor White
Write-Host ""
Write-Host "IMPORTANT: If you still see 'Electron not available':" -ForegroundColor Yellow
Write-Host "  1. Run: node -c electron/main.js" -ForegroundColor White
Write-Host "  2. If there's a syntax error, paste it here" -ForegroundColor White
Write-Host "  3. Make sure you're running 'npm run dev' (not just 'vite')" -ForegroundColor White
Write-Host ""
Write-Host "Now run: npm run dev" -ForegroundColor Yellow