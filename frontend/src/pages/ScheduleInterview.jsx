import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, ChevronLeft, ChevronRight, MapPin,
  CheckCircle, ArrowLeft, Zap, AlertCircle, X
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function ScheduleInterview() {
  const navigate = useNavigate();
  const candidateId = sessionStorage.getItem('candidateId');

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null); // existing booking
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [cancellingBooking, setCancellingBooking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, bRes] = await Promise.all([
        fetch(`${API_BASE}/api/slots/available`),
        fetch(`${API_BASE}/api/candidates/${candidateId}/booking`)
      ]);
      if (sRes.ok) setSlots(await sRes.json());
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
  const today = new Date().toISOString().slice(0, 10);

  // Group slots by date
  const slotsByDate = {};
  slots.forEach(s => {
    if (!slotsByDate[s.date]) slotsByDate[s.date] = [];
    slotsByDate[s.date].push(s);
  });

  const prevMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const slotsForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return slotsByDate[dateStr] || [];
  };

  const handleBook = async () => {
    if (!selectedSlot || !candidateId) return;
    setConfirming(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/slots/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot_id: selectedSlot.slot_id, candidate_id: candidateId }),
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
          <span className="font-bold text-slate-700">{selectedSlot?.date}</span> at <span className="font-bold text-red-600">{selectedSlot?.start_time}</span>
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
                  <p className="text-amber-600 text-xs font-medium">{booking.date} at {booking.start_time} — {booking.end_time} ({booking.timezone})</p>
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
                const daySlots = slotsForDay(day);
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isPast = dateStr < today;
                const hasSlots = daySlots.length > 0;
                const isSelected = selectedSlot?.date === dateStr;

                return (
                  <motion.button key={day}
                    whileHover={hasSlots && !isPast ? { scale: 1.08 } : {}}
                    whileTap={hasSlots && !isPast ? { scale: 0.95 } : {}}
                    disabled={isPast || !hasSlots}
                    onClick={() => {
                      if (hasSlots && daySlots.length === 1) {
                        setSelectedSlot(daySlots[0]);
                      }
                    }}
                    className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-bold transition-all relative ${
                      isPast ? 'text-slate-200 cursor-not-allowed' :
                      hasSlots && isSelected ? 'bg-red-600 text-white shadow-[0_4px_14px_rgba(220,38,38,0.4)]' :
                      hasSlots ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer' :
                      'text-slate-600 hover:bg-slate-50 cursor-default'
                    }`}
                  >
                    {day}
                    {hasSlots && !isPast && (
                      <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-red-400'}`} />
                    )}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-slate-400 font-medium pt-4 border-t border-slate-100">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-100 border border-red-200" />Available</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-600" />Selected</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-100" />Unavailable</span>
            </div>
          </motion.div>

          {/* Slot Picker + Confirm Panel */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="flex flex-col gap-5">

            {/* Slot List */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Clock size={14} /> Available Slots
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar size={40} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-sm">No slots available yet.</p>
                  <p className="text-slate-300 text-xs mt-1">Check back later or contact HR.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {slots.map(slot => {
                    const isSelected = selectedSlot?.slot_id === slot.slot_id;
                    return (
                      <motion.button key={slot.slot_id} onClick={() => setSelectedSlot(isSelected ? null : slot)}
                        whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                          isSelected
                            ? 'bg-red-50 border-red-300 shadow-sm'
                            : 'bg-slate-50 border-slate-100 hover:border-red-200 hover:bg-red-50/30'
                        }`}
                      >
                        <div>
                          <p className="font-extrabold text-sm text-slate-900">{new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          <p className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-red-600' : 'text-slate-500'}`}>
                            {slot.start_time} — {slot.end_time}
                          </p>
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><MapPin size={9} />{slot.timezone}</p>
                        </div>
                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shrink-0">
                            <CheckCircle size={14} className="text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirmation Panel */}
            <AnimatePresence>
              {selectedSlot && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_30px_rgb(0,0,0,0.04)]">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CheckCircle size={14} /> Confirm Slot
                  </h3>
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
                    <p className="font-black text-red-800 text-base">{new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="text-red-600 font-extrabold text-lg mt-1">{selectedSlot.start_time} — {selectedSlot.end_time}</p>
                    <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><MapPin size={10} />{selectedSlot.timezone}</p>
                  </div>
                  <p className="text-slate-400 text-xs font-medium mb-4">
                    📧 A confirmation email will be sent immediately. You can reschedule anytime before the interview window.
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
