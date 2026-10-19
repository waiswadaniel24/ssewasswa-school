// Ssewasswa Comforts — Student Portal (Expanded v2)
// Students look up their profile by admission number and view
// attendance (calendar + monthly bars), marks (with subject-wise
// performance trend chart), assignments (with submission workflow),
// exam schedule, timetable, announcements, library (loans + catalog
// browse with reservations), fees (with downloadable PDF statement)
// and ID card (QR-coded downloadable PDF). All client-side, with
// localStorage persistence under the 'erp_student_' prefix.
//
// Audit fixes applied (v2):
//   • "Download PDF" buttons now generate real jsPDF documents
//     (ID card with QR + fee statement).
//   • Destructive actions (assignment withdraw, reservation cancel)
//     now prompt with window.confirm().
//   • All localStorage.setItem calls wrapped in try/catch with
//     console.warn fallback.
//   • Admission # field has proper <label htmlFor> / <input id>
//     association (id="admissionNoInput").
//   • "Request statement" actually generates a PDF statement
//     instead of an alert.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

// ---------- Theme constants (dark navy + purple) ----------
const NAVY = '#071b2f';
const NAVY_LIGHT = '#0f2a44';
const NAVY_DARK = '#04101c';
const NAVY_CARD = '#0c2440';
const NAVY_BORDER = '#1d3a5c';
const TEXT_PRIMARY = '#e6eef7';
const TEXT_SECONDARY = '#9fb1c8';
const TEXT_MUTED = '#6c829e';
const PURPLE = '#7b1fa2';
const PURPLE_LIGHT = '#3a1149';
const PURPLE_DARK = '#4a148c';
const GREEN = '#0b8043';
const YELLOW = '#f9ab00';
const RED = '#d32f2f';
const BLUE = '#1a73e8';

const SCHOOL_NAME = 'Ssewasswa Comforts Technologies';

// ---------- Storage keys (prefix: erp_student_) ----------
const STORAGE_KEY = 'erp_student_portal_v2';
const RESERVATION_KEY = 'erp_student_library_reservations_v1';
const CATALOG_KEY = 'erp_student_library_catalog_v1';

// ---------- Sample seed student ----------
function seedStudent() {
  // Build November 2026 attendance calendar (skipping weekends)
  const days = [];
  const pattern = ['present', 'present', 'late', 'present', 'absent', 'present', 'present', 'present'];
  for (let d = 1; d <= 22; d++) {
    const dateStr = `2026-11-${String(d).padStart(2, '0')}`;
    const dow = new Date(2026, 10, d).getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) continue;
    days.push({ date: dateStr, status: pattern[(d - 1) % pattern.length] });
  }

  return {
    admissionNo: 'SCT-2026-001',
    name: 'Ssewasswa Junior',
    class: 'S4 Science',
    stream: 'PCM',
    gender: 'Male',
    dob: '2008-04-15',
    house: 'Eagle',
    bloodGroup: 'O+',
    address: 'Plot 12, Kampala Road, Kampala, Uganda',
    photo: null,
    parentName: 'Mr. Comforts Ssewasswa',
    parentPhone: '+256 789 736 737',
    parentEmail: 'parent@ssewasswacomfortstechnologies.com',
    parentRelation: 'Father',
    attendance: {
      totalDays: 220,
      present: 198,
      absent: 14,
      late: 8,
      monthly: [
        { month: 'Jan', present: 22, total: 23 },
        { month: 'Feb', present: 19, total: 20 },
        { month: 'Mar', present: 18, total: 20 },
        { month: 'Apr', present: 16, total: 18 },
        { month: 'May', present: 21, total: 22 },
        { month: 'Jun', present: 20, total: 22 },
        { month: 'Jul', present: 22, total: 22 },
        { month: 'Aug', present: 20, total: 22 },
        { month: 'Sep', present: 20, total: 22 },
        { month: 'Oct', present: 20, total: 22 },
        { month: 'Nov', present: 14, total: 16 },
      ],
      days,
    },
    marks: [
      { subject: 'Mathematics', mark: 87, average: 72, grade: 'A', teacher: 'Mr. Okello', feedback: 'Strong improvement in calculus — keep practicing integration.' },
      { subject: 'Physics', mark: 79, average: 68, grade: 'B+', teacher: 'Ms. Nakato', feedback: 'Solid grasp of mechanics; revise electricity problems.' },
      { subject: 'Chemistry', mark: 74, average: 70, grade: 'B', teacher: 'Mr. Byaruhanga', feedback: 'Improve organic chemistry reaction recall.' },
      { subject: 'Biology', mark: 82, average: 69, grade: 'A-', teacher: 'Mrs. Akello', feedback: 'Excellent on genetics — focus on plant physiology.' },
      { subject: 'English', mark: 76, average: 71, grade: 'B', teacher: 'Ms. Namuli', feedback: 'Good essays; work on grammar precision.' },
      { subject: 'Geography', mark: 71, average: 67, grade: 'B', teacher: 'Mr. Tumusiime', feedback: 'Strengthen map-work skills.' },
      { subject: 'Cre / R.E.', mark: 80, average: 73, grade: 'A-', teacher: 'Pastor Kintu', feedback: 'Thoughtful reflections — well done.' },
    ],
    subjectPerformance: [
      { subject: 'Mathematics', term1: 72, term2: 80, term3: 87 },
      { subject: 'Physics', term1: 70, term2: 75, term3: 79 },
      { subject: 'Chemistry', term1: 68, term2: 71, term3: 74 },
      { subject: 'Biology', term1: 75, term2: 78, term3: 82 },
      { subject: 'English', term1: 72, term2: 74, term3: 76 },
      { subject: 'Geography', term1: 68, term2: 70, term3: 71 },
      { subject: 'Cre / R.E.', term1: 74, term2: 77, term3: 80 },
    ],
    assignments: [
      { id: 1, subject: 'Mathematics', title: 'Calculus Worksheet 4 — Integration by parts', dueDate: '2026-11-20', status: 'pending', submission: null },
      { id: 2, subject: 'Physics', title: 'Lab Report: Ohm\'s Law experiment', dueDate: '2026-11-18', status: 'pending', submission: null },
      { id: 3, subject: 'Chemistry', title: 'Organic chemistry — naming alkanes', dueDate: '2026-11-22', status: 'pending', submission: null },
      { id: 4, subject: 'English', title: 'Essay: Climate change in Uganda (800 words)', dueDate: '2026-11-25', status: 'pending', submission: null },
      { id: 5, subject: 'Biology', title: 'Genetics problem set — Punnett squares', dueDate: '2026-11-15', status: 'graded', submission: { text: 'Completed all 8 Punnett square problems with full working shown. See attached file for diagrams.', fileUrl: 'https://drive.example.com/student/genetics.pdf', submittedAt: '2026-11-12T10:30:00', grade: '18/20', feedback: 'Excellent work — Punnett squares are correctly constructed. Watch notation on dihybrid crosses.' } },
      { id: 6, subject: 'Geography', title: 'Map reading exercise — contour lines', dueDate: '2026-11-12', status: 'submitted', submission: { text: 'Contour line interpretation complete for all 6 cross-sections.', fileUrl: 'https://drive.example.com/student/map-exercise.pdf', submittedAt: '2026-11-10T15:00:00', grade: null, feedback: null } },
    ],
    examSchedule: [
      { id: 1, subject: 'Mathematics Paper 1', date: '2026-11-25', time: '08:00 - 10:00', room: 'Exam Hall A', duration: '2h 00m' },
      { id: 2, subject: 'Physics Paper 1', date: '2026-11-26', time: '08:00 - 10:00', room: 'Exam Hall A', duration: '2h 00m' },
      { id: 3, subject: 'Chemistry Paper 2', date: '2026-11-27', time: '08:00 - 10:00', room: 'Exam Hall B', duration: '2h 00m' },
      { id: 4, subject: 'Biology Paper 1', date: '2026-11-28', time: '08:00 - 10:00', room: 'Exam Hall B', duration: '2h 00m' },
      { id: 5, subject: 'English Paper 1', date: '2026-11-30', time: '11:00 - 13:00', room: 'Exam Hall A', duration: '2h 00m' },
      { id: 6, subject: 'Geography Paper 2', date: '2026-12-01', time: '08:00 - 10:00', room: 'Exam Hall C', duration: '2h 00m' },
      { id: 7, subject: 'Cre / R.E. Paper 1', date: '2026-12-02', time: '08:00 - 10:00', room: 'Exam Hall C', duration: '2h 00m' },
    ],
    timetable: [
      // Mon
      { period: 1, day: 'Mon', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'R12' },
      { period: 2, day: 'Mon', subject: 'Physics', teacher: 'Ms. Nakato', room: 'Lab A' },
      { period: 3, day: 'Mon', subject: 'Chemistry', teacher: 'Mr. Byaruhanga', room: 'Lab B' },
      { period: 4, day: 'Mon', subject: 'English', teacher: 'Ms. Namuli', room: 'R7' },
      { period: 5, day: 'Mon', subject: 'Geography', teacher: 'Mr. Tumusiime', room: 'R5' },
      // Tue
      { period: 1, day: 'Tue', subject: 'Biology', teacher: 'Mrs. Akello', room: 'Lab C' },
      { period: 2, day: 'Tue', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'R12' },
      { period: 3, day: 'Tue', subject: 'Cre / R.E.', teacher: 'Pastor Kintu', room: 'R3' },
      { period: 4, day: 'Tue', subject: 'Physics', teacher: 'Ms. Nakato', room: 'Lab A' },
      { period: 5, day: 'Tue', subject: 'Chemistry', teacher: 'Mr. Byaruhanga', room: 'Lab B' },
      // Wed
      { period: 1, day: 'Wed', subject: 'English', teacher: 'Ms. Namuli', room: 'R7' },
      { period: 2, day: 'Wed', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'R12' },
      { period: 3, day: 'Wed', subject: 'Geography', teacher: 'Mr. Tumusiime', room: 'R5' },
      { period: 4, day: 'Wed', subject: 'Biology', teacher: 'Mrs. Akello', room: 'Lab C' },
      { period: 5, day: 'Wed', subject: 'Physics', teacher: 'Ms. Nakato', room: 'Lab A' },
      // Thu
      { period: 1, day: 'Thu', subject: 'Chemistry', teacher: 'Mr. Byaruhanga', room: 'Lab B' },
      { period: 2, day: 'Thu', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'R12' },
      { period: 3, day: 'Thu', subject: 'English', teacher: 'Ms. Namuli', room: 'R7' },
      { period: 4, day: 'Thu', subject: 'Cre / R.E.', teacher: 'Pastor Kintu', room: 'R3' },
      { period: 5, day: 'Thu', subject: 'Biology', teacher: 'Mrs. Akello', room: 'Lab C' },
      // Fri
      { period: 1, day: 'Fri', subject: 'Physics', teacher: 'Ms. Nakato', room: 'Lab A' },
      { period: 2, day: 'Fri', subject: 'Geography', teacher: 'Mr. Tumusiime', room: 'R5' },
      { period: 3, day: 'Fri', subject: 'Mathematics', teacher: 'Mr. Okello', room: 'R12' },
      { period: 4, day: 'Fri', subject: 'Chemistry', teacher: 'Mr. Byaruhanga', room: 'Lab B' },
      { period: 5, day: 'Fri', subject: 'English', teacher: 'Ms. Namuli', room: 'R7' },
    ],
    announcements: [
      { id: 1, title: 'End of Term 3 Examinations begin 25th November', body: 'All S4 students should report to the examination hall by 8:00 AM sharp. Bring your admission slip, two pens, pencil, mathematical set and calculator.', date: '2026-11-05', author: 'Head Teacher', priority: 'high' },
      { id: 2, title: 'Parent–Teacher Conference — 18th November', body: 'Parents are invited to discuss student progress. Meetings run from 9:00 AM to 1:00 PM in the main hall.', date: '2026-11-03', author: 'Deputy Head', priority: 'medium' },
      { id: 3, title: 'Library books due before break', body: 'All borrowed library books must be returned by 22nd November. Outstanding fines must be cleared to receive report cards.', date: '2026-11-01', author: 'Librarian', priority: 'medium' },
      { id: 4, title: 'Sports Day rescheduled to 19th November', body: 'Inter-house sports day has been moved from the 17th to the 19th. House captains confirm team lists with Mr. Ssemwanga.', date: '2026-10-28', author: 'Sports Master', priority: 'low' },
    ],
    library: [
      { id: 1, book: 'Things Fall Apart — Chinua Achebe', checkout: '2026-10-10', due: '2026-10-24', status: 'returned', fine: 0 },
      { id: 2, book: 'Mathematics for Senior 4 — MK Publishers', checkout: '2026-10-20', due: '2026-11-03', status: 'returned', fine: 0 },
      { id: 3, book: 'The River Between — Ngugi wa Thiong\'o', checkout: '2026-11-01', due: '2026-11-15', status: 'overdue', fine: 2000 },
      { id: 4, book: 'Comprehensive Biology — Oxford', checkout: '2026-11-05', due: '2026-11-19', status: 'borrowed', fine: 0 },
    ],
    fees: {
      openingBalance: 0,
      balance: 250000,
      totalDue: 1850000,
      paid: 1600000,
      currency: 'UGX',
      term: 'Term 3, 2026',
      lastPayment: { date: '2026-09-30', amount: 600000, method: 'Bank deposit — Stanbic', receipt: 'RC-2026-0098' },
      dueDate: '2026-12-15',
      installments: [
        { id: 1, label: 'Term 3 Tuition', amount: 1500000, due: '2026-09-15', status: 'paid', receipt: 'RC-2026-0091' },
        { id: 2, label: 'Lab & Library Fee', amount: 200000, due: '2026-10-15', status: 'paid', receipt: 'RC-2026-0094' },
        { id: 3, label: 'Examination Fee', amount: 100000, due: '2026-11-15', status: 'paid', receipt: 'RC-2026-0097' },
        { id: 4, label: 'Boarding (optional)', amount: 50000, due: '2026-12-15', status: 'pending', receipt: null },
      ],
    },
  };
}

