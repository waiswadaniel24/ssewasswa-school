// FileName: src/router/router.jsx
// Ssewasswa School ERP V10 - EMIS Uganda Compliant

import React, { useMemo, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canAccess } from '../config/accessControl.js';
import { useLocation } from 'react-router-dom';

// Non-lazy imports (needed immediately before auth is ready)
import SystemSetup from '../pages/SystemSetup.jsx';
import Login from '../pages/Login.jsx';
import Activation from '../pages/Activation.jsx';
import ProductLanding from '../pages/ProductLanding.jsx';
import Welcome from '../pages/Welcome.jsx';
import Admin from '../pages/Admin.jsx';
import QuickLicense from '../pages/QuickLicense.jsx';
import SAASPortal from '../pages/SAASPortal.jsx';
import HMISLanding from '../pages/HMISLanding.jsx';
import HMISLayout from '../layout/HMISLayout.jsx';
import HMISDashboard from '../pages/hmis/Dashboard.jsx';
import HMISPatients from '../pages/hmis/Patients.jsx';
import HMISOPD from '../pages/hmis/OPD.jsx';
import HMISLab from '../pages/hmis/Lab.jsx';
import HMISPharmacy from '../pages/hmis/Pharmacy.jsx';
import HMISBilling from '../pages/hmis/Billing.jsx';
import SchoolSignup from '../pages/SchoolSignup.jsx';
import ResetPassword from '../pages/ResetPassword.jsx';
import Sponsor from '../pages/Sponsor.jsx';
import Donors from '../pages/Donors.jsx';
import News from '../pages/News.jsx';
import BusinessDirectory from '../pages/BusinessDirectory.jsx';
// ─── Loading fallback (defined FIRST so AuthCallback can use it) ──
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

function AuthCallback() {
    const { user, authReady } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
        if (!authReady) return;
        navigate(user?.isDeveloper ? '/dev' : '/', { replace: true });
    }, [authReady, navigate, user?.isDeveloper]);
    return <LoadingFallback />;
}

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
const NetworkSetup = React.lazy(() => import('../pages/NetworkSetup.jsx'));
const Manuals = React.lazy(() => import('../pages/Manuals.jsx'));
const About = React.lazy(() => import('../pages/About.jsx'));
const Terms = React.lazy(() => import('../pages/Terms.jsx'));
const Copyright = React.lazy(() => import('../pages/Copyright.jsx'));
const SchoolManagement = React.lazy(() => import('../pages/SchoolManagement.jsx'));
const DevDashboard = React.lazy(() => import('../pages/DevDashboard.jsx'));

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

// ─── Root route component (REACTIVE — replaces the broken IIFE) ──
// Earlier this was an IIFE inside the router config, which only ran ONCE
// at router creation. After login (user state changes), the IIFE never
// re-evaluated → users got bounced back to SAASPortal instead of going
// to /app. This component re-renders when auth state changes.
//
// Routing logic:
//   desktop (Electron)        → /app
//   web + logged in + isDeveloper → /app/dev
//   web + logged in            → /app
//   web + guest                → SAASPortal (product selector)
const RootRoute = () => {
    const { user, authReady } = useAuth();
    const isElectron = typeof window !== 'undefined' && (
        !!window.electronAPI ||
        (navigator.userAgent && navigator.userAgent.toLowerCase().includes('electron'))
    );

    // On desktop, always go to /app — desktop users don't see marketing
    if (isElectron) return <Navigate to="/app" replace />;

    // Wait for auth state to settle (Supabase session check)
    if (!authReady) return <LoadingFallback />;

    // Logged in as developer → go to dev dashboard
    if (user?.isDeveloper) return <Navigate to="/app/dev" replace />;

    // Logged in as regular user → go to School ERP (default product)
    if (user) return <Navigate to="/app" replace />;

    // Guest → show the SaaS Portal (product selector)
    return <PublicRoute><SAASPortal /></PublicRoute>;
};

// ─── Auth-protected layout (shows ProductLanding for guests, Layout for users) ──
// Unauthenticated visitors hitting '/' (the root URL) see the marketing/product-landing
// page (with subscription tiers + benefits) instead of being immediately bounced to /login.
// This is important for SEO — Google searchers who click the search result land on a
// meaningful marketing page, not the bare login form.
const ProtectedLayout = () => {
    const { user, authReady } = useAuth();
    // While auth state is still loading, show the loading fallback (don't redirect)
    if (!authReady) {
        return (
            <Suspense fallback={<LoadingFallback />}>
                <LoadingFallback />
            </Suspense>
        );
    }
    // Unauthenticated visitor → show the marketing landing page (public)
    if (!user) {
        return (
            <Suspense fallback={<LoadingFallback />}>
                <ProductLanding />
            </Suspense>
        );
    }
    // Authenticated user → render the full School ERP Layout (sidebar + main content)
    return (
        <Suspense fallback={<LoadingFallback />}>
            <Layout />
        </Suspense>
    );
};

