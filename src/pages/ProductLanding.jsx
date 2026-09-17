import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const features = [
  ['Student intelligence', 'Admissions, profiles, attendance, health, history, IDs and parent-ready records.'],
  ['Academic control', 'Classes, subjects, exams, marks, report cards, promotion and UNEB-ready workflows.'],
  ['Finance made clear', 'Fees, receipts, balances, payments, accounting, payroll, purchases and reports.'],
  ['Built for real schools', 'Library, transport, canteen, gatebook, communications, staff and daily operations.'],
];

export default function ProductLanding() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();

  useEffect(() => {
    if (authReady && user?.isDeveloper) navigate('/dev', { replace: true });
  }, [authReady, navigate, user?.isDeveloper]);

  if (!authReady) return <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', display: 'grid', placeItems: 'center', fontFamily: "'Segoe UI', sans-serif" }}>Checking your developer access…</main>;

  const continueAction = user?.isDeveloper ? 'Continue to Developer Tools' : 'Set up your school';

  return (
    <main style={{ minHeight: '100vh', background: '#071b2f', color: '#f7fbff', fontFamily: "'Segoe UI', sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 88px' }}>
        <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <img src="/ssewasswa-comforts-school-erp-mark.png" alt="Ssewasswa Comforts School ERP" style={{ width: 46, height: 46, objectFit: 'contain' }} />
            <div><strong style={{ letterSpacing: '.06em' }}>SSEWASSWA COMFORTS</strong><div style={{ color: '#8fb3c9', fontSize: 12 }}>School ERP</div></div>
          </div>
          <button onClick={() => navigate('/login')} style={{ background: 'transparent', color: '#fff', border: '1px solid #45657b', borderRadius: 999, padding: '11px 18px', cursor: 'pointer' }}>Sign in</button>
        </nav>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, .8fr)', gap: 56, alignItems: 'center', paddingTop: 86 }}>
          <div>
            <div style={{ color: '#61d3a5', fontWeight: 700, letterSpacing: '.12em', fontSize: 12, textTransform: 'uppercase' }}>A product of Ssewasswa Comforts Technologies</div>
            <h1 style={{ fontSize: 'clamp(42px, 7vw, 76px)', lineHeight: .98, margin: '18px 0 24px', letterSpacing: '-.055em' }}>Run your school with confidence.</h1>
            <p style={{ color: '#b5c9d7', fontSize: 19, lineHeight: 1.65, maxWidth: 650, margin: 0 }}>One calm, connected workspace for school leaders, teachers, bursars, administrators and families—online when connected, ready for daily work offline.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 32 }}>
              <button onClick={() => navigate(user?.isDeveloper ? '/dev' : '/setup')} style={{ background: '#61d3a5', color: '#062218', border: 0, borderRadius: 10, padding: '15px 22px', fontWeight: 800, cursor: 'pointer' }}>{continueAction}</button>
              <button onClick={() => navigate('/login')} style={{ background: '#13334c', color: '#fff', border: '1px solid #315570', borderRadius: 10, padding: '15px 22px', fontWeight: 700, cursor: 'pointer' }}>Access your account</button>
            </div>
            <p style={{ color: '#7fa0b5', fontSize: 13, marginTop: 18 }}>Your account connects approved computers to the same school workspace. No repeated licence key entry for connected devices.</p>
          </div>
          <div style={{ background: 'linear-gradient(145deg, #123c55, #0c273d)', border: '1px solid #315872', borderRadius: 24, padding: 26, boxShadow: '0 28px 80px rgba(0,0,0,.25)' }}>
            <div style={{ color: '#8fb3c9', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.1em' }}>One school view</div>
            <div style={{ fontSize: 44, fontWeight: 800, margin: '18px 0 8px' }}>360°</div>
            <div style={{ color: '#c2d6e2', lineHeight: 1.6 }}>From first admission to final report card, keep the people, records and decisions that matter in one dependable system.</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 24 }}>{['Students', 'Academics', 'Finance', 'Operations'].map(x => <span key={x} style={{ border: '1px solid #43708b', borderRadius: 999, padding: '7px 10px', color: '#b9e8d5', fontSize: 12 }}>{x}</span>)}</div>
          </div>
        </div>
      </section>
      <section style={{ background: '#f5f8fa', color: '#102a3c', padding: '72px 24px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ maxWidth: 620 }}><div style={{ color: '#16865e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.1em', fontSize: 12 }}>Everything in rhythm</div><h2 style={{ fontSize: 'clamp(30px, 5vw, 48px)', letterSpacing: '-.04em', margin: '14px 0' }}>Less chasing. More leading.</h2><p style={{ color: '#587080', fontSize: 17, lineHeight: 1.65 }}>Ssewasswa Comforts School ERP gives every department a shared source of truth without making everyday work feel complicated.</p></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 34 }}>{features.map(([title, text]) => <article key={title} style={{ background: '#fff', border: '1px solid #dce7ed', borderRadius: 16, padding: 22 }}><div style={{ color: '#16865e', fontWeight: 800, fontSize: 14 }}>0{features.indexOf(features.find(f => f[0] === title)) + 1}</div><h3 style={{ margin: '18px 0 8px', fontSize: 19 }}>{title}</h3><p style={{ color: '#617785', lineHeight: 1.6, margin: 0, fontSize: 14 }}>{text}</p></article>)}</div>
        </div>
      </section>
      <footer style={{ maxWidth: 1180, margin: '0 auto', padding: '28px 24px 40px', color: '#8fb3c9', fontSize: 13, display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}><span>Ssewasswa Comforts Technologies™</span><span>SSEWASSWA COMFORTS SCHOOL ERP™</span></footer>
    </main>
  );
}