// ---------- Library catalog seed ----------
const CATALOG_SEED = [
  { id: 1, title: 'Things Fall Apart', author: 'Chinua Achebe', isbn: '978-0385474542', available: 3, total: 5 },
  { id: 2, title: 'Mathematics for Senior 4', author: 'MK Publishers', isbn: '978-9970034213', available: 0, total: 8 },
  { id: 3, title: 'The River Between', author: "Ngugi wa Thiong'o", isbn: '978-9966468662', available: 2, total: 4 },
  { id: 4, title: 'Comprehensive Biology', author: 'Oxford University Press', isbn: '978-0199138777', available: 5, total: 6 },
  { id: 5, title: 'Advanced Physics', author: 'Tom Duncan', isbn: '978-0719576637', available: 1, total: 4 },
  { id: 6, title: 'Chemistry in Context', author: 'Graham Hill', isbn: '978-0199150236', available: 4, total: 5 },
  { id: 7, title: 'Understanding Geography', author: 'Peter Stimpson', isbn: '978-1108400004', available: 2, total: 3 },
  { id: 8, title: 'English Grammar in Use', author: 'Raymond Murphy', isbn: '978-1108457794', available: 6, total: 7 },
  { id: 9, title: 'Introduction to Economics', author: 'Andoff', isbn: '978-0077149891', available: 0, total: 2 },
  { id: 10, title: 'African Poetry Anthology', author: 'Various', isbn: '978-9966253691', available: 3, total: 3 },
];

// ---------- Storage helpers (all setItem wrapped in try/catch) ----------
function loadStudents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) { console.warn('loadStudents failed:', e && e.message); }
  const seed = [seedStudent()];
  saveStudents(seed);
  return seed;
}

function saveStudents(list) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  catch (e) { console.warn('saveStudents failed:', e && e.message); }
}

function loadCatalog() {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (e) { console.warn('loadCatalog failed:', e && e.message); }
  saveCatalog(CATALOG_SEED);
  return CATALOG_SEED;
}

function saveCatalog(list) {
  try { localStorage.setItem(CATALOG_KEY, JSON.stringify(list)); }
  catch (e) { console.warn('saveCatalog failed:', e && e.message); }
}

function loadReservations() {
  try {
    const raw = localStorage.getItem(RESERVATION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) { console.warn('loadReservations failed:', e && e.message); }
  return [];
}

function saveReservations(list) {
  try { localStorage.setItem(RESERVATION_KEY, JSON.stringify(list)); }
  catch (e) { console.warn('saveReservations failed:', e && e.message); }
}

// ---------- Small UI helpers ----------
function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}
function fmtMoney(n, currency = 'UGX') {
  if (typeof n !== 'number') return '—';
  return `${currency} ${n.toLocaleString()}`;
}
function gradeColor(grade) {
  if (!grade) return TEXT_MUTED;
  if (grade.startsWith('A')) return GREEN;
  if (grade.startsWith('B')) return BLUE;
  if (grade.startsWith('C')) return YELLOW;
  return RED;
}
function statusColor(status) {
  switch (status) {
    case 'pending': return YELLOW;
    case 'submitted': return BLUE;
    case 'graded': return GREEN;
    case 'present': return GREEN;
    case 'absent': return RED;
    case 'late': return YELLOW;
    case 'paid': return GREEN;
    case 'returned': return GREEN;
    case 'borrowed': return BLUE;
    case 'overdue': return RED;
    default: return TEXT_MUTED;
  }
}

// ---------- QR + PDF helpers ----------

// Render a QR code to a PNG data URL (async — QRCode.toDataURL returns a Promise)
async function makeQrDataUrl(text, opts = {}) {
  try {
    return await QRCode.toDataURL(text, {
      width: 200,
      margin: 1,
      color: { dark: NAVY, light: '#ffffff' },
      ...opts,
    });
  } catch (e) {
    console.warn('QR generation failed:', e && e.message);
    return null;
  }
}

// Generate the student ID card PDF (CR80-size ~85.6×54 mm landscape,
// navy header + purple accent strip + photo placeholder + student
// details + QR code encoding the admission number + parent contact footer).
async function generateIdCardPdf(student) {
  const qr = await makeQrDataUrl(student.admissionNo);
  const doc = new jsPDF({ unit: 'mm', format: [85.6, 54], orientation: 'landscape' });

  // Navy header band (top)
  doc.setFillColor(7, 27, 47); // NAVY
  doc.rect(0, 0, 85.6, 16, 'F');
  // Purple accent strip
  doc.setFillColor(123, 31, 162); // PURPLE
  doc.rect(0, 16, 85.6, 1.5, 'F');
  // White lower body
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 17.5, 85.6, 31.5, 'F');

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(SCHOOL_NAME.toUpperCase(), 4, 6.5);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'normal');
  doc.text('P.O. Box 12024, Kampala, Uganda  •  STUDENT IDENTITY CARD', 4, 10);

  // Photo placeholder
  doc.setDrawColor(123, 31, 162);
  doc.setLineWidth(0.5);
  doc.setFillColor(243, 229, 245);
  doc.roundedRect(4, 21, 18, 22, 1.5, 1.5, 'FD');
  doc.setTextColor(74, 20, 140);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('PHOTO', 13, 33, { align: 'center' });

  // Student details
  doc.setTextColor(7, 27, 47);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(student.name, 25, 25);

  doc.setFontSize(6.5);
  const detail = (label, val, y) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(120, 120, 120);
    doc.text(`${label}:`, 25, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 30);
    doc.text(String(val || '—'), 40, y);
  };
  detail('Adm #', student.admissionNo, 30);
  detail('Class', student.class, 33);
  detail('Stream', student.stream, 36);
  detail('Blood', student.bloodGroup, 39);
  detail('DOB', fmtDate(student.dob), 42);
  detail('House', student.house, 45);

  // QR code (encodes admission #) bottom-right
  if (qr) {
    doc.addImage(qr, 'PNG', 65, 21, 16, 16);
    doc.setFontSize(4.5);
    doc.setTextColor(120, 120, 120);
    doc.text('Scan to verify', 73, 40, { align: 'center' });
  } else {
    doc.setFontSize(5);
    doc.setTextColor(180, 0, 0);
    doc.text('QR unavailable', 73, 30, { align: 'center' });
  }

  // Purple footer band with parent contact + validity
  doc.setFillColor(123, 31, 162);
  doc.rect(0, 44, 85.6, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Parent/Guardian: ${student.parentName}  •  ${student.parentPhone}`, 4, 48);
  doc.setFontSize(4.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Valid until 31 Dec 2026  •  Principal: ____________________`, 4, 52);

  doc.save(`student-id-${student.admissionNo}.pdf`);
}

