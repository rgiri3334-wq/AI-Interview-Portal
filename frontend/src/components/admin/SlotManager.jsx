import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Plus, Trash2, CheckCircle, AlertCircle, Users, MapPin, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const QUICK_WINDOWS = [
  { label: '9:00 AM – 9:45 AM', start: '09:00', end: '09:45' },
  { label: '10:00 AM – 10:45 AM', start: '10:00', end: '10:45' },
  { label: '11:00 AM – 11:45 AM', start: '11:00', end: '11:45' },
  { label: '2:00 PM – 2:45 PM', start: '14:00', end: '14:45' },
  { label: '3:00 PM – 3:45 PM', start: '15:00', end: '15:45' },
  { label: '4:00 PM – 4:45 PM', start: '16:00', end: '16:45' },
];

export default function SlotManager({ showToast }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: '', start_time: '09:00', end_time: '09:45', timezone: 'Asia/Kolkata', max_bookings: 1 });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/slots`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}` }
      });
      if (res.ok) setSlots(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.date || !form.start_time || !form.end_time) {
      showToast?.('⚠ Please fill in date and time', 'warning');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create slot');
      showToast?.('✅ Interview slot created', 'success');
      setForm(f => ({ ...f, date: '' }));
      load();
    } catch (e) {
      showToast?.(`❌ ${e.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (slotId) => {
    setDeletingId(slotId);
    try {
      await fetch(`${API_BASE}/api/admin/slots/${slotId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}` }
      });
      showToast?.('🗑 Slot removed', 'info');
      load();
    } catch (e) {
      showToast?.('❌ Failed to remove slot', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Interview Slot Manager</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            Create available interview windows for candidates to book. They'll see these in their portal.
          </p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
          <RefreshCw size={16} className="text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-6">
        {/* Create Slot Form */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Plus size={14} /> Create New Slot
          </h3>

          {/* Date */}
          <div className="mb-4">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar size={11} /> Interview Date
            </label>
            <input type="date" min={today} value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all"
            />
          </div>

          {/* Quick Windows */}
          <div className="mb-4">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock size={11} /> Time Window
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {QUICK_WINDOWS.map(w => {
                const isActive = form.start_time === w.start && form.end_time === w.end;
                return (
                  <button key={w.start} onClick={() => setForm(f => ({ ...f, start_time: w.start, end_time: w.end }))}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isActive ? 'bg-red-50 border-red-300 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50/50'
                    }`}
                  >
                    {w.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">From</label>
                <input type="time" value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-red-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">To</label>
                <input type="time" value={form.end_time}
                  onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-red-400 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Max Bookings */}
          <div className="mb-5">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users size={11} /> Max Candidates Per Slot
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 5].map(n => (
                <button key={n} onClick={() => setForm(f => ({ ...f, max_bookings: n }))}
                  className={`w-12 h-10 rounded-xl text-sm font-black border transition-all ${
                    form.max_bookings === n ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-red-300'
                  }`}
                >{n}</button>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div className="mb-5">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapPin size={11} /> Timezone
            </label>
            <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-red-400 transition-all bg-white">
              <option value="Asia/Kolkata">IST (Asia/Kolkata)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">EST (New York)</option>
              <option value="America/Los_Angeles">PST (Los Angeles)</option>
              <option value="Europe/London">GMT (London)</option>
              <option value="Asia/Dubai">GST (Dubai)</option>
            </select>
          </div>

          <button onClick={handleCreate} disabled={creating || !form.date}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(220,38,38,0.3)] disabled:opacity-50 text-sm">
            {creating ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating…</> : <><Plus size={16} /> Create Interview Slot</>}
          </button>
        </div>

        {/* Existing Slots List */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
            <Calendar size={14} /> Upcoming Slots ({slots.length})
          </h3>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <div className="text-center py-16">
              <Calendar size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold">No slots created yet</p>
              <p className="text-slate-300 text-sm mt-1">Create a slot and candidates will be able to book it from their portal.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {slots.map(slot => (
                <motion.div key={slot.slot_id} layout
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    slot.is_full ? 'bg-slate-50 border-slate-200' : 'bg-red-50/40 border-red-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 ${slot.is_full ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-700'}`}>
                      <span className="text-xs font-black leading-none">{slot.date.slice(8, 10)}</span>
                      <span className="text-[9px] font-bold uppercase">{new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</span>
                    </div>
                    <div>
                      <p className="font-extrabold text-sm text-slate-900">{new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                      <p className="text-slate-500 text-xs font-bold mt-0.5">{slot.start_time} — {slot.end_time} <span className="text-slate-400">({slot.timezone})</span></p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex gap-1">
                          {Array.from({ length: slot.max_bookings }).map((_, i) => (
                            <div key={i} className={`w-2.5 h-2.5 rounded-full ${i < slot.booked_count ? 'bg-red-500' : 'bg-slate-200'}`} />
                          ))}
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          {slot.booked_count}/{slot.max_bookings} booked
                        </span>
                        {slot.is_full && (
                          <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">FULL</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {slot.booked_count > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100">
                        <CheckCircle size={10} /> {slot.booked_count} booked
                      </span>
                    )}
                    <button onClick={() => handleDelete(slot.slot_id)} disabled={deletingId === slot.slot_id}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 flex items-center justify-center transition-all disabled:opacity-40">
                      {deletingId === slot.slot_id
                        ? <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 size={14} className="text-red-400" />
                      }
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
