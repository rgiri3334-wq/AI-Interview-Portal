import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import CandidateDetails from './pages/CandidateDetails';
import Dashboard from './pages/Dashboard';
import LiveInterview from './pages/LiveInterview';
import Report from './pages/Report';
import ReportList from './pages/ReportList';
import AdminPanel from './pages/AdminPanel';
import CandidateRegister from './pages/CandidateRegister';
import CandidateLogin from './pages/CandidateLogin';
import SystemHealth from './pages/SystemHealth';
import AdminManagement from './pages/AdminManagement';
import CandidateLanding from './pages/CandidateLanding';
import EquipmentTest from './pages/EquipmentTest';
import KycGuidelines from './pages/KycGuidelines';
import KycCapture from './pages/KycCapture';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Caught rendering error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-3xl font-black text-red-700 mb-4">A critical error occurred.</h1>
          <p className="text-slate-600 mb-8">The application encountered an unexpected state. Please return to the homepage.</p>
          <a href="/" className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow hover:bg-red-700 transition">
            Return Home
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}

const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  const role = sessionStorage.getItem('role') || 'admin';

  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'candidate') return <Navigate to="/candidate" replace />;
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          {/* ── Candidate OTP Auth Routes (Sprint 1) ── */}
          <Route path="/candidate-register" element={<CandidateRegister />} />
          <Route path="/candidate-login" element={<CandidateLogin />} />
          {/* ── Existing Protected Routes (unchanged) ── */}
          <Route path="/candidate-home" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><CandidateLanding /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute allowedRoles={['admin']}><Landing /></ProtectedRoute>} />
          <Route path="/candidate" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><CandidateDetails /></ProtectedRoute>} />
          
          {/* ── KYC Pre-Flight Pipeline ── */}
          <Route path="/equipment-test" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><EquipmentTest /></ProtectedRoute>} />
          <Route path="/kyc-guidelines" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><KycGuidelines /></ProtectedRoute>} />
          <Route path="/kyc-capture" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><KycCapture /></ProtectedRoute>} />
          
          <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute allowedRoles={['admin', 'candidate']}><LiveInterview /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute allowedRoles={['admin']}><ReportList /></ProtectedRoute>} />
          <Route path="/report/:id" element={<ProtectedRoute allowedRoles={['admin']}><Report /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
          <Route path="/system-health" element={<ProtectedRoute allowedRoles={['admin']}><SystemHealth /></ProtectedRoute>} />
          <Route path="/admin-management" element={<ProtectedRoute allowedRoles={['admin']}><AdminManagement /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