// Generate the fee statement PDF (A4 portrait). Contains: opening balance,
// total due, total paid, closing balance, term, installments table with
// receipt numbers, last payment receipt #, and a footer note.
function generateFeeStatementPdf(student) {
  const f = student.fees || {};
  const c = f.currency || 'UGX';
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const PW = 210;
  const M = 14;

  // Navy header band
  doc.setFillColor(7, 27, 47);
  doc.rect(0, 0, PW, 30, 'F');
  // Purple accent strip
  doc.setFillColor(123, 31, 162);
  doc.rect(0, 30, PW, 2, 'F');

  // Header text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(SCHOOL_NAME, M, 14);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Official Fee Statement', M, 21);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, PW - M, 21, { align: 'right' });

  // Student info
  let y = 42;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Student Details', M, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const infoRows = [
    `Name: ${student.name}`,
    `Admission #: ${student.admissionNo}`,
    `Class: ${student.class}  •  Stream: ${student.stream}`,
    `Term: ${f.term || '—'}`,
    `Parent/Guardian: ${student.parentName}  •  ${student.parentPhone}`,
  ];
  infoRows.forEach(r => { doc.text(r, M, y); y += 5; });

  // Summary box
  y += 4;
  doc.setDrawColor(123, 31, 162);
  doc.setLineWidth(0.3);
  doc.setFillColor(243, 229, 245);
  doc.rect(M, y, PW - 2 * M, 22, 'FD');
  doc.setTextColor(74, 20, 140);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Statement Summary', M + 3, y + 5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(20, 20, 20);
  const summaryRows = [
    `Opening Balance: ${fmtMoney(f.openingBalance ?? 0, c)}`,
    `Total Due (${f.term || 'Term'}): ${fmtMoney(f.totalDue ?? 0, c)}`,
    `Total Paid: ${fmtMoney(f.paid ?? 0, c)}`,
    `Closing Balance: ${fmtMoney(f.balance ?? 0, c)}  (${(f.balance ?? 0) > 0 ? 'OUTSTANDING' : 'CLEAR'})`,
    `Next Due Date: ${fmtDate(f.dueDate)}`,
  ];
  summaryRows.forEach((r, i) => doc.text(r, M + 3, y + 10 + i * 2.5));

  // Installments table
  y += 26;
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Installments & Receipts', M, y);
  y += 4;
  // Table header
  doc.setFillColor(123, 31, 162);
  doc.rect(M, y, PW - 2 * M, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.text('Description', M + 2, y + 5);
  doc.text('Due Date', M + 90, y + 5);
  doc.text('Amount', M + 130, y + 5, { align: 'right' });
  doc.text('Receipt #', M + 160, y + 5);
  doc.text('Status', M + 195, y + 5);
  y += 7;
  // Rows
  doc.setFont('helvetica', 'normal');
  (f.installments || []).forEach((ins, i) => {
    if (i % 2 === 0) {
      doc.setFillColor(245, 240, 250);
      doc.rect(M, y, PW - 2 * M, 6, 'F');
    }
    doc.setTextColor(20, 20, 20);
    doc.text(String(ins.label || ''), M + 2, y + 4);
    doc.text(fmtDate(ins.due), M + 90, y + 4);
    doc.text(fmtMoney(ins.amount, c), M + 130, y + 4, { align: 'right' });
    doc.text(ins.receipt || '—', M + 160, y + 4);
    if (ins.status === 'paid') { doc.setTextColor(11, 128, 67); }
    else { doc.setTextColor(249, 171, 0); }
    doc.setFont('helvetica', 'bold');
    doc.text((ins.status || '').toUpperCase(), M + 195, y + 4);
    doc.setFont('helvetica', 'normal');
    y += 6;
  });
  // Total row
  doc.setDrawColor(123, 31, 162);
  doc.setLineWidth(0.4);
  doc.line(M, y, PW - M, y);
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(74, 20, 140);
  doc.text('Total Paid', M + 90, y);
  doc.text(fmtMoney(f.paid ?? 0, c), M + 130, y, { align: 'right' });
  doc.text('Balance', M + 160, y);
  if ((f.balance ?? 0) > 0) { doc.setTextColor(211, 47, 47); }
  else { doc.setTextColor(11, 128, 67); }
  doc.text(fmtMoney(f.balance ?? 0, c), M + 195, y);

  // Footer note
  y += 12;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text("This statement is computer-generated and valid without a signature. Please present this", M, y);
  y += 4;
  doc.text("statement at the bursar's office for any queries.", M, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Last payment: ${fmtMoney(f.lastPayment && f.lastPayment.amount, c)} on ${fmtDate(f.lastPayment && f.lastPayment.date)} via ${(f.lastPayment && f.lastPayment.method) || '—'} (Receipt: ${(f.lastPayment && f.lastPayment.receipt) || '—'}).`, M, y);

  // Bottom navy bar
  doc.setFillColor(7, 27, 47);
  doc.rect(0, 285, PW, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${SCHOOL_NAME} — Bursar's Office`, M, 292);
  doc.text(`Statement for ${student.admissionNo}`, PW - M, 292, { align: 'right' });

  doc.save(`fee-statement-${student.admissionNo}.pdf`);
}

// ---------- Tabs definition ----------
const TABS = [
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'attendance', label: 'Attendance', icon: '📅' },
  { id: 'marks', label: 'Marks', icon: '📊' },
  { id: 'assignments', label: 'Assignments', icon: '📝' },
  { id: 'exams', label: 'Exams', icon: '🧪' },
  { id: 'timetable', label: 'Timetable', icon: '🗓️' },
  { id: 'announcements', label: 'Announcements', icon: '📢' },
  { id: 'library', label: 'Library', icon: '📚' },
  { id: 'fees', label: 'Fees', icon: '💳' },
  { id: 'id', label: 'ID Card', icon: '🪪' },
];

