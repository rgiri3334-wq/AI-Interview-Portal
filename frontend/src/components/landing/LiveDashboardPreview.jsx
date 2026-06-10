import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import { Activity, Cpu, Zap } from 'lucide-react';

const generateMockData = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    time: i,
    eqScore: 60 + Math.random() * 30,
    techScore: 70 + Math.random() * 25,
  }));
};

export default function LiveDashboardPreview() {
  const [data, setData] = useState(generateMockData());

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newData = [...prev.slice(1)];
        newData.push({
          time: prev[prev.length - 1].time + 1,
          eqScore: 60 + Math.random() * 30,
          techScore: 70 + Math.random() * 25,
        });
        return newData;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 px-6 relative z-10 bg-slate-900 text-white overflow-hidden">
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-600 via-slate-900 to-slate-900 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-900/50 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-widest mb-6">
            <Activity size={14} /> Real-Time Telemetry
          </div>
          <h2 className="text-4xl md:text-5xl font-black leading-tight mb-6 tracking-tight">
            Live AI Scorecards. <br/><span className="text-slate-400 font-light">Zero Latency.</span>
          </h2>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed font-medium">
            Watch candidate scores adapt dynamically as the AI analyzes vocal tonality, eye movements, and technical accuracy frame-by-frame. 
          </p>
          
          <div className="space-y-4">
            {['Sub-100ms Inference Time', 'Live Multi-modal Processing', 'Dynamic Confidence Intervals'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-slate-300">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                  <Zap size={12} className="text-red-400" />
                </div>
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="bg-slate-800 rounded-3xl p-6 md:p-8 border border-slate-700 shadow-2xl relative"
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2"><Cpu className="text-red-500" /> Candidate Analysis</h3>
              <p className="text-sm text-slate-400">Live Telemetry Stream</p>
            </div>
            <div className="flex gap-2 items-center">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-red-400 font-mono">LIVE</span>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorTech" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="techScore" name="Technical Score" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorTech)" isAnimationActive={false} />
                <Area type="monotone" dataKey="eqScore" name="EQ & Confidence" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorEq)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
