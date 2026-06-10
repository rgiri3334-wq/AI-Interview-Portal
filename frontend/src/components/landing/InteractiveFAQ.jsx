import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  { q: 'Is the AI unbiased?', a: 'Yes. Our models are trained on strictly technical parameters (code correctness, logic, system architecture) and acoustic features (pacing, clarity) while intentionally stripping out demographic data to ensure 100% objective evaluations.' },
  { q: 'How does eye-tracking work without violating privacy?', a: 'All video processing happens securely via WebRTC. We do not store raw video feeds; instead, the system extracts geometric coordinates and immediately discards the visual data, ensuring full GDPR compliance.' },
  { q: 'Can it integrate with our existing ATS?', a: 'Absolutely. We provide enterprise webhooks and a full GraphQL API to seamlessly push candidate scorecards and PDF reports directly into Greenhouse, Workday, or Lever.' },
  { q: 'What happens if a candidate\'s internet drops?', a: 'The interview session state is continuously synced via WebSockets. If a drop occurs, the candidate can rejoin within 10 minutes and pick up exactly where they left off without losing their current answers.' }
];

export default function InteractiveFAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="py-32 px-6 bg-slate-50 relative z-10 border-t border-slate-200/60">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-slate-900">
            Frequently Asked <span className="text-red-600">Questions</span>
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;
            return (
              <div key={i} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm transition-colors hover:border-red-100">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full px-8 py-6 text-left flex justify-between items-center focus:outline-none"
                >
                  <span className="font-bold text-lg text-slate-900">{faq.q}</span>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
                    <ChevronDown className="text-slate-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-8 pb-6 text-slate-600 leading-relaxed font-medium border-t border-slate-100 pt-4 mt-2">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
