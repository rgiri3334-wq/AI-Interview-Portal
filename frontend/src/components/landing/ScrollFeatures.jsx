import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Eye, Mic, BarChart3, Shield, Zap } from 'lucide-react';

const features = [
  { icon: Brain, title: 'AI Question Engine', desc: 'Dynamic, context-aware technical questions adapting in real-time to candidate skill levels.' },
  { icon: Eye, title: 'Vision Analytics', desc: 'Tracks micro-expressions, eye contact, and emotional state using deep learning models.' },
  { icon: Mic, title: 'Voice Processing', desc: 'Analyzes confidence, pacing, and filler words from raw audio streams instantly.' },
  { icon: Shield, title: 'Integrity Engine', desc: 'Multi-modal proctoring ensures fair assessments via tab tracking and gaze analysis.' },
  { icon: BarChart3, title: 'Live Scoring', desc: 'Actionable telemetry on technical and behavioral performance updated per second.' },
  { icon: Zap, title: 'Enterprise Reports', desc: 'Comprehensive PDF summaries ready for hiring managers immediately after the session.' },
];

export default function ScrollFeatures() {
  return (
    <section className="py-32 px-6 max-w-7xl mx-auto relative z-10 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8 }}
        className="text-center mb-20"
      >
        <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-slate-900">
          Unrivaled <span className="text-red-600">Capabilities</span>
        </h2>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
          A full-stack intelligence layer built to evaluate engineers faster and more accurately than humanly possible.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, delay: i * 0.1, type: "spring" }}
            className="group relative bg-white border border-slate-200 rounded-3xl p-8 hover:border-red-200 transition-colors cursor-default overflow-hidden"
          >
            {/* Subtle background glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl mb-6 bg-slate-50 border border-slate-100 flex items-center justify-center shadow-inner group-hover:bg-white group-hover:border-red-100 transition-all duration-300">
                <Icon size={28} className="text-slate-600 group-hover:text-red-600 transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-slate-900">{title}</h3>
              <p className="text-slate-500 text-base leading-relaxed">{desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
