/**
 * =============================================================================
 * AI Virtual Interview Platform - Enterprise UI Initialization
 * =============================================================================
 * Architect: Aditya Singh (Principal Architect)
 * Description: React 18 DOM Entry Point. Initializes the Spark-Hire AI
 * design system, injects global styles, and mounts the application router.
 * =============================================================================
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Sterling E-Mobility Global Styles
import './index.css';

// Core Application Component / Router
import App from './App.jsx';

// ── Enterprise Boot Diagnostics ──────────────────────────────────────────
console.log(
  "%c⚡ Sterling AI Interview Engine Booting...",
  "color: #dc2626; font-weight: bold; font-size: 14px; padding: 4px;"
);
console.log(
  "%cPowered by Sterling E-Mobility",
  "color: #94a3b8; font-weight: bold; font-size: 12px; padding: 4px;"
);

// ── Stale-deploy recovery ────────────────────────────────────────────────
// When a new version is deployed, old chunk hashes are pruned. If this tab is
// still running the previous build, Vite fires `vite:preloadError` when it
// can't preload a chunk. Force one reload to pull the fresh build. The guard
// prevents an infinite loop if a chunk is genuinely missing.
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('__vite_preload_reloaded')) {
    sessionStorage.setItem('__vite_preload_reloaded', '1');
    window.location.reload();
  }
});

// ── Strict DOM Mounting ──────────────────────────────────────────────────
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("CRITICAL UI FAILURE: Missing <div id='root'> in index.html");
  throw new Error("Application failed to mount. Root element not found.");
}

// Render the application
createRoot(rootElement).render(
  <App />
);