// ---------- Lookup screen (with proper label/htmlFor + input id) ----------
function LookupScreen({ onFound, students }) {
  const [admissionNo, setAdmissionNo] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const trimmed = admissionNo.trim();
    if (!trimmed) { setError('Please enter your admission number.'); return; }
    const match = students.find(s => s.admissionNo.toLowerCase() === trimmed.toLowerCase());
    if (!match) { setError(`No student found for admission # "${trimmed}". Try SCT-2026-001.`); return; }
    setError('');
    onFound(match);
  };

  return (
    <div className="page-container" style={{ maxWidth: 560, margin: '0 auto', background: NAVY, color: TEXT_PRIMARY, padding: 20, borderRadius: 12 }}>
      <h1 className="page-title" style={{ color: PURPLE }}>🎓 Student Portal</h1>
      <p style={{ color: TEXT_SECONDARY, fontSize: 14, marginBottom: 24 }}>
        Enter your admission number to view your profile, attendance, marks, timetable and more.
      </p>
      <form onSubmit={submit} style={{ background: NAVY_CARD, padding: 24, borderRadius: 12, border: `1px solid ${NAVY_BORDER}` }}>
        <label htmlFor="admissionNoInput" style={{ display: 'block', fontSize: 13, color: TEXT_PRIMARY, marginBottom: 6, fontWeight: 600 }}>
          Admission Number
        </label>
        <input
          id="admissionNoInput"
          type="text"
          value={admissionNo}
          onChange={e => setAdmissionNo(e.target.value)}
          placeholder="e.g. SCT-2026-001"
          autoFocus
          aria-describedby={error ? 'admissionNoError' : undefined}
          style={{ width: '100%', padding: 12, borderRadius: 8, border: `1px solid ${error ? RED : NAVY_BORDER}`, fontSize: 15, boxSizing: 'border-box', background: NAVY_DARK, color: TEXT_PRIMARY }}
        />
        {error && <div id="admissionNoError" role="alert" style={{ color: RED, fontSize: 12, marginTop: 6 }}>{error}</div>}
        <button type="submit" style={{ marginTop: 16, width: '100%', padding: '12px 20px', background: PURPLE, color: 'white', border: 0, borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
          Look up my profile →
        </button>
        <div style={{ marginTop: 16, padding: 12, background: PURPLE_LIGHT, borderRadius: 8, fontSize: 12, color: TEXT_PRIMARY, border: `1px solid ${PURPLE}55` }}>
          <strong>💡 Demo tip:</strong> use admission number <code style={{ background: NAVY_DARK, padding: '2px 6px', borderRadius: 4, color: '#ffb3ff' }}>SCT-2026-001</code> to view the seeded sample student.
        </div>
      </form>
    </div>
  );
}

// ---------- Profile tab ----------
function ProfileTab({ student }) {
  const Row = ({ label, value }) => (
    <div style={{ display: 'flex', padding: '10px 0', borderBottom: `1px solid ${NAVY_BORDER}`, fontSize: 13 }}>
      <div style={{ width: 140, color: TEXT_MUTED }}>{label}</div>
      <div style={{ flex: 1, color: TEXT_PRIMARY, fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
  return (
    <div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ width: 140, height: 160, borderRadius: 12, background: PURPLE_LIGHT, border: `2px dashed ${PURPLE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb3ff', fontSize: 14, textAlign: 'center', padding: 8 }}>
          {student.photo
            ? <img src={student.photo} alt="student" style={{ width: '100%', height: '100%', borderRadius: 10, objectFit: 'cover' }} />
            : <div>📷<br />Photo<br />placeholder</div>}
        </div>
        <div style={{ flex: 1, minWidth: 250 }}>
          <h2 style={{ margin: '0 0 4px', color: TEXT_PRIMARY, fontSize: 22 }}>{student.name}</h2>
          <div style={{ color: TEXT_SECONDARY, fontSize: 13, marginBottom: 12 }}>{student.class} • {student.stream} • {student.gender}</div>
          <Row label="Admission #" value={student.admissionNo} />
          <Row label="Date of birth" value={fmtDate(student.dob)} />
          <Row label="House" value={student.house} />
          <Row label="Blood group" value={student.bloodGroup} />
        </div>
      </div>
      <div style={{ background: NAVY_LIGHT, padding: 16, borderRadius: 10, border: `1px solid ${NAVY_BORDER}` }}>
        <h3 style={{ margin: '0 0 10px', fontSize: 14, color: PURPLE }}>👨‍👩‍👦 Parent / Guardian Contact</h3>
        <Row label="Name" value={student.parentName} />
        <Row label="Relationship" value={student.parentRelation} />
        <Row label="Phone" value={student.parentPhone} />
        <Row label="Email" value={student.parentEmail} />
        <Row label="Home address" value={student.address} />
      </div>
    </div>
  );
}

// ---------- Attendance tab (monthly bars + month-grid calendar) ----------
function AttendanceTab({ student }) {
  const a = student.attendance || {};
  const pct = a.totalDays ? Math.round((a.present / a.totalDays) * 100) : 0;
  const statCards = [
    { label: 'Days Present', value: a.present ?? 0, color: GREEN, bg: 'rgba(11,128,67,0.15)' },
    { label: 'Days Absent', value: a.absent ?? 0, color: RED, bg: 'rgba(211,47,47,0.15)' },
    { label: 'Late Arrivals', value: a.late ?? 0, color: YELLOW, bg: 'rgba(249,171,0,0.15)' },
    { label: 'Attendance %', value: pct + '%', color: PURPLE, bg: PURPLE_LIGHT },
  ];

  // Group daily attendance by month (YYYY-MM keys)
  const days = a.days || [];
  const monthMap = useMemo(() => {
    const m = {};
    days.forEach(d => {
      const [y, mo] = d.date.split('-');
      const key = `${y}-${mo}`;
      if (!m[key]) m[key] = [];
      m[key].push(d);
    });
    return m;
  }, [days]);
  const monthKeys = useMemo(() => Object.keys(monthMap).sort(), [monthMap]);
  const [monthIdx, setMonthIdx] = useState(() => Math.max(0, monthKeys.length - 1));
  // If the monthIdx ends up out of range (e.g., after data load), clamp it
  const safeIdx = Math.min(monthIdx, Math.max(0, monthKeys.length - 1));
  const activeMonth = monthKeys[safeIdx];

  // Build the calendar grid for the active month
  const calGrid = useMemo(() => {
    if (!activeMonth) return [];
    const [yStr, mStr] = activeMonth.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const cells = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    const dayEntries = {};
    (monthMap[activeMonth] || []).forEach(d => {
      const day = parseInt(d.date.split('-')[2], 10);
      dayEntries[day] = d.status;
    });
    for (let d = 1; d <= last.getDate(); d++) {
      cells.push({ day: d, status: dayEntries[d] || null });
    }
    return cells;
  }, [activeMonth, monthMap]);

  const dayColor = (status) => status === 'present' ? GREEN : status === 'absent' ? RED : status === 'late' ? YELLOW : null;
  const monthLabel = activeMonth
    ? new Date(parseInt(activeMonth.split('-')[0], 10), parseInt(activeMonth.split('-')[1], 10) - 1, 1).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
    : '—';

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {statCards.map(c => (
          <div key={c.label} style={{ padding: 16, borderRadius: 10, background: c.bg, border: `1px solid ${c.color}55` }}>
            <div style={{ fontSize: 11, color: c.color, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>{c.label}</div>
            <div style={{ fontSize: 26, color: c.color, fontWeight: 800, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Attendance calendar */}
      <div style={{ padding: 16, background: NAVY_LIGHT, borderRadius: 10, border: `1px solid ${NAVY_BORDER}`, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: TEXT_PRIMARY }}>🗓️ Daily Attendance Calendar</h3>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => setMonthIdx(Math.max(0, safeIdx - 1))}
              disabled={safeIdx === 0}
              style={{ padding: '4px 10px', background: NAVY_DARK, color: TEXT_PRIMARY, border: `1px solid ${NAVY_BORDER}`, borderRadius: 6, cursor: safeIdx === 0 ? 'not-allowed' : 'pointer', opacity: safeIdx === 0 ? 0.4 : 1, fontSize: 13 }}
            >‹ Prev</button>
            <div style={{ fontSize: 13, color: PURPLE, fontWeight: 700, minWidth: 130, textAlign: 'center' }}>{monthLabel}</div>
            <button
              onClick={() => setMonthIdx(Math.min(monthKeys.length - 1, safeIdx + 1))}
              disabled={safeIdx >= monthKeys.length - 1}
              style={{ padding: '4px 10px', background: NAVY_DARK, color: TEXT_PRIMARY, border: `1px solid ${NAVY_BORDER}`, borderRadius: 6, cursor: safeIdx >= monthKeys.length - 1 ? 'not-allowed' : 'pointer', opacity: safeIdx >= monthKeys.length - 1 ? 0.4 : 1, fontSize: 13 }}
            >Next ›</button>
          </div>
        </div>
        {calGrid.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED }}>No attendance calendar data.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: TEXT_MUTED, padding: '4px 0' }}>{d}</div>
            ))}
            {calGrid.map((c, i) => (
              <div key={i} style={{ minHeight: 50, padding: 4, background: c ? NAVY_DARK : 'transparent', border: c ? `1px solid ${NAVY_BORDER}` : '1px solid transparent', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {c && (
                  <>
                    <div style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 600 }}>{c.day}</div>
                    {c.status ? (
                      <div title={c.status} style={{ width: 14, height: 14, borderRadius: '50%', background: dayColor(c.status), marginTop: 6, boxShadow: `0 0 6px ${dayColor(c.status)}` }} />
                    ) : (
                      <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1px dashed ${NAVY_BORDER}`, marginTop: 6 }} title="No record" />
                    )}
                    {c.status && (
                      <div style={{ fontSize: 8, color: dayColor(c.status), marginTop: 3, textTransform: 'capitalize' }}>{c.status}</div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 14, marginTop: 12, fontSize: 11, color: TEXT_SECONDARY, flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: GREEN, marginRight: 4, verticalAlign: 'middle' }} />Present</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: RED, marginRight: 4, verticalAlign: 'middle' }} />Absent</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: YELLOW, marginRight: 4, verticalAlign: 'middle' }} />Late</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: `1px dashed ${NAVY_BORDER}`, marginRight: 4, verticalAlign: 'middle' }} />No record (weekend / future)</span>
        </div>
      </div>

      {/* Monthly bar chart */}
      <div style={{ padding: 16, background: NAVY_LIGHT, borderRadius: 10, border: `1px solid ${NAVY_BORDER}` }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, color: TEXT_PRIMARY }}>📊 Monthly Attendance (present / total days)</h3>
        {!a.monthly || a.monthly.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED }}>No attendance history.</div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, overflowX: 'auto', paddingBottom: 8 }}>
            {a.monthly.map(m => {
              const ratio = m.total ? m.present / m.total : 0;
              const h = Math.max(4, ratio * 150);
              const c = ratio >= 0.9 ? GREEN : ratio >= 0.75 ? YELLOW : RED;
              return (
                <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                  <div style={{ fontSize: 10, color: TEXT_SECONDARY, marginBottom: 4 }}>{m.present}/{m.total}</div>
                  <div style={{ width: 24, height: h, background: c, borderRadius: '4px 4px 0 0', transition: 'height .2s' }} title={`${m.present} of ${m.total}`} />
                  <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 4 }}>{m.month}</div>
                </div>
              );
            })}
          </div>
        )}
        <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 12 }}>
          Green ≥ 90% • Yellow ≥ 75% • Red &lt; 75%.
        </div>
      </div>
    </div>
  );
}

