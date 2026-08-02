/**
 * ScheduleInterview.jsx
 * Calendar time-slot booking page.
 * Cyber-Industrial Dark Glassmorphism.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, MapPin,
  CheckCircle, ArrowLeft, Zap, AlertCircle, X
} from 'lucide-react';
import { todayIST, formatISTDayDate } from '../utils/istTime';
import PageWrapper from '../components/Layout/PageWrapper';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

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

  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
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

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayIST();

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !candidateId) return;
    setConfirming(true);
    setError('');
    
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
      setTimeout(() => navigate('/candidate-home'), 2500);
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
    <PageWrapper className="flex items-center justify-center p-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center max-w-sm">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
          className="w-20 h-20 bg-emerald-500/20 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(16,185,129,0.3)]">
          <CheckCircle size={40} className="text-emerald-400" />
        </motion.div>
        <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Interview Reserved</h1>
        <p className="text-slate-300 font-medium mb-1 text-sm">
          <span className="font-bold text-white">{selectedDate}</span>
        </p>
        <p className="text-slate-400 text-xs mb-6">Confirmation sent. Redirecting to your candidate portal…</p>
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
      </motion.div>
    </PageWrapper>
  );

  return (
    <PageWrapper className="font-sans">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/candidate-home')} className="flex items-center gap-2 text-slate-400 hover:text-white font-semibold transition-colors text-xs">
          <ArrowLeft size={16} /> Back to Portal
        </button>
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-red-500" />
          <span className="font-extrabold text-white text-sm">Schedule <span className="text-red-500">Interview</span></span>
        </div>
        <div className="w-24" />
      </nav>

      <main className="pt-24 px-4 sm:px-8 pb-16 max-w-5xl mx-auto">
        {/* Existing Booking Banner */}
        <AnimatePresence>
          {booking && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-amber-400" />
                <div>
                  <p className="font-bold text-amber-200 text-xs">You already have an interview scheduled</p>
                  <p className="text-amber-400 text-xs font-mono">{booking.slot.date} at {booking.slot.start_time} ({booking.slot.timezone})</p>
                </div>
              </div>
              <button onClick={handleCancel} disabled={cancellingBooking}
                className="px-3.5 py-1.5 bg-slate-900 border border-amber-500/30 text-amber-300 rounded-xl text-xs font-bold hover:bg-amber-950 transition-colors flex items-center gap-1">
                <X size={12} /> {cancellingBooking ? 'Cancelling…' : 'Reschedule'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Calendar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-950/80 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-extrabold text-white">{MONTHS[month]} {year}</h2>
              <div className="flex gap-2">
                <button onClick={prevMonth} className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center border border-white/10 transition-colors">
                  <ChevronLeft size={16} className="text-slate-300" />
                </button>
                <button onClick={nextMonth} className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 flex items-center justify-center border border-white/10 transition-colors">
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>
            </div>

            {/* Day labels */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1.5">
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
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-bold transition-all relative ${
                      isPast || isWeekend ? 'text-slate-700 cursor-not-allowed bg-slate-950/40' :
                      isSelected ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(225,29,72,0.5)] border border-red-500' :
                      'text-slate-200 bg-slate-900/90 border border-white/10 hover:bg-red-950/40 hover:text-red-400 hover:border-red-500/40 cursor-pointer'
                    }`}
                  >
                    {day}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center gap-4 text-[10px] font-mono text-slate-400 pt-4 border-t border-white/10">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white/20" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600" />Selected</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-950" />Unavailable</span>
            </div>
          </motion.div>

          {/* Slot Picker Panel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex flex-col gap-5">

            <div className="bg-slate-950/80 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl">
              <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={14} className="text-red-500" /> Available Time Slots
              </h3>
              {!selectedDate ? (
                <div className="text-center py-8">
                  <Calendar size={36} className="text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-400 font-medium text-xs">Select a date from the calendar first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {TIME_SLOTS.map(time => {
                    const isSelected = selectedTime === time;
                    let [h, m] = time.split(':');
                    let hh = parseInt(h);
                    const ampm = hh >= 12 ? 'PM' : 'AM';
                    hh = hh % 12 || 12;
                    const istNow = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false, hour: '2-digit', minute: '2-digit' });
                    const [nowH, nowM] = istNow.split(':').map(Number);
                    const slotMinutes = parseInt(h) * 60 + parseInt(m);
                    const isPastTime = selectedDate === today && slotMinutes <= (nowH * 60 + nowM);
                    return (
                      <motion.button key={time} disabled={isPastTime}
                        onClick={() => { if (!isPastTime) setSelectedTime(time); }}
                        whileHover={isPastTime ? undefined : { scale: 1.02 }} whileTap={isPastTime ? undefined : { scale: 0.98 }}
                        className={`w-full py-2.5 rounded-xl border text-xs font-mono font-bold transition-all text-center ${
                          isPastTime
                            ? 'bg-slate-950 border-white/5 text-slate-700 line-through cursor-not-allowed'
                            : isSelected
                            ? 'bg-red-950/60 border-red-500 text-red-400 shadow-sm'
                            : 'bg-slate-900 border-white/10 hover:border-red-500/40 text-slate-300 hover:bg-red-950/20'
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
                  className="bg-slate-950/80 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-2xl">
                  <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-400" /> Confirm Selected Slot
                  </h3>
                  <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-4 mb-4">
                    <p className="font-bold text-white text-sm">{formatISTDayDate(selectedDate)}</p>
                    <p className="text-red-400 font-extrabold text-base mt-1 font-mono">
                      {(() => {
                        let [h, m] = selectedTime.split(':');
                        let hh = parseInt(h);
                        const ampm = hh >= 12 ? 'PM' : 'AM';
                        hh = hh % 12 || 12;
                        return `${hh}:${m} ${ampm}`;
                      })()}
                    </p>
                    <p className="text-slate-400 text-xs mt-1 flex items-center gap-1 font-mono"><MapPin size={10} />{Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata'}</p>
                  </div>
                  {error && (
                    <div className="flex items-center gap-2 bg-red-950/40 border border-red-500/30 rounded-xl p-3 mb-4 text-red-400 text-xs font-medium">
                      <AlertCircle size={14} /> {error}
                    </div>
                  )}
                  <button onClick={handleBook} disabled={confirming || !!booking}
                    className="w-full py-3.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold uppercase tracking-wider text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-600/30 disabled:opacity-50 active:scale-[0.99]">
                    {confirming
                      ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Reserving Slot…</>
                      : booking ? '⚠️ Cancel current booking first' : 'Confirm Slot Reservation →'
                    }
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </PageWrapper>
  );
}

// eslint-disable-next-line
console.log(typeof loading !== "undefined" ? loading : "");
