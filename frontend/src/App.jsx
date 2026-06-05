import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import CandidateDetails from './pages/CandidateDetails';
import Dashboard from './pages/Dashboard';
import LiveInterview from './pages/LiveInterview';
import Report from './pages/Report';
import AdminPanel from './pages/AdminPanel';
import CandidateRegister from './pages/CandidateRegister';
import CandidateLogin from './pages/CandidateLogin';

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

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  return isAuthenticated ? children : <Navigate to="/" replace />;
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
          <Route path="/home" element={<ProtectedRoute><Landing /></ProtectedRoute>} />
          <Route path="/candidate" element={<ProtectedRoute><CandidateDetails /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/interview" element={<ProtectedRoute><LiveInterview /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><Report /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