// ---------- Marks tab (with subject-wise performance bar chart + trend arrows) ----------
function MarksTab({ student }) {
  const marks = student.marks || [];
  const perf = student.subjectPerformance || [];
  const avg = marks.length ? Math.round(marks.reduce((s, m) => s + m.mark, 0) / marks.length) : 0;

  const termColors = { term1: BLUE, term2: PURPLE, term3: GREEN };
  const trendArrow = (a, b) => (b > a ? '▲' : b < a ? '▼' : '▬');
  const trendColor = (a, b) => (b > a ? GREEN : b < a ? RED : TEXT_MUTED);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ padding: 12, borderRadius: 10, background: PURPLE_LIGHT, border: `1px solid ${PURPLE}55` }}>
          <div style={{ fontSize: 11, color: PURPLE, fontWeight: 700 }}>YOUR AVERAGE</div>
          <div style={{ fontSize: 22, color: TEXT_PRIMARY, fontWeight: 800 }}>{avg}%</div>
        </div>
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(26,115,232,0.15)', border: '1px solid #1a73e855' }}>
          <div style={{ fontSize: 11, color: BLUE, fontWeight: 700 }}>CLASS AVERAGE</div>
          <div style={{ fontSize: 22, color: TEXT_PRIMARY, fontWeight: 800 }}>
            {marks.length ? Math.round(marks.reduce((s, m) => s + m.average, 0) / marks.length) : 0}%
          </div>
        </div>
      </div>

      {/* Subject-wise performance across terms (grouped bar chart + trend) */}
      <div style={{ padding: 16, background: NAVY_LIGHT, borderRadius: 10, border: `1px solid ${NAVY_BORDER}`, marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: TEXT_PRIMARY }}>📈 Subject-wise Performance Across Terms</h3>
        {perf.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED }}>No term-wise performance data.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `120px repeat(${perf.length}, minmax(72px, 1fr))`, gap: 4, minWidth: 720 }}>
              {/* Header row: subject names */}
              <div style={{ fontSize: 11, color: TEXT_MUTED, fontWeight: 700, padding: 4 }}>Subject</div>
              {perf.map(p => (
                <div key={p.subject} style={{ fontSize: 10, color: TEXT_SECONDARY, fontWeight: 700, padding: 4, textAlign: 'center' }}>{p.subject}</div>
              ))}
              {/* Term 1 row */}
              <div style={{ fontSize: 11, color: BLUE, fontWeight: 700, padding: 4, display: 'flex', alignItems: 'center' }}>Term 1</div>
              {perf.map(p => (
                <div key={p.subject + '_t1'} style={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 90 }}>
                  <div style={{ fontSize: 10, color: TEXT_PRIMARY, marginBottom: 4 }}>{p.term1}%</div>
                  <div style={{ width: '100%', maxWidth: 36, height: `${p.term1 * 0.7}px`, background: termColors.term1, borderRadius: '4px 4px 0 0' }} />
                </div>
              ))}
              {/* Term 2 row */}
              <div style={{ fontSize: 11, color: PURPLE, fontWeight: 700, padding: 4, display: 'flex', alignItems: 'center' }}>Term 2</div>
              {perf.map(p => (
                <div key={p.subject + '_t2'} style={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 90 }}>
                  <div style={{ fontSize: 10, color: TEXT_PRIMARY, marginBottom: 4 }}>{p.term2}%</div>
                  <div style={{ width: '100%', maxWidth: 36, height: `${p.term2 * 0.7}px`, background: termColors.term2, borderRadius: '4px 4px 0 0' }} />
                </div>
              ))}
              {/* Term 3 row */}
              <div style={{ fontSize: 11, color: GREEN, fontWeight: 700, padding: 4, display: 'flex', alignItems: 'center' }}>Term 3</div>
              {perf.map(p => (
                <div key={p.subject + '_t3'} style={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: 90 }}>
                  <div style={{ fontSize: 10, color: TEXT_PRIMARY, marginBottom: 4 }}>{p.term3}%</div>
                  <div style={{ width: '100%', maxWidth: 36, height: `${p.term3 * 0.7}px`, background: termColors.term3, borderRadius: '4px 4px 0 0' }} />
                </div>
              ))}
              {/* Trend row (T1 → T3) */}
              <div style={{ fontSize: 11, color: TEXT_PRIMARY, fontWeight: 700, padding: 4, display: 'flex', alignItems: 'center' }}>Trend T1→T3</div>
              {perf.map(p => {
                const delta = p.term3 - p.term1;
                return (
                  <div key={p.subject + '_tr'} style={{ padding: 4, textAlign: 'center', fontSize: 13, color: trendColor(p.term1, p.term3), fontWeight: 700 }}>
                    {trendArrow(p.term1, p.term3)} {delta > 0 ? '+' : ''}{delta}
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11, color: TEXT_SECONDARY, flexWrap: 'wrap' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: termColors.term1, marginRight: 4, verticalAlign: 'middle' }} />Term 1</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: termColors.term2, marginRight: 4, verticalAlign: 'middle' }} />Term 2</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: termColors.term3, marginRight: 4, verticalAlign: 'middle' }} />Term 3</span>
              <span><span style={{ color: GREEN, marginRight: 4 }}>▲</span>improved</span>
              <span><span style={{ color: RED, marginRight: 4 }}>▼</span>declined</span>
              <span><span style={{ color: TEXT_MUTED, marginRight: 4 }}>▬</span>stable</span>
            </div>
          </div>
        )}
      </div>

      {/* Latest term marks */}
      <h3 style={{ fontSize: 14, color: TEXT_PRIMARY, margin: '0 0 10px' }}>Latest Term Results</h3>
      {marks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, background: NAVY_LIGHT, borderRadius: 8 }}>
          No exam results published yet.
        </div>
      ) : marks.map((m, i) => {
        const diff = m.mark - m.average;
        return (
          <div key={i} style={{ padding: 14, marginBottom: 10, background: NAVY_LIGHT, borderRadius: 10, border: `1px solid ${NAVY_BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ background: gradeColor(m.grade), color: 'white', padding: '4px 10px', borderRadius: 6, fontWeight: 700, fontSize: 13, minWidth: 36, textAlign: 'center' }}>{m.grade}</span>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: TEXT_PRIMARY }}>{m.subject}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>Teacher: {m.teacher}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: PURPLE }}>{m.mark}%</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>class avg: {m.average}%</div>
              </div>
              <div style={{ fontSize: 12, color: diff >= 0 ? GREEN : RED, fontWeight: 700, minWidth: 60, textAlign: 'right' }}>
                {diff >= 0 ? '+' : ''}{diff} vs avg
              </div>
            </div>
            <div style={{ height: 6, background: NAVY_DARK, borderRadius: 4, marginTop: 10, overflow: 'hidden', position: 'relative' }}>
              <div style={{ width: `${m.mark}%`, height: '100%', background: PURPLE }} />
              <div style={{ position: 'absolute', top: 0, left: `${m.average}%`, width: 2, height: '100%', background: BLUE }} title="Class average" />
            </div>
            {m.feedback && (
              <div style={{ marginTop: 8, padding: 10, background: NAVY_DARK, borderRadius: 6, fontSize: 12, color: TEXT_SECONDARY, fontStyle: 'italic' }}>
                💬 {m.feedback}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------- Assignments tab (Pending → Submitted → Graded submission flow) ----------
function AssignmentsTab({ student, onSubmit, onWithdraw }) {
  const list = student.assignments || [];
  const [expandedId, setExpandedId] = useState(null);
  const [draft, setDraft] = useState({ text: '', fileUrl: '' });
  const today = new Date();

  const pending = list.filter(a => a.status === 'pending');
  const submitted = list.filter(a => a.status === 'submitted');
  const graded = list.filter(a => a.status === 'graded');

  const statusBadge = (s) => {
    const c = statusColor(s);
    const label = s.charAt(0).toUpperCase() + s.slice(1);
    return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: c, color: 'white', textTransform: 'uppercase' }}>{label}</span>;
  };

  const Card = ({ a }) => {
    const due = new Date(a.dueDate);
    const overdue = a.status === 'pending' && due < today;
    const expanded = expandedId === a.id;
    const open = () => {
      if (expanded) {
        setExpandedId(null);
      } else {
        setExpandedId(a.id);
        setDraft({ text: a.submission?.text || '', fileUrl: a.submission?.fileUrl || '' });
      }
    };
    return (
      <div style={{ padding: 12, marginBottom: 8, borderRadius: 8, background: NAVY_LIGHT, border: `1px solid ${expanded ? PURPLE : NAVY_BORDER}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontWeight: 600, color: TEXT_PRIMARY, fontSize: 14 }}>{a.title}</div>
            <div style={{ fontSize: 11, color: TEXT_MUTED }}>{a.subject} • Due {fmtDate(a.dueDate)} {overdue && <span style={{ color: RED, fontWeight: 700 }}>• OVERDUE</span>}</div>
          </div>
          {statusBadge(a.status)}
          <button onClick={open} style={{ padding: '6px 12px', background: NAVY_DARK, color: TEXT_PRIMARY, border: `1px solid ${NAVY_BORDER}`, borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
            {expanded ? '▲ Hide' : a.status === 'pending' ? '▼ View / Submit' : '▼ View'}
          </button>
        </div>
        {expanded && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${NAVY_BORDER}` }}>
            {a.submission && (
              <div style={{ marginBottom: 12, padding: 12, background: NAVY_DARK, borderRadius: 8, border: `1px solid ${NAVY_BORDER}` }}>
                <div style={{ fontSize: 11, color: TEXT_MUTED, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Submitted work</div>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>
                  <strong>Submitted at:</strong> {fmtDateTime(a.submission.submittedAt)}
                </div>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, marginBottom: 6 }}>
                  <strong>File URL:</strong>{' '}
                  {a.submission.fileUrl
                    ? <a href={a.submission.fileUrl} target="_blank" rel="noreferrer" style={{ color: BLUE, wordBreak: 'break-all' }}>{a.submission.fileUrl}</a>
                    : <span style={{ color: TEXT_MUTED }}>—</span>}
                </div>
                <div style={{ fontSize: 12, color: TEXT_PRIMARY, whiteSpace: 'pre-wrap', background: NAVY, padding: 8, borderRadius: 6, border: `1px solid ${NAVY_BORDER}` }}>
                  {a.submission.text || <span style={{ color: TEXT_MUTED, fontStyle: 'italic' }}>(no written submission)</span>}
                </div>
                {a.status === 'graded' && a.submission.grade != null && (
                  <div style={{ marginTop: 10, padding: 10, background: 'rgba(11,128,67,0.15)', borderRadius: 6, border: `1px solid ${GREEN}55` }}>
                    <div style={{ fontSize: 12, color: GREEN, fontWeight: 700 }}>Grade: {a.submission.grade}</div>
                    {a.submission.feedback && <div style={{ fontSize: 12, color: TEXT_PRIMARY, marginTop: 4, fontStyle: 'italic' }}>💬 {a.submission.feedback}</div>}
                  </div>
                )}
                {a.status === 'submitted' && (
                  <div style={{ marginTop: 10, padding: 10, background: 'rgba(26,115,232,0.15)', borderRadius: 6, border: `1px solid ${BLUE}55` }}>
                    <div style={{ fontSize: 12, color: BLUE, fontWeight: 700 }}>⏳ Awaiting grading</div>
                    <div style={{ fontSize: 11, color: TEXT_SECONDARY, marginTop: 4 }}>Your submission has been received. The teacher will grade and return feedback shortly.</div>
                  </div>
                )}
              </div>
            )}

            {a.status === 'pending' && (
              <div>
                <div style={{ fontSize: 12, color: TEXT_PRIMARY, marginBottom: 6, fontWeight: 600 }}>Submit your work</div>
                <label htmlFor={`submission-text-${a.id}`} style={{ display: 'block', fontSize: 11, color: TEXT_MUTED, marginBottom: 4 }}>Written submission</label>
                <textarea
                  id={`submission-text-${a.id}`}
                  value={draft.text}
                  onChange={e => setDraft(d => ({ ...d, text: e.target.value }))}
                  placeholder="Type or paste your written submission here..."
                  rows={5}
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${NAVY_BORDER}`, background: NAVY_DARK, color: TEXT_PRIMARY, fontSize: 13, boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
                />
                <label htmlFor={`submission-file-${a.id}`} style={{ display: 'block', fontSize: 11, color: TEXT_MUTED, marginBottom: 4, marginTop: 10 }}>File URL (Google Drive, Dropbox, etc.)</label>
                <input
                  id={`submission-file-${a.id}`}
                  type="url"
                  value={draft.fileUrl}
                  onChange={e => setDraft(d => ({ ...d, fileUrl: e.target.value }))}
                  placeholder="https://drive.example.com/your-work.pdf"
                  style={{ width: '100%', padding: 10, borderRadius: 6, border: `1px solid ${NAVY_BORDER}`, background: NAVY_DARK, color: TEXT_PRIMARY, fontSize: 13, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => {
                      if (!draft.text.trim() && !draft.fileUrl.trim()) {
                        alert('Please add either a written submission or a file URL before submitting.');
                        return;
                      }
                      onSubmit(a.id, draft);
                      setExpandedId(null);
                    }}
                    style={{ padding: '8px 16px', background: PURPLE, color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                  >⬆ Submit work</button>
                  <button
                    onClick={() => setExpandedId(null)}
                    style={{ padding: '8px 16px', background: NAVY_DARK, color: TEXT_SECONDARY, border: `1px solid ${NAVY_BORDER}`, borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 13 }}
                  >Cancel</button>
                </div>
              </div>
            )}

            {a.status !== 'pending' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    // Audit fix: destructive action wrapped with window.confirm()
                    if (window.confirm(`Withdraw / delete submission for "${a.title}"?\n\nThis will return the assignment to "Pending" status and discard any grading feedback. This cannot be undone.`)) {
                      onWithdraw(a.id);
                      setExpandedId(null);
                    }
                  }}
                  style={{ padding: '6px 12px', background: 'rgba(211,47,47,0.15)', color: RED, border: `1px solid ${RED}55`, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                >🗑 Withdraw / Delete submission</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(249,171,0,0.15)', border: `1px solid ${YELLOW}55` }}>
          <div style={{ fontSize: 11, color: YELLOW, fontWeight: 700 }}>PENDING</div>
          <div style={{ fontSize: 22, color: YELLOW, fontWeight: 800 }}>{pending.length}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(26,115,232,0.15)', border: `1px solid ${BLUE}55` }}>
          <div style={{ fontSize: 11, color: BLUE, fontWeight: 700 }}>SUBMITTED</div>
          <div style={{ fontSize: 22, color: BLUE, fontWeight: 800 }}>{submitted.length}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 10, background: 'rgba(11,128,67,0.15)', border: `1px solid ${GREEN}55` }}>
          <div style={{ fontSize: 11, color: GREEN, fontWeight: 700 }}>GRADED</div>
          <div style={{ fontSize: 22, color: GREEN, fontWeight: 800 }}>{graded.length}</div>
        </div>
      </div>

      <div style={{ padding: 12, background: NAVY_LIGHT, borderRadius: 8, border: `1px solid ${NAVY_BORDER}`, marginBottom: 16, fontSize: 12, color: TEXT_SECONDARY }}>
        Workflow: <strong style={{ color: YELLOW }}>Pending</strong> → <strong style={{ color: BLUE }}>Submitted</strong> → <strong style={{ color: GREEN }}>Graded</strong>. Click &laquo;View / Submit&raquo; to attach your work.
      </div>

      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, background: NAVY_LIGHT, borderRadius: 8 }}>
          📝 No assignments yet.
        </div>
      ) : (
        <div>
          {pending.length > 0 && <h4 style={{ fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, margin: '0 0 8px' }}>To do</h4>}
          {pending.map(a => <Card key={a.id} a={a} />)}
          {submitted.length > 0 && <h4 style={{ fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>Submitted (awaiting grading)</h4>}
          {submitted.map(a => <Card key={a.id} a={a} />)}
          {graded.length > 0 && <h4 style={{ fontSize: 12, color: TEXT_MUTED, textTransform: 'uppercase', letterSpacing: 0.5, margin: '16px 0 8px' }}>Graded</h4>}
          {graded.map(a => <Card key={a.id} a={a} />)}
        </div>
      )}
    </div>
  );
}

// ---------- Exam Schedule tab ----------
function ExamScheduleTab({ student }) {
  const list = (student.examSchedule || []).slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const today = new Date();
  return (
    <div>
      <div style={{ padding: 12, borderRadius: 10, background: PURPLE_LIGHT, border: `1px solid ${PURPLE}55`, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: PURPLE, fontWeight: 700, textTransform: 'uppercase' }}>Upcoming Examinations</div>
        <div style={{ fontSize: 13, color: TEXT_PRIMARY, marginTop: 4 }}>
          {list.length} papers scheduled • First exam: {list.length ? fmtDate(list[0].date) : '—'}
        </div>
      </div>
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, background: NAVY_LIGHT, borderRadius: 8 }}>
          🧪 No exam schedule published yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 10, background: PURPLE, color: 'white' }}>Subject</th>
                <th style={{ textAlign: 'left', padding: 10, background: PURPLE, color: 'white' }}>Date</th>
                <th style={{ textAlign: 'left', padding: 10, background: PURPLE, color: 'white' }}>Time</th>
                <th style={{ textAlign: 'left', padding: 10, background: PURPLE, color: 'white' }}>Room</th>
                <th style={{ textAlign: 'left', padding: 10, background: PURPLE, color: 'white' }}>Duration</th>
                <th style={{ textAlign: 'left', padding: 10, background: PURPLE, color: 'white' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map(e => {
                const eDate = new Date(e.date);
                const isPast = eDate < today;
                const isToday = eDate.toDateString() === today.toDateString();
                return (
                  <tr key={e.id} style={{ background: isToday ? 'rgba(123,31,162,0.25)' : 'transparent' }}>
                    <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}`, color: TEXT_PRIMARY, fontWeight: 600 }}>{e.subject}</td>
                    <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}`, color: TEXT_SECONDARY }}>{fmtDate(e.date)}</td>
                    <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}`, color: TEXT_SECONDARY }}>{e.time}</td>
                    <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}`, color: TEXT_PRIMARY }}>📍 {e.room}</td>
                    <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}`, color: TEXT_SECONDARY }}>⏱ {e.duration}</td>
                    <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}` }}>
                      {isToday ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: PURPLE, color: 'white' }}>TODAY</span>
                        : isPast ? <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: TEXT_MUTED, color: 'white' }}>PAST</span>
                        : <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: GREEN, color: 'white' }}>UPCOMING</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ marginTop: 16, padding: 12, background: NAVY_LIGHT, borderRadius: 8, border: `1px solid ${NAVY_BORDER}`, fontSize: 12, color: TEXT_SECONDARY }}>
        📌 Reminder: Report to the examination hall 15 minutes before the start of each paper. Bring your ID card, admission slip, two pens, pencil, mathematical set and a non-programmable calculator.
      </div>
    </div>
  );
}

