import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import CandidateLogin from './pages/CandidateLogin';
import VerifyInvitation from './pages/VerifyInvitation';
import LoadingScreen from './components/UI/LoadingScreen';
import { lazyWithReload } from './utils/lazyWithReload';

// ── Route-Level Code Splitting ──────────────────────────────────────────────
// Heavy pages are lazy-loaded so the initial login bundle stays tiny (~50KB).
// Three.js, Recharts, Monaco Editor, etc. are only downloaded when needed.
const Landing = React.lazy(() => import('./pages/Landing'));
const CandidateDetails = React.lazy(() => import('./pages/CandidateDetails'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const LiveInterview = lazyWithReload(() => import('./pages/LiveInterview'), 'live-interview');
const Report = React.lazy(() => import('./pages/Report'));
const ReportList = React.lazy(() => import('./pages/ReportList'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const AdminCandidateRegistration = React.lazy(() => import('./pages/AdminCandidateRegistration'));
const SystemHealth = React.lazy(() => import('./pages/SystemHealth'));
const AdminManagement = React.lazy(() => import('./pages/AdminManagement'));
const AILearningPage = React.lazy(() => import('./pages/AILearningPage'));
const CandidateLanding = React.lazy(() => import('./pages/CandidateLanding'));
const EquipmentTest = React.lazy(() => import('./pages/EquipmentTest'));
const ProfilePhotoGuidelines = React.lazy(() => import('./pages/ProfilePhotoGuidelines'));
const ProfilePhotoCapture = React.lazy(() => import('./pages/ProfilePhotoCapture'));
// ── Phase 1+2: Candidate Portal Upgrade ─────────────────────────────────────
const CandidateHome = React.lazy(() => import('./pages/CandidateHome'));
const ScheduleInterview = React.lazy(() => import('./pages/ScheduleInterview'));
const InterviewGoodbye = React.lazy(() => import('./pages/InterviewGoodbye'));
const VideoIntroPage = React.lazy(() => import('./pages/VideoIntroPage'));
const InterviewPrepKit = React.lazy(() => import('./pages/InterviewPrepKit'));
const CandidateOnboarding = React.lazy(() => import('./pages/CandidateOnboarding'));

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error("[ErrorBoundary]", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-3xl font-black text-red-700 mb-4">A critical error occurred.</h1>
          <p className="text-slate-600 mb-8">The application encountered an unexpected state. Please return to the homepage.</p>
          <a href="/" className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow hover:bg-red-700 transition">Return Home</a>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  const rawRole = sessionStorage.getItem('role') || null;
  
  // Normalize ANY backend admin role to the frontend's generic 'admin' role
  const role = rawRole === 'candidate' ? 'candidate' : 'admin';

  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'candidate') return <Navigate to="/candidate-home" replace />;
    
    // Security Fix: If the session is corrupted or lacks a valid role, clear it
    // and force re-authentication to prevent infinite redirect loops between / and /home
    sessionStorage.removeItem('isAuthenticated');
    sessionStorage.removeItem('role');
    return <Navigate to="/" replace />;
  }

  return children;
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <React.Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<Login />} />

            {/* ── Candidate OTP Auth Routes ── */}
            <Route path="/candidate-login" element={<CandidateLogin />} />
            <Route path="/verify-invitation" element={<VerifyInvitation />} />
            <Route path="/candidate-onboarding" element={<ProtectedRoute allowedRoles={['candidate']}><CandidateOnboarding /></ProtectedRoute>} />

            {/* ── Candidate Portal (Phase 1 Upgrade) ── */}
            <Route path="/candidate-home" element={<ProtectedRoute allowedRoles={['candidate']}><CandidateHome /></ProtectedRoute>} />
            <Route path="/schedule-interview" element={<ProtectedRoute allowedRoles={['candidate']}><ScheduleInterview /></ProtectedRoute>} />
            <Route path="/interview-goodbye" element={<ProtectedRoute allowedRoles={['candidate']}><InterviewGoodbye /></ProtectedRoute>} />
            <Route path="/video-intro" element={<ProtectedRoute allowedRoles={['candidate']}><VideoIntroPage /></ProtectedRoute>} />
            <Route path="/prep-kit" element={<ProtectedRoute allowedRoles={['candidate']}><InterviewPrepKit /></ProtectedRoute>} />

            {/* ── Candidate marketing landing (public-facing, unchanged) ── */}
            <Route path="/candidate-landing" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><CandidateLanding /></ProtectedRoute>} />

            {/* ── Existing Protected Routes (unchanged) ── */}
            <Route path="/home" element={<ProtectedRoute allowedRoles={['admin']}><Landing /></ProtectedRoute>} />
            <Route path="/candidate" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><CandidateDetails /></ProtectedRoute>} />
            <Route path="/ai-learning" element={<ProtectedRoute allowedRoles={['admin']}><AILearningPage /></ProtectedRoute>} />

            {/* ── KYC Pre-Flight Pipeline ── */}
            <Route path="/equipment-test" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><EquipmentTest /></ProtectedRoute>} />
            <Route path="/profile-photo-guidelines" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><ProfilePhotoGuidelines /></ProtectedRoute>} />
            <Route path="/profile-photo-capture" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><ProfilePhotoCapture /></ProtectedRoute>} />

            {/* ── Admin Routes ── */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
            <Route path="/admin-candidate-registration" element={<ProtectedRoute allowedRoles={['admin']}><AdminCandidateRegistration /></ProtectedRoute>} />
            <Route path="/interview" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><LiveInterview /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute allowedRoles={['admin']}><ReportList /></ProtectedRoute>} />
            <Route path="/report/:id" element={<ProtectedRoute allowedRoles={['admin']}><Report /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
            <Route path="/system-health" element={<ProtectedRoute allowedRoles={['admin']}><SystemHealth /></ProtectedRoute>} />
            <Route path="/admin-management" element={<ProtectedRoute allowedRoles={['admin']}><AdminManagement /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
