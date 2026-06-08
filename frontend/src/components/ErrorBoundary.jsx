/**
 * ErrorBoundary.jsx
 * Production-grade React Error Boundary.
 * Wraps pages so a crash in one component never shows a white screen.
 * Shows a polished recovery UI and logs the error.
 *
 * Usage:
 *   <ErrorBoundary pageName="Live Interview">
 *     <LiveInterview />
 *   </ErrorBoundary>
 */

import React from 'react';
import { Brain, RefreshCw, AlertTriangle, Home } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In production, send to a logging service like Sentry
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { pageName = 'Page', showDetail = false } = this.props;

    return (
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-12 text-center relative overflow-hidden shadow-lg">
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_rgba(239,68,68,0.5)]" />

          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <AlertTriangle size={36} className="text-red-500" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
            {pageName} Encountered an Error
          </h2>

          <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto mb-8">
            The AI engine detected an unexpected crash. Your interview session
            data has been preserved. You can reload to resume.
          </p>

          {/* Error detail (dev mode) */}
          {showDetail && this.state.error && (
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 mb-8 text-left max-h-40 overflow-y-auto">
              <p className="text-[11px] font-mono text-red-400 break-all leading-relaxed">
                {this.state.error.toString()}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4">
            <button onClick={this.handleReload}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-all shadow-md tracking-wider uppercase">
              <RefreshCw size={16} /> Reload Session
            </button>
            <button onClick={this.handleHome}
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-colors tracking-wider uppercase shadow-sm">
              <Home size={16} /> Return Home
            </button>
          </div>

          {/* Footer */}
          <p className="mt-8 text-[11px] text-slate-500 flex items-center justify-center gap-2 font-medium tracking-wide uppercase">
            <Brain size={12} /> Powered by Sterling AI Engine
          </p>
        </div>
      </div>
    );
  }
}