// ---------- Timetable tab ----------
function TimetableTab({ student }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const periods = [1, 2, 3, 4, 5];
  const findCell = (day, period) => (student.timetable || []).find(t => t.day === day && t.period === period);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ padding: 10, background: PURPLE, color: 'white', textAlign: 'left', borderRadius: '6px 0 0 0' }}>Period</th>
            {days.map(d => <th key={d} style={{ padding: 10, background: PURPLE, color: 'white', textAlign: 'left' }}>{d}</th>)}
          </tr>
        </thead>
        <tbody>
          {periods.map((p, idx) => (
            <tr key={p}>
              <td style={{ padding: 10, background: PURPLE_LIGHT, color: TEXT_PRIMARY, fontWeight: 700, borderBottom: `1px solid ${NAVY_BORDER}` }}>
                {p}<br /><span style={{ fontSize: 10, color: TEXT_MUTED, fontWeight: 400 }}>{['08:00–08:40', '08:40–09:20', '09:35–10:15', '10:15–10:55', '11:10–11:50'][idx]}</span>
              </td>
              {days.map(d => {
                const cell = findCell(d, p);
                return (
                  <td key={d} style={{ padding: 8, borderBottom: `1px solid ${NAVY_BORDER}`, borderLeft: `1px solid ${NAVY_BORDER}`, verticalAlign: 'top', color: TEXT_PRIMARY, background: NAVY_LIGHT }}>
                    {cell ? (
                      <div>
                        <div style={{ fontWeight: 600, color: PURPLE, fontSize: 12 }}>{cell.subject}</div>
                        <div style={{ fontSize: 10, color: TEXT_MUTED }}>{cell.teacher}</div>
                        <div style={{ fontSize: 10, color: BLUE }}>📍 {cell.room}</div>
                      </div>
                    ) : (
                      <div style={{ color: TEXT_MUTED }}>—</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Announcements tab ----------
function AnnouncementsTab({ student }) {
  const list = [...(student.announcements || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const pColor = { high: RED, medium: YELLOW, low: GREEN };
  return (
    <div>
      {list.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, background: NAVY_LIGHT, borderRadius: 8 }}>
          📢 No announcements.
        </div>
      ) : list.map(a => (
        <div key={a.id} style={{ padding: 14, marginBottom: 10, background: NAVY_LIGHT, borderRadius: 8, border: `1px solid ${NAVY_BORDER}`, borderLeft: `4px solid ${pColor[a.priority] || TEXT_MUTED}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: 15, color: TEXT_PRIMARY }}>{a.title}</h3>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: pColor[a.priority] || TEXT_MUTED, color: 'white', textTransform: 'uppercase' }}>{a.priority}</span>
          </div>
          <p style={{ margin: '6px 0 8px', fontSize: 13, color: TEXT_SECONDARY, lineHeight: 1.5 }}>{a.body}</p>
          <div style={{ fontSize: 11, color: TEXT_MUTED }}>— {a.author} • {fmtDate(a.date)}</div>
        </div>
      ))}
    </div>
  );
}

// ---------- Library tab (My Loans + Catalog browse + reservations) ----------
function LibraryTab({ student, catalog, reservations, onReserve, onCancelReservation }) {
  const [view, setView] = useState('loans'); // 'loans' | 'catalog'
  const list = student.library || [];
  const totalFine = list.reduce((s, b) => s + (b.fine || 0), 0);
  const myReservations = reservations.filter(r => r.studentAdmissionNo === student.admissionNo);

  const statusBadge = (s) => {
    const c = statusColor(s);
    return <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: c, color: 'white', textTransform: 'uppercase' }}>{s}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: `2px solid ${NAVY_BORDER}`, paddingBottom: 0 }}>
        <button onClick={() => setView('loans')} style={{ padding: '8px 14px', background: view === 'loans' ? PURPLE : 'transparent', color: view === 'loans' ? 'white' : TEXT_SECONDARY, border: 0, borderBottom: view === 'loans' ? `3px solid ${PURPLE_DARK}` : '3px solid transparent', cursor: 'pointer', fontWeight: 600, fontSize: 13, marginBottom: -2, borderRadius: '6px 6px 0 0' }}>📖 My Loans ({list.length})</button>
        <button onClick={() => setView('catalog')} style={{ padding: '8px 14px', background: view === 'catalog' ? PURPLE : 'transparent', color: view === 'catalog' ? 'white' : TEXT_SECONDARY, border: 0, borderBottom: view === 'catalog' ? `3px solid ${PURPLE_DARK}` : '3px solid transparent', cursor: 'pointer', fontWeight: 600, fontSize: 13, marginBottom: -2, borderRadius: '6px 6px 0 0' }}>🔍 Browse Catalog ({catalog.length})</button>
      </div>

      {view === 'loans' && (
        <div>
          <div style={{ padding: 12, borderRadius: 10, background: totalFine > 0 ? 'rgba(211,47,47,0.15)' : 'rgba(11,128,67,0.15)', border: `1px solid ${totalFine > 0 ? RED : GREEN}55`, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: totalFine > 0 ? RED : GREEN, textTransform: 'uppercase' }}>Outstanding fines</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: totalFine > 0 ? RED : GREEN }}>{fmtMoney(totalFine)}</div>
          </div>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: TEXT_MUTED, background: NAVY_LIGHT, borderRadius: 8 }}>📚 No library history.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 540 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 10, borderBottom: '2px solid ' + PURPLE, color: TEXT_SECONDARY }}>Book</th>
                    <th style={{ textAlign: 'left', padding: 10, borderBottom: '2px solid ' + PURPLE, color: TEXT_SECONDARY }}>Checked out</th>
                    <th style={{ textAlign: 'left', padding: 10, borderBottom: '2px solid ' + PURPLE, color: TEXT_SECONDARY }}>Due</th>
                    <th style={{ textAlign: 'left', padding: 10, borderBottom: '2px solid ' + PURPLE, color: TEXT_SECONDARY }}>Status</th>
                    <th style={{ textAlign: 'right', padding: 10, borderBottom: '2px solid ' + PURPLE, color: TEXT_SECONDARY }}>Fine</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(b => (
                    <tr key={b.id}>
                      <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}`, color: TEXT_PRIMARY }}>{b.book}</td>
                      <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}`, color: TEXT_SECONDARY }}>{fmtDate(b.checkout)}</td>
                      <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}`, color: TEXT_SECONDARY }}>{fmtDate(b.due)}</td>
                      <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}` }}>{statusBadge(b.status)}</td>
                      <td style={{ padding: 10, borderBottom: `1px solid ${NAVY_BORDER}`, textAlign: 'right', color: (b.fine || 0) > 0 ? RED : TEXT_MUTED, fontWeight: (b.fine || 0) > 0 ? 700 : 400 }}>
                        {(b.fine || 0) > 0 ? fmtMoney(b.fine) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {myReservations.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 13, color: TEXT_PRIMARY, margin: '0 0 8px' }}>📌 My Reservations</h3>
              {myReservations.map(r => (
                <div key={r.bookId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 10, marginBottom: 6, background: NAVY_LIGHT, border: `1px solid ${NAVY_BORDER}`, borderRadius: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, color: TEXT_PRIMARY, fontSize: 13 }}>{r.bookTitle}</div>
                    <div style={{ fontSize: 11, color: TEXT_MUTED }}>Reserved: {fmtDateTime(r.reservedAt)}</div>
                  </div>
                  <button
                    onClick={() => {
                      // Audit fix: destructive action wrapped with window.confirm()
                      if (window.confirm(`Cancel reservation for "${r.bookTitle}"?\n\nThe book copy will be returned to the catalog for other students.`)) {
                        onCancelReservation(r.bookId);
                      }
                    }}
                    style={{ padding: '6px 12px', background: 'rgba(211,47,47,0.15)', color: RED, border: `1px solid ${RED}55`, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                  >Cancel reservation</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'catalog' && (
        <div>
          <div style={{ padding: 12, borderRadius: 10, background: NAVY_LIGHT, border: `1px solid ${NAVY_BORDER}`, marginBottom: 16, fontSize: 12, color: TEXT_SECONDARY }}>
            🔍 Browse the library catalog. Click <strong style={{ color: PURPLE }}>Reserve</strong> on any available book — reservations are stored in your browser (localStorage) and held for 48 hours.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {catalog.map(b => {
              const myRes = reservations.find(r => r.bookId === b.id && r.studentAdmissionNo === student.admissionNo);
              const isAvail = b.available > 0;
              return (
                <div key={b.id} style={{ padding: 14, background: NAVY_LIGHT, borderRadius: 8, border: `1px solid ${NAVY_BORDER}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontWeight: 600, color: TEXT_PRIMARY, fontSize: 14, lineHeight: 1.3 }}>{b.title}</div>
                  <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>by {b.author}</div>
                  <div style={{ fontSize: 11, color: TEXT_MUTED }}>ISBN: {b.isbn}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${NAVY_BORDER}` }}>
                    <div style={{ fontSize: 11, color: isAvail ? GREEN : RED, fontWeight: 700 }}>
                      {b.available} / {b.total} copies available
                    </div>
                    {myRes ? (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: PURPLE, color: 'white', textTransform: 'uppercase' }}>Reserved by you</span>
                    ) : isAvail ? (
                      <button onClick={() => onReserve(b)} style={{ padding: '6px 12px', background: PURPLE, color: 'white', border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>📌 Reserve</button>
                    ) : (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: RED, color: 'white', textTransform: 'uppercase' }}>Unavailable</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Fees tab (with PDF generation) ----------
function FeesTab({ student, onGenerate }) {
  const f = student.fees || {};
  const c = f.currency || 'UGX';
  const paidPct = f.totalDue ? Math.round((f.paid / f.totalDue) * 100) : 0;
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try { onGenerate(student); }
    finally { setGenerating(false); }
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 14, borderRadius: 10, background: f.balance > 0 ? 'rgba(211,47,47,0.15)' : 'rgba(11,128,67,0.15)', border: `1px solid ${f.balance > 0 ? RED : GREEN}55` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: f.balance > 0 ? RED : GREEN, textTransform: 'uppercase' }}>Closing balance</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: f.balance > 0 ? RED : GREEN }}>{fmtMoney(f.balance, c)}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 10, background: PURPLE_LIGHT, border: `1px solid ${PURPLE}55` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: PURPLE, textTransform: 'uppercase' }}>Last payment</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: TEXT_PRIMARY }}>{fmtMoney(f.lastPayment && f.lastPayment.amount, c)}</div>
          <div style={{ fontSize: 11, color: TEXT_SECONDARY }}>{fmtDate(f.lastPayment && f.lastPayment.date)} • {f.lastPayment && f.lastPayment.method}</div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>Receipt: {(f.lastPayment && f.lastPayment.receipt) || '—'}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(249,171,0,0.15)', border: `1px solid ${YELLOW}55` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: YELLOW, textTransform: 'uppercase' }}>Next due date</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: YELLOW }}>{fmtDate(f.dueDate)}</div>
        </div>
        <div style={{ padding: 14, borderRadius: 10, background: 'rgba(26,115,232,0.15)', border: `1px solid ${BLUE}55` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: BLUE, textTransform: 'uppercase' }}>Opening balance</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: TEXT_PRIMARY }}>{fmtMoney(f.openingBalance ?? 0, c)}</div>
          <div style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2 }}>{f.term || '—'}</div>
        </div>
      </div>
      <div style={{ padding: 16, background: NAVY_LIGHT, borderRadius: 10, border: `1px solid ${NAVY_BORDER}`, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: TEXT_SECONDARY }}>Payment progress — {f.term}</span>
          <span style={{ fontWeight: 700, color: TEXT_PRIMARY }}>{fmtMoney(f.paid, c)} / {fmtMoney(f.totalDue, c)} ({paidPct}%)</span>
        </div>
        <div style={{ height: 10, background: NAVY_DARK, borderRadius: 5, overflow: 'hidden' }}>
          <div style={{ width: `${paidPct}%`, height: '100%', background: PURPLE }} />
        </div>
      </div>
      <h3 style={{ fontSize: 14, color: TEXT_PRIMARY, margin: '0 0 10px' }}>Installments & Receipts</h3>
      {(f.installments || []).length === 0 ? (
        <div style={{ textAlign: 'center', padding: 30, color: TEXT_MUTED, background: NAVY_LIGHT, borderRadius: 8 }}>No fee installments on record.</div>
      ) : (
        <div>
          {f.installments.map(ins => (
            <div key={ins.id} style={{ display: 'flex', gap: 12, padding: 10, marginBottom: 6, borderRadius: 8, background: NAVY_LIGHT, border: `1px solid ${NAVY_BORDER}`, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: TEXT_PRIMARY }}>{ins.label}</div>
                <div style={{ fontSize: 11, color: TEXT_MUTED }}>Due {fmtDate(ins.due)} • Receipt: {ins.receipt || '—'}</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: TEXT_PRIMARY }}>{fmtMoney(ins.amount, c)}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: ins.status === 'paid' ? GREEN : YELLOW, color: 'white', textTransform: 'uppercase' }}>{ins.status}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={handleDownload} disabled={generating} style={{ marginTop: 16, padding: '10px 20px', background: PURPLE, color: 'white', border: 0, borderRadius: 8, cursor: generating ? 'wait' : 'pointer', fontWeight: 600, opacity: generating ? 0.7 : 1 }}>
        {generating ? '⏳ Generating PDF...' : '📄 Download fee statement (PDF)'}
      </button>
      <div style={{ marginTop: 12, fontSize: 11, color: TEXT_MUTED }}>
        The statement PDF includes opening balance, all installment payments with receipt numbers, total paid, closing balance, and term.
      </div>
    </div>
  );
}

// ---------- ID card tab (with QR-coded PDF) ----------
function IdCardTab({ student, onGenerate }) {
  const [generating, setGenerating] = useState(false);
  const download = async () => {
    setGenerating(true);
    try { await onGenerate(student); }
    finally { setGenerating(false); }
  };
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div style={{ width: 320, padding: 16, borderRadius: 14, background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`, color: 'white', boxShadow: '0 8px 24px rgba(123,31,162,0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, opacity: 0.95 }}>
          <span>{SCHOOL_NAME.toUpperCase()}</span>
          <span>STUDENT ID</span>
        </div>
        <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 70, height: 80, borderRadius: 8, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📷</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{student.name}</div>
            <div style={{ fontSize: 12, opacity: 0.95 }}>{student.class} • {student.stream}</div>
          </div>
        </div>
        <div style={{ marginTop: 14, fontSize: 12, lineHeight: 1.7 }}>
          <div><strong>Adm #:</strong> {student.admissionNo}</div>
          <div><strong>House:</strong> {student.house}</div>
          <div><strong>Blood:</strong> {student.bloodGroup}</div>
          <div><strong>DOB:</strong> {fmtDate(student.dob)}</div>
          <div><strong>Parent:</strong> {student.parentName} • {student.parentPhone}</div>
        </div>
        <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.3)', fontSize: 11, opacity: 0.95, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>QR encodes: <code style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 5px', borderRadius: 3 }}>{student.admissionNo}</code></div>
          <div style={{ width: 36, height: 36, background: 'white', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: NAVY, fontSize: 9, fontWeight: 700 }}>QR</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 240 }}>
        <h3 style={{ margin: '0 0 8px', fontSize: 16, color: TEXT_PRIMARY }}>Download your ID card</h3>
        <p style={{ fontSize: 13, color: TEXT_SECONDARY, lineHeight: 1.6, marginBottom: 16 }}>
          Download a printable PDF of your student ID card with an embedded QR code. The QR encodes your admission number
          (<strong style={{ color: PURPLE }}>{student.admissionNo}</strong>) and is scanned at the library, cafeteria and exam entry points for verification.
        </p>
        <button onClick={download} disabled={generating} style={{ padding: '12px 24px', background: PURPLE, color: 'white', border: 0, borderRadius: 8, cursor: generating ? 'wait' : 'pointer', fontWeight: 700, opacity: generating ? 0.7 : 1 }}>
          {generating ? '⏳ Generating PDF...' : '⬇️ Download ID card (PDF with QR)'}
        </button>
        <div style={{ marginTop: 16, padding: 12, background: NAVY_LIGHT, borderRadius: 8, fontSize: 12, color: TEXT_SECONDARY, border: `1px solid ${NAVY_BORDER}` }}>
          ℹ️ If your card is lost, contact the front office for a replacement (UGX 5,000 fee applies).
        </div>
        <div style={{ marginTop: 8, padding: 12, background: PURPLE_LIGHT, borderRadius: 8, fontSize: 12, color: TEXT_PRIMARY, border: `1px solid ${PURPLE}55` }}>
          📋 Card contents: school name header, photo placeholder, name, admission #, class, stream, blood group, DOB, house, parent contact, validity period, principal signature line, and QR code.
        </div>
      </div>
    </div>
  );
}

