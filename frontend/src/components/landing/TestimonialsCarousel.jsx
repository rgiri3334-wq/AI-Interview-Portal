import React from 'react';
import { motion } from 'framer-motion';

const companies = ['TechMotors', 'AeroDynamics Inc.', 'VoltSystems', 'Nexus Energy', 'Apex Powertrains', 'Zephyr Dynamics'];

export default function TestimonialsCarousel() {
  return (
    <section className="py-20 bg-white overflow-hidden border-y border-slate-200/50">
      <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Trusted by leading engineering teams</p>
      </div>
      
      <div className="relative flex overflow-x-hidden group">
        <motion.div
          className="flex whitespace-nowrap items-center gap-16 px-8"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ ease: "linear", duration: 30, repeat: Infinity }}
        >
          {/* Double the array for seamless infinite scroll */}
          {[...companies, ...companies].map((company, i) => (
            <div key={i} className="text-2xl md:text-3xl font-black text-slate-300 opacity-60 hover:opacity-100 transition-opacity cursor-default">
              {company}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
