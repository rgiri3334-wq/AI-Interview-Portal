import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, RefreshCw, Users, Mail, User } from 'lucide-react';
import { formatISTDayDate } from '../../utils/istTime';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function SlotManager({ showToast }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/bookings`, {
        headers: { Authorization: `Bearer ${sessionStorage.getItem('adminToken') || ''}` }
      });
      if (res.ok) setBookings(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Scheduled Interviews</h2>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            View candidates who have selected their interview date and time.
          </p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
          <RefreshCw size={16} className={`text-slate-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={48} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">No interviews scheduled yet</p>
            <p className="text-slate-300 text-sm mt-1">Candidates will appear here once they select a time from their portal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Candidate</th>
                  <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Role</th>
                  <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                  <th className="py-4 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black">
                          {booking.candidate.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{booking.candidate.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail size={10} /> {booking.candidate.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                        {booking.candidate.role_applied || 'General'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Calendar size={12} className="text-red-500" />
                          {formatISTDayDate(booking.slot.date)}
                        </span>
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                          <Clock size={12} className="text-slate-400" />
                          <span className="text-red-600 font-bold">{booking.slot.start_time}</span>
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{booking.slot.timezone}</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      {booking.status === 'BOOKED' && <span className="inline-flex px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded border border-emerald-200">Scheduled</span>}
                      {booking.status === 'CANCELLED' && <span className="inline-flex px-2.5 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider rounded border border-slate-200">Cancelled</span>}
                      {booking.status === 'NO_SHOW' && <span className="inline-flex px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-wider rounded border border-amber-200">No Show</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
