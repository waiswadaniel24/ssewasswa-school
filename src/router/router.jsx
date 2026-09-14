// FileName: src/router/router.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useMemo, Suspense } from 'react';
import { createHashRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

// Non-lazy imports (needed immediately before auth is ready)
import SystemSetup from '../pages/SystemSetup.jsx';
import Login from '../pages/Login.jsx';
import Activation from '../pages/Activation.jsx';

// ─── Lazy-loaded pages (code-split for faster startup) ─────
const Dashboard = React.lazy(() => import('../pages/Dashboard.jsx'));
const Layout = React.lazy(() => import('../layout/Layout.jsx'));

// Student Management
const Students = React.lazy(() => import('../pages/Students.jsx'));
const StudentProfile = React.lazy(() => import('../pages/StudentProfile.jsx'));
const StudentHistory = React.lazy(() => import('../pages/StudentHistory.jsx'));
const Requirements = React.lazy(() => import('../pages/Requirements.jsx'));
const Promotion = React.lazy(() => import('../pages/Promotion.jsx'));
const Dropouts = React.lazy(() => import('../pages/Dropouts.jsx'));
const MilitaryGrades = React.lazy(() => import('../pages/MilitaryGrades.jsx'));

// Staff Management
const Staff = React.lazy(() => import('../pages/Staff.jsx'));
const StaffProfile = React.lazy(() => import('../pages/StaffProfile.jsx'));
const TeacherQualifications = React.lazy(() => import('../pages/TeacherQualifications.jsx'));
const Payroll = React.lazy(() => import('../pages/Payroll.jsx'));
const PayrollDeductions = React.lazy(() => import('../pages/PayrollDeductions.jsx'));

// Academics
const Academics = React.lazy(() => import('../pages/Academics.jsx'));
const Attendance = React.lazy(() => import('../pages/Attendance.jsx'));
const Timetable = React.lazy(() => import('../pages/Timetable.jsx'));
const Calendar = React.lazy(() => import('../pages/Calendar.jsx'));
const Discipline = React.lazy(() => import('../pages/Discipline.jsx'));

// Examinations
const Exams = React.lazy(() => import('../pages/Exams.jsx'));
const ExamResults = React.lazy(() => import('../pages/ExamResults.jsx'));
const BroadSheet = React.lazy(() => import('../pages/BroadSheet.jsx'));
const ReportCards = React.lazy(() => import('../pages/ReportCards.jsx'));
const IDCards = React.lazy(() => import('../pages/IDCards.jsx'));
const UNEBRegistration = React.lazy(() => import('../pages/UNEBRegistration.jsx'));

// Finance
const Finance = React.lazy(() => import('../pages/Finance.jsx'));
const Payments = React.lazy(() => import('../pages/Payments.jsx'));
const Debts = React.lazy(() => import('../pages/Debts.jsx'));
const SchoolFinances = React.lazy(() => import('../pages/SchoolFinances.jsx'));
const Accounting = React.lazy(() => import('../pages/Accounting.jsx'));
const Canteen = React.lazy(() => import('../pages/Canteen.jsx'));
const PurchaseAuthorization = React.lazy(() => import('../pages/PurchaseAuthorization.jsx'));

// Services
const Library = React.lazy(() => import('../pages/Library.jsx'));
const Transport = React.lazy(() => import('../pages/Transport.jsx'));
const GateBook = React.lazy(() => import('../pages/GateBook.jsx'));
const Broadcast = React.lazy(() => import('../pages/Broadcast.jsx'));
const Extracurricular = React.lazy(() => import('../pages/Extracurricular.jsx'));
const MeetingMinutes = React.lazy(() => import('../pages/MeetingMinutes.jsx'));
const SignatureManagement = React.lazy(() => import('../pages/SignatureManagement.jsx'));
const GenerateDocs = React.lazy(() => import('../pages/GenerateDocs.jsx'));

// Early Childhood
const Nursery = React.lazy(() => import('../pages/Nursery.jsx'));
const ECD = React.lazy(() => import('../pages/ECD.jsx'));

// EMIS Compliance
const KPIDashboard = React.lazy(() => import('../pages/KPIDashboard.jsx'));
const Infrastructure = React.lazy(() => import('../pages/Infrastructure.jsx'));
const WASH = React.lazy(() => import('../pages/WASH.jsx'));
const Latrines = React.lazy(() => import('../pages/Latrines.jsx'));
const Governance = React.lazy(() => import('../pages/Governance.jsx'));
const HealthNutrition = React.lazy(() => import('../pages/HealthNutrition.jsx'));
const SpecialNeeds = React.lazy(() => import('../pages/SpecialNeeds.jsx'));
const Textbooks = React.lazy(() => import('../pages/Textbooks.jsx'));
const EMISReport = React.lazy(() => import('../pages/EMISReport.jsx'));
const EMISConfig = React.lazy(() => import('../pages/EMISConfig.jsx'));
const Enrollment = React.lazy(() => import('../pages/Enrollment.jsx'));
const DataValidation = React.lazy(() => import('../pages/DataValidation.jsx'));
const DataExport = React.lazy(() => import('../pages/DataExport.jsx'));

// Administration
const Users = React.lazy(() => import('../pages/Users.jsx'));
const Settings = React.lazy(() => import('../pages/Settings.jsx'));
const Manuals = React.lazy(() => import('../pages/Manuals.jsx'));
const About = React.lazy(() => import('../pages/About.jsx'));
const Terms = React.lazy(() => import('../pages/Terms.jsx'));
const Copyright = React.lazy(() => import('../pages/Copyright.jsx'));
const SchoolManagement = React.lazy(() => import('../pages/SchoolManagement.jsx'));
const DevDashboard = React.lazy(() => import('../pages/DevDashboard.jsx'));

// ─── Loading fallback (uses inline styles, NOT Tailwind) ──
const LoadingFallback = () => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '300px',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
        <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e0e0e0',
            borderTopColor: '#1a73e8',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ marginTop: '12px', color: '#5f6368', fontSize: '14px' }}>Loading module...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
);

