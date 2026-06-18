/**
 * IST Time Utilities (Indian Standard Time — UTC+5:30)
 * -------------------------------------------------------
 * Single source of truth for all timestamp formatting in the frontend.
 * Import from this file everywhere instead of using raw toLocaleString().
 *
 * Usage:
 *   import { formatIST, formatISTDate, formatISTTime, formatISTFull } from '../utils/istTime';
 *
 *   formatIST(someIsoString)           → "18 Jun 2026, 09:30 AM"
 *   formatISTDate(someIsoString)       → "18 Jun 2026"
 *   formatISTTime(someIsoString)       → "09:30 AM"
 *   formatISTFull(someIsoString)       → "Wednesday, 18 June 2026, 09:30:45 AM IST"
 *   nowIST()                           → current IST as ISO string
 */

const IST_LOCALE = 'en-IN';
const IST_TZ = 'Asia/Kolkata';

/**
 * Format any ISO timestamp string or Date to a readable IST date+time.
 * Example: "18 Jun 2026, 09:30 AM"
 */
export function formatIST(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString(IST_LOCALE, {
      timeZone: IST_TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Format any ISO timestamp string or Date to IST date only.
 * Example: "18 Jun 2026"
 */
export function formatISTDate(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString(IST_LOCALE, {
      timeZone: IST_TZ,
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Format any ISO timestamp string or Date to IST time only.
 * Example: "09:30 AM"
 */
export function formatISTTime(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleTimeString(IST_LOCALE, {
      timeZone: IST_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Format with full weekday and seconds — for audit logs.
 * Example: "Wednesday, 18 June 2026, 09:30:45 AM"
 */
export function formatISTFull(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString(IST_LOCALE, {
      timeZone: IST_TZ,
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Format weekday + date for slot/booking displays.
 * Example: "Wednesday, 18 June 2026"
 */
export function formatISTDayDate(dateInput) {
  if (!dateInput) return 'N/A';
  try {
    // Handle plain date strings like "2026-06-18" (no time component)
    // Append T00:00:00 to avoid UTC midnight shift to previous day
    const raw = typeof dateInput === 'string' && dateInput.length === 10
      ? dateInput + 'T00:00:00'
      : dateInput;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString(IST_LOCALE, {
      timeZone: IST_TZ,
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Returns the current IST date as a YYYY-MM-DD string.
 * Useful for comparisons with slot dates.
 */
export function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: IST_TZ }); // en-CA gives YYYY-MM-DD format
}

/**
 * Returns the current IST datetime as an ISO string with +05:30 offset.
 */
export function nowIST() {
  const now = new Date();
  const offset = 5 * 60 + 30; // +05:30 in minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istMs = utcMs + offset * 60000;
  return new Date(istMs).toISOString().replace('Z', '+05:30');
}
