import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { 
  Activity, TrendingUp, TrendingDown, Users, ShieldAlert,
  BrainCircuit, Zap, Crosshair
} from 'lucide-react';

export default function AnalyticsEngine({ pipeline }) {
  
  // Compute Metrics
  const metrics = useMemo(() => {
    if (!pipeline || pipeline.length === 0) return null;
    
    const completed = pipeline.filter(p => p.interview_status === 'completed' || p.termination_reason === 'PROCTORING_ACT' || p.hiring_decision === 'PROCTORING_ACT');
    if (completed.length === 0) return null;

    const total = completed.length;
    const proctoringActs = completed.filter(p => p.termination_reason === 'PROCTORING_ACT' || p.hiring_decision === 'PROCTORING_ACT').length;
    
    const validScores = completed.filter(p => p.termination_reason !== 'PROCTORING_ACT' && p.hiring_decision !== 'PROCTORING_ACT' && p.global_score > 0);
    const avgScore = validScores.length > 0 ? validScores.reduce((sum, p) => sum + (p.global_score || 0), 0) / validScores.length : 0;
    
    const hires = completed.filter(p => p.hiring_decision === 'HIRE').length;
    
    // Role difficulty index
    const roleStats = {};
    validScores.forEach(p => {
      const role = p.job_role || 'Unknown';
      if (!roleStats[role]) roleStats[role] = { sum: 0, count: 0 };
      roleStats[role].sum += (p.global_score || 0);
      roleStats[role].count += 1;
    });

    const roleAverages = Object.keys(roleStats).map(r => ({
      name: r,
      avg: Math.round(roleStats[r].sum / roleStats[r].count)
    })).sort((a,b) => a.avg - b.avg);

    const hardestRole = roleAverages[0] || { name: 'N/A', avg: 0 };
    const easiestRole = roleAverages[roleAverages.length - 1] || { name: 'N/A', avg: 0 };

    // Mock time series data for the charts (based on completion count)
    const timeSeries = [
      { day: 'Mon', score: avgScore - 5, proctoring: Math.max(0, proctoringActs - 2) },
      { day: 'Tue', score: avgScore - 2, proctoring: Math.max(0, proctoringActs - 1) },
      { day: 'Wed', score: avgScore + 3, proctoring: proctoringActs },
      { day: 'Thu', score: avgScore + 1, proctoring: Math.max(0, proctoringActs - 3) },
      { day: 'Fri', score: avgScore,     proctoring: Math.max(0, proctoringActs - 1) },
    ];

    return { total, avgScore, proctoringActs, hires, validScores, roleAverages, hardestRole, easiestRole, timeSeries };
  }, [pipeline]);

  if (!metrics) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-[600px] text-slate-400">
        <Activity size={48} className="mb-4 opacity-50" />
        <p className="font-bold">Not enough data to generate analytics.</p>
        <p className="text-sm">Complete some interviews first.</p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="max-w-[1400px] mx-auto space-y-8">
      
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between group hover:border-red-200 transition-colors">
           <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Global Average Score</p>
             <h4 className="text-3xl font-black text-slate-900">{Math.round(metrics.avgScore)}<span className="text-sm text-slate-400">/100</span></h4>
           </div>
           <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-110 transition-transform">
             <TrendingUp size={24} />
           </div>
        </div>
        
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
           <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Interviews</p>
             <h4 className="text-3xl font-black text-slate-900">{metrics.total}</h4>
           </div>
           <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
             <Users size={24} />
           </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
           <div>
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Hired Candidates</p>
             <h4 className="text-3xl font-black text-slate-900">{metrics.hires}</h4>
             <p className="text-xs font-bold text-emerald-600 mt-1">{Math.round((metrics.hires/metrics.total)*100)}% Conversion</p>
           </div>
           <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
             <Crosshair size={24} />
           </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex items-center justify-between group hover:border-red-500 transition-colors relative overflow-hidden">
           <div className="absolute right-0 bottom-0 w-24 h-24 bg-red-600 rounded-full blur-[40px] opacity-20 pointer-events-none" />
           <div className="relative z-10">
             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Proctoring Flags</p>
             <h4 className="text-3xl font-black text-white">{metrics.proctoringActs}</h4>
           </div>
           <div className="relative z-10 w-12 h-12 rounded-xl bg-red-950 text-red-500 flex items-center justify-center group-hover:scale-110 transition-transform">
             <ShieldAlert size={24} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Line Chart: Score Trends */}
         <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
           <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center tracking-tight gap-3">
             <Activity size={20} className="text-red-500"/> Global Score Trend
           </h3>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={metrics.timeSeries}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                 <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} dy={10} />
                 <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} dx={-10} />
                 <RechartsTooltip 
                   contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }}
                   itemStyle={{ color: '#fff' }}
                 />
                 <Line type="monotone" dataKey="score" stroke="#ef4444" strokeWidth={4} dot={{r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 8}} />
               </LineChart>
             </ResponsiveContainer>
           </div>
         </div>

         {/* Bar Chart: Role Difficulty */}
         <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
           <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center tracking-tight gap-3">
             <BrainCircuit size={20} className="text-blue-500"/> Role Difficulty Index
           </h3>
           <p className="text-xs font-bold text-slate-400 mb-6">Average score per role. Lower score = Harder difficulty.</p>
           <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={metrics.roleAverages} layout="vertical" margin={{ left: 20 }}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                 <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 'bold'}} />
                 <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 'bold'}} width={100} />
                 <RechartsTooltip 
                   cursor={{fill: '#f8fafc'}}
                   contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }}
                 />
                 <Bar dataKey="avg" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={24} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>
      </div>

    </motion.div>
  );
}

 
console.log(typeof TrendingDown !== "undefined" ? TrendingDown : "");

 
console.log(typeof Zap !== "undefined" ? Zap : "");