// ─── Error fallback for failed lazy imports ─────────────────
const ErrorFallback = ({ error, resetError }) => (
    <div style={{
        padding: '40px',
        textAlign: 'center',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
        <h2 style={{ color: '#d32f2f', marginBottom: '10px' }}>⚠️ Module Failed to Load</h2>
        <p style={{ color: '#666', marginBottom: '20px' }}>
            {error?.message || 'An error occurred while loading this page.'}
        </p>
        <button
            onClick={resetError}
            style={{
                padding: '10px 20px',
                background: '#1a73e8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
            }}
        >
            Try Again
        </button>
    </div>
);

// ─── Error boundary wrapper for lazy components ─────────────
class RouteErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Route load error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <ErrorFallback
                    error={this.state.error}
                    resetError={() => this.setState({ hasError: false, error: null })}
                />
            );
        }
        return this.props.children;
    }
}

// ─── Auth-protected layout (redirects to /login if no user) ──
const ProtectedLayout = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Layout />
        </Suspense>
    );
};

// ─── Lock wrapper (redirects to /activation if trial expired) ──
const Lock = ({ isLocked, children }) => {
    if (isLocked) return <Navigate to="/activation" replace />;
    return children;
};

// ─── Protected route (auth + lock + lazy + error boundary) ──
const ProtectedRoute = ({ isLocked, children }) => (
    <Lock isLocked={isLocked}>
        <RouteErrorBoundary>
            <Suspense fallback={<LoadingFallback />}>
                {children}
            </Suspense>
        </RouteErrorBoundary>
    </Lock>
);

// ─── Public route (no auth needed, still lazy + error boundary) ──
const PublicRoute = ({ children }) => (
    <RouteErrorBoundary>
        <Suspense fallback={<LoadingFallback />}>
            {children}
        </Suspense>
    </RouteErrorBoundary>
);

// ═══════════════════════════════════════════════════════════
// MAIN ROUTER
// ═══════════════════════════════════════════════════════════