// ---------- Main component ----------
export default function StudentPortal() {
  const [students, setStudents] = useState([]);
  const [current, setCurrent] = useState(null);
  const [tab, setTab] = useState('profile');
  const [catalog, setCatalog] = useState([]);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    setStudents(loadStudents());
    setCatalog(loadCatalog());
    setReservations(loadReservations());
  }, []);

  const persistStudents = useCallback((updated) => {
    setStudents(updated);
    saveStudents(updated);
  }, []);

  const persistCatalog = useCallback((updated) => {
    setCatalog(updated);
    saveCatalog(updated);
  }, []);

  const persistReservations = useCallback((updated) => {
    setReservations(updated);
    saveReservations(updated);
  }, []);

  const handleFound = (s) => { setCurrent(s); setTab('profile'); };
  const handleLogout = () => { setCurrent(null); };

  // Assignment submission: pending → submitted (with text + file URL)
  const submitAssignment = (id, draft) => {
    if (!current) return;
    const updatedStudents = students.map(s => {
      if (s.admissionNo !== current.admissionNo) return s;
      const assignments = s.assignments.map(a => a.id === id ? {
        ...a,
        status: 'submitted',
        submission: {
          text: draft.text.trim(),
          fileUrl: draft.fileUrl.trim(),
          submittedAt: new Date().toISOString(),
          grade: null,
          feedback: null,
        },
      } : a);
      return { ...s, assignments };
    });
    persistStudents(updatedStudents);
    const fresh = updatedStudents.find(s => s.admissionNo === current.admissionNo);
    setCurrent(fresh);
  };

  // Assignment withdrawal (called after window.confirm)
  const withdrawAssignment = (id) => {
    if (!current) return;
    const updatedStudents = students.map(s => {
      if (s.admissionNo !== current.admissionNo) return s;
      const assignments = s.assignments.map(a => a.id === id ? { ...a, status: 'pending', submission: null } : a);
      return { ...s, assignments };
    });
    persistStudents(updatedStudents);
    const fresh = updatedStudents.find(s => s.admissionNo === current.admissionNo);
    setCurrent(fresh);
  };

  // Library: reserve a catalog book (stored in localStorage, decrements available)
  const reserveBook = (book) => {
    if (!current) return;
    const existing = reservations.find(r => r.bookId === book.id && r.studentAdmissionNo === current.admissionNo);
    if (existing) {
      alert('You have already reserved this book.');
      return;
    }
    if (book.available <= 0) {
      alert('This book has no available copies to reserve.');
      return;
    }
    const newRes = {
      bookId: book.id,
      bookTitle: book.title,
      studentAdmissionNo: current.admissionNo,
      studentName: current.name,
      reservedAt: new Date().toISOString(),
    };
    persistReservations([...reservations, newRes]);
    const updatedCatalog = catalog.map(b => b.id === book.id ? { ...b, available: Math.max(0, b.available - 1) } : b);
    persistCatalog(updatedCatalog);
  };

  // Library: cancel a reservation (called after window.confirm)
  const cancelReservation = (bookId) => {
    if (!current) return;
    const target = reservations.find(r => r.bookId === bookId && r.studentAdmissionNo === current.admissionNo);
    if (!target) return;
    persistReservations(reservations.filter(r => !(r.bookId === bookId && r.studentAdmissionNo === current.admissionNo)));
    const updatedCatalog = catalog.map(b => b.id === bookId ? { ...b, available: b.available + 1 } : b);
    persistCatalog(updatedCatalog);
  };

  // PDF: Fee statement (jsPDF)
  const handleFeeStatement = (student) => {
    try {
      generateFeeStatementPdf(student);
    } catch (e) {
      console.error('Fee PDF generation failed:', e);
      alert('Sorry, the fee statement PDF could not be generated. Please try again.');
    }
  };

  // PDF: ID card with QR code (async jsPDF + QRCode)
  const handleIdCard = async (student) => {
    try {
      await generateIdCardPdf(student);
    } catch (e) {
      console.error('ID card PDF generation failed:', e);
      alert('Sorry, the ID card PDF could not be generated. Please try again.');
    }
  };

  // ---------- Render ----------
  if (!current) {
    return (
      <div className="page-container" style={{ background: NAVY, minHeight: 'calc(100vh - 40px)' }}>
        <LookupScreen students={students} onFound={handleFound} />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ background: NAVY, color: TEXT_PRIMARY, minHeight: 'calc(100vh - 40px)' }}>
      {/* Top header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16, padding: 16, background: NAVY_LIGHT, borderRadius: 10, border: `1px solid ${NAVY_BORDER}` }}>
        <div>
          <h1 className="page-title" style={{ color: PURPLE, marginBottom: 4 }}>🎓 Student Portal</h1>
          <div style={{ fontSize: 13, color: TEXT_SECONDARY }}>
            Welcome, <strong style={{ color: TEXT_PRIMARY }}>{current.name}</strong> • {current.class} • Adm #{current.admissionNo}
          </div>
        </div>
        <button onClick={handleLogout} style={{ padding: '8px 16px', background: NAVY, color: PURPLE, border: `1px solid ${PURPLE}`, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
          ⏏ Switch student
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: `2px solid ${PURPLE_DARK}`, marginBottom: 20, paddingBottom: 0, background: NAVY_LIGHT, borderRadius: '10px 10px 0 0', padding: '4px 4px 0' }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 14px',
                background: active ? PURPLE : 'transparent',
                color: active ? 'white' : TEXT_SECONDARY,
                border: 0,
                borderBottom: active ? `3px solid ${PURPLE_DARK}` : '3px solid transparent',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                whiteSpace: 'nowrap',
                borderRadius: '6px 6px 0 0',
                marginBottom: -2,
              }}
            >
              <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
            </button>
          );
        })}
      </div>

      {/* Active tab body */}
      <div style={{ background: NAVY_CARD, padding: 16, borderRadius: 10, border: `1px solid ${NAVY_BORDER}`, minHeight: 320 }}>
        {tab === 'profile' && <ProfileTab student={current} />}
        {tab === 'attendance' && <AttendanceTab student={current} />}
        {tab === 'marks' && <MarksTab student={current} />}
        {tab === 'assignments' && <AssignmentsTab student={current} onSubmit={submitAssignment} onWithdraw={withdrawAssignment} />}
        {tab === 'exams' && <ExamScheduleTab student={current} />}
        {tab === 'timetable' && <TimetableTab student={current} />}
        {tab === 'announcements' && <AnnouncementsTab student={current} />}
        {tab === 'library' && <LibraryTab student={current} catalog={catalog} reservations={reservations} onReserve={reserveBook} onCancelReservation={cancelReservation} />}
        {tab === 'fees' && <FeesTab student={current} onGenerate={handleFeeStatement} />}
        {tab === 'id' && <IdCardTab student={current} onGenerate={handleIdCard} />}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: TEXT_MUTED, textAlign: 'center' }}>
        {SCHOOL_NAME} • Student Portal v2 • Data stored locally in your browser (localStorage prefix: <code style={{ color: PURPLE }}>erp_student_</code>).
      </div>
    </div>
  );
}
