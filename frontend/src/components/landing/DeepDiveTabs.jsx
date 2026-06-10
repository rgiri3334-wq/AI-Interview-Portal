import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Eye, Brain } from 'lucide-react';

const tabs = [
  { id: 'voice', icon: Mic, label: 'Voice Analytics', title: 'Acoustic Intelligence', desc: 'Our audio models analyze over 40 distinct vocal parameters—including pitch, variance, pace, and hesitation—to quantify confidence and communication clarity in real-time.' },
  { id: 'vision', icon: Eye, label: 'Computer Vision', title: 'Facial & Gaze Tracking', desc: 'Utilizing advanced WebRTC streams, we monitor eye-tracking for anti-cheat and process micro-expressions to gauge candidate stress and engagement.' },
  { id: 'logic', icon: Brain, label: 'Reasoning Engine', title: 'Dynamic Technical Evaluation', desc: 'The AI dynamically alters the difficulty of coding and system design questions based on the candidate\'s previous answers, simulating a true senior-level technical interview.' }
];

export default function DeepDiveTabs() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const activeContent = tabs.find(t => t.id === activeTab);

  return (
    <section className="py-24 px-6 bg-slate-50 relative z-10 border-y border-slate-200/60">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row gap-12 items-center">
          
          {/* Tabs Menu */}
          <div className="w-full md:w-1/3 flex flex-col gap-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-4 px-6 py-4 rounded-2xl text-left transition-all ${
                    isActive 
                      ? 'bg-white shadow-lg shadow-slate-200/50 border border-red-100' 
                      : 'hover:bg-slate-200/50 border border-transparent'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-red-50 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                    <tab.icon size={20} />
                  </div>
                  <span className={`font-bold ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content Display */}
          <div className="w-full md:w-2/3 bg-white border border-slate-200 rounded-3xl p-8 md:p-12 min-h-[300px] flex items-center relative overflow-hidden shadow-sm">
            {/* Decorative background circle */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-red-50 rounded-full blur-3xl pointer-events-none" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                transition={{ duration: 0.4 }}
                className="relative z-10"
              >
                <h3 className="text-3xl font-black mb-4 text-slate-900">{activeContent.title}</h3>
                <p className="text-lg text-slate-600 leading-relaxed font-medium">
                  {activeContent.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          
        </div>
      </div>
    </section>
  );
}
