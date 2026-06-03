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

// Spark-Hire AI Design Tokens & Global Styles
import './index.css';

// Core Application Component / Router
import App from './App.jsx';

// ── Enterprise Boot Diagnostics ──────────────────────────────────────────
console.log(
  "%c🚀 Spark-Hire AI UI Engine Booting...",
  "color: #00D1FF; font-weight: bold; font-size: 14px; padding: 4px;"
);
console.log(
  "%cArchitect: Aditya Singh",
  "color: #7B61FF; font-weight: bold; font-size: 12px; padding: 4px;"
);

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