// ─── Auth-protected HMIS Layout (separate from School ERP Layout) ───
// Earlier HMIS routes used <ProtectedLayout /> which renders the School ERP
// Sidebar with menu items like 'Students', 'Library', 'Transport' — clicking
// any of them navigated to /app/* paths (School ERP routes). So HMIS users
// appeared to "be in School ERP" because the sidebar WAS School ERP.
// Fix: HMIS routes use this ProtectedHMISLayout that renders <HMISLayout />
// (which uses <HMISSidebar /> with HMIS menu items: Dashboard, Patients,
// OPD, Lab, Pharmacy, Billing — all navigating to /hmis/* paths).
const ProtectedHMISLayout = () => {
    const { user, authReady } = useAuth();
    if (!authReady) {
        return (
            <Suspense fallback={<LoadingFallback />}>
                <LoadingFallback />
            </Suspense>
        );
    }
    if (!user) {
        // Unauthenticated visitor → show HMIS marketing landing page
        return (
            <Suspense fallback={<LoadingFallback />}>
                <HMISLanding />
            </Suspense>
        );
    }
    // Authenticated user → render the HMIS Layout
    return (
        <Suspense fallback={<LoadingFallback />}>
            <HMISLayout />
        </Suspense>
    );
};

// ─── Lock wrapper (redirects to /activation if trial expired) ──
const Lock = ({ isLocked, children }) => {
    if (isLocked) return <Navigate to="/activation" replace />;
    return children;
};

// ─── Protected route (auth + lock + lazy + error boundary) ──
const ProtectedRoute = ({ isLocked, children, pageName }) => {
    // Note: On web (no Electron), ERP pages will show their own loading/empty state
    // (most pages check for window.electronAPI and handle it gracefully)
    const { user, authReady, schoolLevel } = useAuth();
    const location = useLocation();
    if (!authReady) return <LoadingFallback />;
    const path = location.pathname === '/' ? '/' : location.pathname;

    // DEVELOPER BYPASS: developers can access ALL routes without canAccess check.
    // Earlier devs were blocked from /app/staff, /app/finance, etc. because the
    // MENU_ITEMS roles list doesn't include 'Developer' — they could only access
    // /app/dev. Now devs skip canAccess entirely.
    const isDeveloper = Boolean(user?.isDeveloper);
    const allowed = isDeveloper || path === '/' || canAccess(user?.role || 'Viewer', schoolLevel, path);

    if (!allowed) return <Navigate to="/" replace />;

    return (
        <Lock isLocked={isLocked}>
            <RouteErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                    {children}
                </Suspense>
            </RouteErrorBoundary>
        </Lock>
    );
};

