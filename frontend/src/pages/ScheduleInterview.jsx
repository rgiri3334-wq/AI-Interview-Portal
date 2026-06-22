import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, MapPin,
  CheckCircle, ArrowLeft, Zap, AlertCircle, X
} from 'lucide-react';
import { todayIST, formatISTDayDate } from '../utils/istTime';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// Generate 15-min time slots from 9:00 AM to 9:00 PM (last slot 21:00)
const generateTimeSlots = () => {
  const slots = [];
  for (let mins = 9 * 60; mins <= 21 * 60; mins += 15) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export default function ScheduleInterview() {
  const navigate = useNavigate();
  const candidateId = sessionStorage.getItem('candidateId');

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null); // existing booking
  const [viewDate, setViewDate] = useState(new Date());
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [cancellingBooking, setCancellingBooking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('candidateToken');
      const bRes = await fetch(`${API_BASE}/api/candidates/${candidateId}/booking`, {
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (bRes.ok) {
        const bData = await bRes.json();
        setBooking(bData.booking || null);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [candidateId]);

  useEffect(() => { load(); }, [load]);

  // Calendar helpers
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayIST(); // IST-aware today's date

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !candidateId) return;
    setConfirming(true);
    setError('');
    
    // Convert 24h back to nice format for display if needed
    const [h, m] = selectedTime.split(':');
    let hh = parseInt(h);
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    const formattedTime = `${hh}:${m} ${ampm}`;

    try {
      const res = await fetch(`${API_BASE}/api/slots/custom-book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          candidate_id: candidateId,
          date: selectedDate,
          start_time: formattedTime,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Booking failed');
      setDone(true);
      setTimeout(() => navigate('/candidate-home'), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!booking) return;
    setCancellingBooking(true);
    try {
      await fetch(`${API_BASE}/api/bookings/${booking.booking_id}/cancel`, { method: 'PATCH' });
      setBooking(null);
      load();
    } catch (e) { console.error(e); }
    finally { setCancellingBooking(false); }
  };

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
          className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_8px_30px_rgba(16,185,129,0.4)]">
          <CheckCircle size={48} className="text-white" />
        </motion.div>
        <h1 className="text-3xl font-black text-slate-900 mb-3">Interview Scheduled!</h1>
        <p className="text-slate-500 font-medium mb-2">
          <span className="font-bold text-slate-700">{selectedDate}</span>
        </p>
        <p className="text-slate-400 text-sm mb-6">A confirmation has been sent to your email. Redirecting to your portal…</p>
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 font-sans text-slate-900">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate('/candidate-home')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-colors text-sm">
          <ArrowLeft size={18} /> Back to Portal
        </button>
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-red-600" />
          <span className="font-extrabold text-slate-900">Schedule <span className="text-red-600">Interview</span></span>
        </div>
        <div className="w-24" />
      </nav>

      <main className="pt-24 px-4 sm:px-8 pb-16 max-w-5xl mx-auto">
        {/* Existing Booking Banner */}
        <AnimatePresence>
          {booking && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-amber-600" />
                <div>
                  <p className="font-bold text-amber-800 text-sm">You already have an interview scheduled</p>
                  <p className="text-amber-600 text-xs font-medium">{booking.slot.date} at {booking.slot.start_time} ({booking.slot.timezone})</p>
                </div>
              </div>
              <button onClick={handleCancel} disabled={cancellingBooking}
                className="px-4 py-2 bg-white border border-amber-300 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-50 transition-colors flex items-center gap-1 disabled:opacity-50">
                <X size={12} /> {cancellingBooking ? 'Cancelling…' : 'Reschedule'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Calendar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-slate-900">{MONTHS[month]} {year}</h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center border border-slate-200 transition-colors">
                  <ChevronLeft size={18} className="text-slate-600" />
                </button>
                <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center border border-slate-200 transition-colors">
                  <ChevronRight size={18} className="text-slate-600" />
                </button>
              </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[11px] font-black text-slate-400 uppercase tracking-wider py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dateObj = new Date(year, month, day);
                const isPast = dateStr < today;
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const isSelectable = !isPast && !isWeekend;
                const isSelected = selectedDate === dateStr;

                return (
                  <motion.button key={day}
                    whileHover={isSelectable ? { scale: 1.08 } : {}}
                    whileTap={isSelectable ? { scale: 0.95 } : {}}
                    disabled={!isSelectable}
                    onClick={() => {
                      if (isSelectable) {
                        setSelectedDate(dateStr);
                        setSelectedTime(null);
                      }
                    }}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all relative ${
                      isPast || isWeekend ? 'text-slate-200 cursor-not-allowed' :
                      isSelected ? 'bg-red-600 text-white shadow-[0_4px_14px_rgba(220,38,38,0.4)]' :
                      'text-slate-600 bg-slate-50 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 cursor-pointer'
                    }`}
                  >
                    {day}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-slate-400 font-medium pt-4 border-t border-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-50 border border-slate-200" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600" />Selected</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-white" />Unavailable (Weekends/Past)</span>
            </div>
          </motion.div>

          {/* Slot Picker + Confirm Panel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex flex-col gap-5">

            {/* Time List */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={14} /> Available Times
              </h3>
              {!selectedDate ? (
                <div className="text-center py-8">
                  <Calendar size={40} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-sm">Select a date first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {TIME_SLOTS.map(time => {
                    const isSelected = selectedTime === time;
                    let [h, m] = time.split(':');
                    let hh = parseInt(h);
                    const ampm = hh >= 12 ? 'PM' : 'AM';
                    hh = hh % 12 || 12;
                    // Disallow times that have already passed when booking for TODAY (IST).
                    // e.g. at 3:01 PM the 3:00 PM slot must not be selectable.
                    const istNow = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
                    const [nowH, nowM] = istNow.split(':').map(Number);
                    const slotMinutes = parseInt(h) * 60 + parseInt(m);
                    const isPastTime = selectedDate === today && slotMinutes <= (nowH * 60 + nowM);
                    return (
                      <motion.button key={time} disabled={isPastTime}
                        onClick={() => { if (!isPastTime) setSelectedTime(time); }}
                        whileHover={isPastTime ? undefined : { scale: 1.02 }} whileTap={isPastTime ? undefined : { scale: 0.98 }}
                        className={`w-full py-3 rounded-xl border text-sm font-bold transition-all text-center ${
                          isPastTime
                            ? 'bg-slate-50 border-slate-100 text-slate-300 line-through opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-red-50 border-red-300 shadow-sm text-red-600'
                            : 'bg-slate-50 border-slate-100 hover:border-red-200 text-slate-600 hover:bg-red-50/30'
                        }`}
                      >
                        {hh}:{m} {ampm}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirmation Panel */}
            <AnimatePresence>
              {selectedDate && selectedTime && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_30px_rgb(0,0,0,0.04)]">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CheckCircle size={14} /> Confirm Slot
                  </h3>
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
                    <p className="font-black text-red-800 text-base">{formatISTDayDate(selectedDate)}</p>
                    <p className="text-red-600 font-extrabold text-lg mt-1">
                      {(() => {
                        let [h, m] = selectedTime.split(':');
                        let hh = parseInt(h);
                        const ampm = hh >= 12 ? 'PM' : 'AM';
                        hh = hh % 12 || 12;
                        return `${hh}:${m} ${ampm}`;
                      })()}
                    </p>
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><MapPin size={10} />{Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'}</p>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mb-4">
                    📧 A confirmation email will be sent immediately.
                  </p>
                  {error && (
                    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-600 text-sm font-bold">
                      <AlertCircle size={16} /> {error}
                    </div>
                  )}
                  <button onClick={handleBook} disabled={confirming || !!booking}
                    className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                    {confirming
                      ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Booking…</>
                      : booking ? '⚠️ Cancel current booking first' : '✅ Confirm This Slot'
                    }
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