export default function AppRouter({ isInitialized, isLocked }) {
    const router = useMemo(() => createHashRouter([
        // ─── Public routes (no auth required) ─────────────
        {
            path: '/setup',
            element: isInitialized ? <Navigate to="/login" replace /> : <PublicRoute><SystemSetup /></PublicRoute>
        },
        {
            path: '/login',
            element: isInitialized ? <PublicRoute><Login /></PublicRoute> : <Navigate to="/setup" replace />
        },
        {
            path: '/activation',
            element: <PublicRoute><Activation /></PublicRoute>
        },

        // ─── Protected routes (auth + lock required) ──────
        {
            path: '/',
            element: <ProtectedLayout />,
            children: [
                // Dashboard
                { index: true, element: <ProtectedRoute isLocked={isLocked}><Dashboard /></ProtectedRoute> },

                // Student Management
                { path: 'students', element: <ProtectedRoute isLocked={isLocked}><Students /></ProtectedRoute> },
                { path: 'student/:id', element: <ProtectedRoute isLocked={isLocked}><StudentProfile /></ProtectedRoute> },
                { path: 'student-history', element: <ProtectedRoute isLocked={isLocked}><StudentHistory /></ProtectedRoute> },
                { path: 'requirements', element: <ProtectedRoute isLocked={isLocked}><Requirements /></ProtectedRoute> },
                { path: 'promotion', element: <ProtectedRoute isLocked={isLocked}><Promotion /></ProtectedRoute> },
                { path: 'dropouts', element: <ProtectedRoute isLocked={isLocked}><Dropouts /></ProtectedRoute> },
                { path: 'military-grades', element: <ProtectedRoute isLocked={isLocked}><MilitaryGrades /></ProtectedRoute> },

                // Staff Management
                { path: 'staff', element: <ProtectedRoute isLocked={isLocked}><Staff /></ProtectedRoute> },
                { path: 'staff/:id', element: <ProtectedRoute isLocked={isLocked}><StaffProfile /></ProtectedRoute> },
                { path: 'teacher-qualifications', element: <ProtectedRoute isLocked={isLocked}><TeacherQualifications /></ProtectedRoute> },
                { path: 'payroll', element: <ProtectedRoute isLocked={isLocked}><Payroll /></ProtectedRoute> },
                { path: 'deductions', element: <ProtectedRoute isLocked={isLocked}><PayrollDeductions /></ProtectedRoute> },

                // Academics
                { path: 'academics', element: <ProtectedRoute isLocked={isLocked}><Academics /></ProtectedRoute> },
                { path: 'attendance', element: <ProtectedRoute isLocked={isLocked}><Attendance /></ProtectedRoute> },
                { path: 'timetable', element: <ProtectedRoute isLocked={isLocked}><Timetable /></ProtectedRoute> },
                { path: 'calendar', element: <ProtectedRoute isLocked={isLocked}><Calendar /></ProtectedRoute> },
                { path: 'discipline', element: <ProtectedRoute isLocked={isLocked}><Discipline /></ProtectedRoute> },

                // Examinations
                { path: 'exams', element: <ProtectedRoute isLocked={isLocked}><Exams /></ProtectedRoute> },
                { path: 'exam-results', element: <ProtectedRoute isLocked={isLocked}><ExamResults /></ProtectedRoute> },
                { path: 'broad-sheet', element: <ProtectedRoute isLocked={isLocked}><BroadSheet /></ProtectedRoute> },
                { path: 'report-cards', element: <ProtectedRoute isLocked={isLocked}><ReportCards /></ProtectedRoute> },
                { path: 'id-cards', element: <ProtectedRoute isLocked={isLocked}><IDCards /></ProtectedRoute> },
                { path: 'uneb-exams', element: <ProtectedRoute isLocked={isLocked}><UNEBRegistration /></ProtectedRoute> },

                // Finance
                { path: 'finance', element: <ProtectedRoute isLocked={isLocked}><Finance /></ProtectedRoute> },
                { path: 'payments', element: <ProtectedRoute isLocked={isLocked}><Payments /></ProtectedRoute> },
                { path: 'debts', element: <ProtectedRoute isLocked={isLocked}><Debts /></ProtectedRoute> },
                { path: 'school-finances', element: <ProtectedRoute isLocked={isLocked}><SchoolFinances /></ProtectedRoute> },
                { path: 'accounting', element: <ProtectedRoute isLocked={isLocked}><Accounting /></ProtectedRoute> },
                { path: 'canteen', element: <ProtectedRoute isLocked={isLocked}><Canteen /></ProtectedRoute> },
                { path: 'purchases', element: <ProtectedRoute isLocked={isLocked}><PurchaseAuthorization /></ProtectedRoute> },

                // Services
                { path: 'library', element: <ProtectedRoute isLocked={isLocked}><Library /></ProtectedRoute> },
                { path: 'transport', element: <ProtectedRoute isLocked={isLocked}><Transport /></ProtectedRoute> },
                { path: 'gatebook', element: <ProtectedRoute isLocked={isLocked}><GateBook /></ProtectedRoute> },
                { path: 'broadcast', element: <ProtectedRoute isLocked={isLocked}><Broadcast /></ProtectedRoute> },
                { path: 'extracurricular', element: <ProtectedRoute isLocked={isLocked}><Extracurricular /></ProtectedRoute> },
                { path: 'meeting-minutes', element: <ProtectedRoute isLocked={isLocked}><MeetingMinutes /></ProtectedRoute> },
                { path: 'signatures', element: <ProtectedRoute isLocked={isLocked}><SignatureManagement /></ProtectedRoute> },
                { path: 'generate-docs', element: <ProtectedRoute isLocked={isLocked}><GenerateDocs /></ProtectedRoute> },

                // Early Childhood
                { path: 'nursery', element: <ProtectedRoute isLocked={isLocked}><Nursery /></ProtectedRoute> },
                { path: 'ecd', element: <ProtectedRoute isLocked={isLocked}><ECD /></ProtectedRoute> },

                // EMIS Compliance
                { path: 'kpi-dashboard', element: <ProtectedRoute isLocked={isLocked}><KPIDashboard /></ProtectedRoute> },
                { path: 'infrastructure', element: <ProtectedRoute isLocked={isLocked}><Infrastructure /></ProtectedRoute> },
                { path: 'wash', element: <ProtectedRoute isLocked={isLocked}><WASH /></ProtectedRoute> },
                { path: 'latrines', element: <ProtectedRoute isLocked={isLocked}><Latrines /></ProtectedRoute> },
                { path: 'governance', element: <ProtectedRoute isLocked={isLocked}><Governance /></ProtectedRoute> },
                { path: 'health-nutrition', element: <ProtectedRoute isLocked={isLocked}><HealthNutrition /></ProtectedRoute> },
                { path: 'special-needs', element: <ProtectedRoute isLocked={isLocked}><SpecialNeeds /></ProtectedRoute> },
                { path: 'textbooks', element: <ProtectedRoute isLocked={isLocked}><Textbooks /></ProtectedRoute> },
                { path: 'emis-report', element: <ProtectedRoute isLocked={isLocked}><EMISReport /></ProtectedRoute> },
                { path: 'emis-config', element: <ProtectedRoute isLocked={isLocked}><EMISConfig /></ProtectedRoute> },
                { path: 'enrollment', element: <ProtectedRoute isLocked={isLocked}><Enrollment /></ProtectedRoute> },
                { path: 'data-validation', element: <ProtectedRoute isLocked={isLocked}><DataValidation /></ProtectedRoute> },
                { path: 'data-export', element: <ProtectedRoute isLocked={isLocked}><DataExport /></ProtectedRoute> },

                // Administration
                { path: 'users', element: <ProtectedRoute isLocked={isLocked}><Users /></ProtectedRoute> },
                { path: 'settings', element: <ProtectedRoute isLocked={isLocked}><Settings /></ProtectedRoute> },
                { path: 'manuals', element: <ProtectedRoute isLocked={isLocked}><Manuals /></ProtectedRoute> },
                { path: 'school-management', element: <ProtectedRoute isLocked={isLocked}><SchoolManagement /></ProtectedRoute> },
                { path: 'about', element: <ProtectedRoute isLocked={isLocked}><About /></ProtectedRoute> },
                { path: 'terms', element: <ProtectedRoute isLocked={isLocked}><Terms /></ProtectedRoute> },
                { path: 'copyright', element: <ProtectedRoute isLocked={isLocked}><Copyright /></ProtectedRoute> },

                // Developer tools
                { path: 'dev', element: <ProtectedRoute isLocked={isLocked}><DevDashboard /></ProtectedRoute> },
            ]
        },

        // ─── Catch-all (redirect to home) ─────────────────
        {
            path: '*',
            element: <Navigate to="/" replace />
        }
    ]), [isInitialized, isLocked]);

    return <RouterProvider router={router} />;
}