const DeveloperRoute = ({ isLocked, children }) => {
    const { user, authReady } = useAuth();
    if (!authReady) return <LoadingFallback />;
    const isDeveloper = Boolean(user?.isDeveloper);
    if (!isDeveloper) return <Navigate to="/" replace />;
    return (
        <Lock isLocked={isLocked}>
            <RouteErrorBoundary>
                <Suspense fallback={<LoadingFallback />}>
                    {children}
                </Suspense>
            </RouteErrorBoundary>
        </Lock>
    );
};

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
    const router = useMemo(() => createBrowserRouter([
        // ─── Public routes (no auth required) ─────────────
        {
            path: '/setup',
            element: isInitialized ? <Navigate to="/login" replace /> : <PublicRoute><SystemSetup /></PublicRoute>
        },
        {
            path: '/auth/callback',
            element: <PublicRoute><AuthCallback /></PublicRoute>
        },
        {
            path: '/welcome',
            element: <PublicRoute><Welcome /></PublicRoute>
        },
        {
            path: '/admin',
            element: <DeveloperRoute><Admin /></DeveloperRoute>
        },
        {
            path: '/quick-license',
            element: <DeveloperRoute><QuickLicense /></DeveloperRoute>
        },
        {
            path: '/login',
            element: <PublicRoute><Login /></PublicRoute>
        },
        {
            path: '/activation',
            element: <PublicRoute><Activation /></PublicRoute>
        },
        {
    path: '/school-signup',
    element: <PublicRoute><SchoolSignup /></PublicRoute>
},
        {
            path: '/reset-password',
            element: <PublicRoute><ResetPassword /></PublicRoute>
        },

        // ─── Root route — REACTIVE component (was IIFE, which only ran once) ───
        // RootRoute uses useAuth() so it re-renders when auth state changes.
        // Logic: desktop → /app; web + dev → /app/dev; web + user → /app; web + guest → SAASPortal.
        // The dev-user redirect was previously handled inside AuthContext.login() via
        // setTimeout + window.history.replaceState + popstate — that caused blinking loops.
        // Now RootRoute handles all auth-aware redirects cleanly.
        {
            path: '/',
            element: <RootRoute />
        },
        // ─── HMIS Landing (public) ───
        {
            path: '/hmis-landing',
            element: <PublicRoute><HMISLanding /></PublicRoute>
        },
        // ─── Product Landing (public) — detailed marketing/pricing page ───
        // Used by SAASPortal "Explore" button + referenced by sitemap.xml + SEO.
        // Without this route, /product-landing hit the catch-all '*' → redirected
        // to '/' (SAASPortal) so the "Explore" button was a no-op.
        {
            path: '/product-landing',
            element: <PublicRoute><ProductLanding /></PublicRoute>
        },
        // ─── Sponsor / Donor / News / Business Directory (public marketplace) ───
        // Anyone can browse; subscribing to advertise/connect/receive news requires payment.
        {
            path: '/sponsor',
            element: <PublicRoute><Sponsor /></PublicRoute>
        },
        {
            path: '/donors',
            element: <PublicRoute><Donors /></PublicRoute>
        },
        {
            path: '/news',
            element: <PublicRoute><News /></PublicRoute>
        },
        {
            path: '/business-directory',
            element: <PublicRoute><BusinessDirectory /></PublicRoute>
        },
        // ─── HMIS App (protected + uses HMIS Layout, not School ERP) ───
        // CRITICAL FIX: Earlier this used <ProtectedLayout /> which renders the
        // School ERP Sidebar — so HMIS users saw 'Students', 'Library', 'Transport'
        // menu items and clicking them navigated to /app/* paths (leaving HMIS).
        // Now uses <ProtectedHMISLayout /> which renders <HMISLayout /> with
        // <HMISSidebar /> showing HMIS menu items (Dashboard, Patients, OPD, Lab,
        // Pharmacy, Billing) that navigate to /hmis/* paths.
        {
            path: '/hmis',
            element: <ProtectedHMISLayout />,
            children: [
                { index: true, element: <ProtectedRoute isLocked={isLocked}><HMISDashboard /></ProtectedRoute> },
                { path: 'patients', element: <ProtectedRoute isLocked={isLocked}><HMISPatients /></ProtectedRoute> },
                { path: 'opd', element: <ProtectedRoute isLocked={isLocked}><HMISOPD /></ProtectedRoute> },
                { path: 'lab', element: <ProtectedRoute isLocked={isLocked}><HMISLab /></ProtectedRoute> },
                { path: 'pharmacy', element: <ProtectedRoute isLocked={isLocked}><HMISPharmacy /></ProtectedRoute> },
                { path: 'billing', element: <ProtectedRoute isLocked={isLocked}><HMISBilling /></ProtectedRoute> },
            ]
        },
        // ─── School ERP (protected) ───
        {
            path: '/app',
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
                { path: 'network-setup', element: <ProtectedRoute isLocked={isLocked}><NetworkSetup /></ProtectedRoute> },
                { path: 'manuals', element: <ProtectedRoute isLocked={isLocked}><Manuals /></ProtectedRoute> },
                { path: 'school-management', element: <ProtectedRoute isLocked={isLocked}><SchoolManagement /></ProtectedRoute> },
                { path: 'about', element: <ProtectedRoute isLocked={isLocked}><About /></ProtectedRoute> },
                { path: 'terms', element: <ProtectedRoute isLocked={isLocked}><Terms /></ProtectedRoute> },
                { path: 'copyright', element: <ProtectedRoute isLocked={isLocked}><Copyright /></ProtectedRoute> },

                // Developer tools
                { path: 'dev', element: <DeveloperRoute isLocked={isLocked}><DevDashboard /></DeveloperRoute> },
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