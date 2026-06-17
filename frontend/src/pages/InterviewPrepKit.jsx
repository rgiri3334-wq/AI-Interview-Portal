import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, BookOpen, Code, Users, Lightbulb, ArrowRight, ChevronDown,
  ChevronUp, CheckCircle, Target, Star, Zap, Clock, ArrowLeft, RefreshCw
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Static prep content by category ──────────────────────────────────────────
const UNIVERSAL_TIPS = [
  { icon: '🎯', title: 'Structure your answers with STAR', body: 'Situation → Task → Action → Result. This works for 90% of behavioral questions. Keep it under 2 minutes per answer.' },
  { icon: '⏱️', title: 'Pause before you answer', body: 'Take 2–3 seconds to think. It shows maturity, not confusion. Interviewers expect you to think before speaking.' },
  { icon: '📊', title: 'Quantify everything', body: 'Replace "I improved performance" with "I reduced load time by 40% serving 10K daily users." Numbers make your story credible.' },
  { icon: '🔄', title: 'Acknowledge what you don\'t know', body: 'Say "I haven\'t worked with that directly, but here\'s how I\'d approach it…" Honesty + problem-solving > bluffing.' },
  { icon: '💬', title: 'Speak in 3-part answers', body: 'Point 1, Point 2, Point 3. Lists feel confident and structured. Avoid rambling.' },
];

const ROLE_PREP_MAP = {
  'Software Engineer': {
    topics: ['Data Structures & Algorithms', 'System Design Basics', 'OOP Principles', 'REST APIs', 'Git workflow', 'Code Review best practices'],
    sample_questions: [
      'Explain the difference between a stack and a queue. When would you use each?',
      'How would you design a URL shortener like bit.ly?',
      'Walk me through a bug you found that was hard to debug. How did you find it?',
      'What\'s the difference between process and thread?',
      'How do you handle merge conflicts in Git?',
    ],
    vocabulary: ['Time complexity O(n)', 'DRY / SOLID principles', 'Microservices', 'REST vs GraphQL', 'Idempotency', 'Race condition'],
  },
  'Frontend Developer': {
    topics: ['React / Vue lifecycle', 'CSS specificity & Flexbox/Grid', 'Browser rendering pipeline', 'Web performance', 'Accessibility (WCAG)', 'State management'],
    sample_questions: [
      'What is the Virtual DOM and how does it work?',
      'Explain how you\'d optimize a slow-loading React app.',
      'How does CSS specificity work? Give me an example.',
      'What is debouncing vs throttling? When do you use them?',
      'Describe your approach to making a UI component accessible.',
    ],
    vocabulary: ['Hydration', 'Code splitting', 'Lighthouse score', 'Critical render path', 'SSR vs CSR', 'Event delegation'],
  },
  'Backend Developer': {
    topics: ['Database indexing & query optimization', 'REST API design', 'Authentication (JWT/OAuth)', 'Caching strategies', 'Message queues', 'Horizontal scaling'],
    sample_questions: [
      'Explain the difference between SQL and NoSQL databases.',
      'How would you design a rate limiter?',
      'Walk me through how JWT authentication works.',
      'When would you use a message queue over a direct API call?',
      'How do you approach database migrations in production?',
    ],
    vocabulary: ['N+1 query problem', 'Eventual consistency', 'CAP theorem', 'Connection pooling', 'TTL / cache eviction', 'Idempotent endpoints'],
  },
  'Data Scientist': {
    topics: ['ML model evaluation metrics', 'Feature engineering', 'Overfitting vs underfitting', 'Python data stack (pandas, sklearn)', 'SQL for data analysis', 'Statistical fundamentals'],
    sample_questions: [
      'Explain the bias-variance tradeoff.',
      'How do you handle class imbalance in a dataset?',
      'Walk me through how you\'d build a recommendation system.',
      'What\'s the difference between precision and recall? When does each matter?',
      'How would you explain a machine learning model to a non-technical stakeholder?',
    ],
    vocabulary: ['Cross-validation', 'F1 score', 'Gradient descent', 'One-hot encoding', 'p-value', 'Confusion matrix'],
  },
  'default': {
    topics: ['Role-specific technical skills', 'Past project experience', 'Team collaboration', 'Problem-solving approach', 'Communication skills', 'Growth mindset & learning'],
    sample_questions: [
      'Tell me about yourself and your background.',
      'Describe a challenging project and how you handled it.',
      'Where do you see yourself in 3–5 years?',
      'How do you handle competing priorities and tight deadlines?',
      'Tell me about a time you had a conflict with a teammate. How did you resolve it?',
    ],
    vocabulary: ['Cross-functional', 'Agile/Scrum', 'KPIs', 'Stakeholder management', 'Continuous improvement', 'Ownership mindset'],
  },
};

// ── Expandable Tip Card ───────────────────────────────────────────────────────
function TipCard({ icon, title, body, delay = 0 }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}
      className={`border rounded-2xl overflow-hidden transition-all cursor-pointer hover:shadow-sm ${open ? 'border-red-200 bg-red-50/50' : 'border-slate-100 bg-white hover:border-red-100'}`}
      onClick={() => setOpen(!open)}>
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl shrink-0">{icon}</span>
        <p className="font-extrabold text-sm text-slate-800 flex-1">{title}</p>
        {open ? <ChevronUp size={16} className="text-red-500 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <p className="px-4 pb-4 text-sm text-slate-600 font-medium leading-relaxed border-t border-red-100 pt-3">{body}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Vocab pill ────────────────────────────────────────────────────────────────
function VocabPill({ word }) {
  const [checked, setChecked] = useState(false);
  return (
    <motion.button onClick={() => setChecked(!checked)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
      className={`px-3 py-2 rounded-xl text-xs font-black border flex items-center gap-1.5 transition-all ${
        checked ? 'bg-emerald-50 border-emerald-300 text-emerald-700 line-through' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-red-200 hover:bg-red-50'
      }`}>
      {checked && <CheckCircle size={10} />} {word}
    </motion.button>
  );
}

export default function InterviewPrepKit() {
  const navigate = useNavigate();
  const jobRole = sessionStorage.getItem('job_role') || 'Software Engineer';
  const candidateName = sessionStorage.getItem('candidateName') || 'there';
  const firstName = candidateName.split(' ')[0];
  const [activeSection, setActiveSection] = useState('tips');
  const [checkedQuestions, setCheckedQuestions] = useState({});
  const [ready, setReady] = useState(false);

  const prep = ROLE_PREP_MAP[jobRole] || ROLE_PREP_MAP['default'];

  const SECTIONS = [
    { id: 'tips', label: 'Interview Tips', icon: Lightbulb },
    { id: 'topics', label: 'Key Topics', icon: Target },
    { id: 'questions', label: 'Sample Questions', icon: BookOpen },
    { id: 'vocabulary', label: 'Vocabulary Coach', icon: Brain },
  ];

  const toggleQ = (i) => setCheckedQuestions(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50 font-sans text-slate-900">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 flex items-center justify-between shadow-sm">
        <button onClick={() => navigate('/candidate-home')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold transition-colors text-sm">
          <ArrowLeft size={18} /> Portal
        </button>
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-red-600" />
          <span className="font-extrabold text-slate-900">AI <span className="text-red-600">Prep Kit</span></span>
        </div>
        <button onClick={() => navigate('/equipment-test')}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-all shadow-sm">
          Skip → Start Interview <ArrowRight size={14} />
        </button>
      </nav>

      <main className="pt-24 px-4 sm:px-8 pb-16 max-w-4xl mx-auto">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-3xl p-8 text-white shadow-[0_8px_30px_rgba(220,38,38,0.3)] overflow-hidden relative">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
            <div className="relative z-10">
              <span className="text-red-200 text-xs font-black uppercase tracking-widest">Personalised for you</span>
              <h1 className="text-3xl font-black mt-2 mb-3">
                Good luck, {firstName}! <span className="text-red-200">🎯</span>
              </h1>
              <p className="text-red-100 font-medium text-lg mb-4">
                Preparing for <span className="font-black text-white">{jobRole}</span> interview
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="bg-white/15 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                  <BookOpen size={14} /> {prep.sample_questions.length} Sample Questions
                </div>
                <div className="bg-white/15 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                  <Target size={14} /> {prep.topics.length} Key Topics
                </div>
                <div className="bg-white/15 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                  <Brain size={14} /> {prep.vocabulary.length} Vocab Terms
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveSection(id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap border transition-all ${
                activeSection === id
                  ? 'bg-red-600 text-white border-red-600 shadow-[0_4px_14px_rgba(220,38,38,0.3)]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-red-200 hover:text-red-600'
              }`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── Universal Tips ── */}
          {activeSection === 'tips' && (
            <motion.div key="tips" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="space-y-3">
              <p className="text-slate-400 text-sm font-medium mb-4">These tips apply to every interview regardless of role. Tap any to expand.</p>
              {UNIVERSAL_TIPS.map((tip, i) => (
                <TipCard key={i} {...tip} delay={i * 0.05} />
              ))}
            </motion.div>
          )}

          {/* ── Key Topics ── */}
          {activeSection === 'topics' && (
            <motion.div key="topics" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-slate-400 text-sm font-medium mb-5">
                Review these topics for your <strong className="text-slate-700">{jobRole}</strong> interview. Check off what you're confident in.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {prep.topics.map((topic, i) => {
                  const [done, setDone] = useState(false);
                  return (
                    <motion.button key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      onClick={() => setDone(!done)}
                      className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${
                        done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-red-200 hover:bg-red-50/30'
                      }`}>
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        done ? 'bg-emerald-500' : 'bg-slate-100'
                      }`}>
                        {done ? <CheckCircle size={16} className="text-white" /> : <span className="text-slate-400 font-black text-xs">{i + 1}</span>}
                      </div>
                      <span className={`font-bold text-sm ${done ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>{topic}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ── Sample Questions ── */}
          {activeSection === 'questions' && (
            <motion.div key="questions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-slate-400 text-sm font-medium mb-5">
                Practice these out loud. Check them off as you prepare. These are real patterns from past interviews.
              </p>
              <div className="space-y-3">
                {prep.sample_questions.map((q, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className={`flex items-start gap-4 p-5 rounded-2xl border cursor-pointer transition-all ${
                      checkedQuestions[i] ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-red-100 hover:bg-red-50/20'
                    }`}
                    onClick={() => toggleQ(i)}>
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border-2 transition-all ${
                      checkedQuestions[i] ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-200'
                    }`}>
                      {checkedQuestions[i] && <CheckCircle size={14} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Q{i + 1}</span>
                      <p className={`font-bold text-sm mt-0.5 leading-relaxed ${checkedQuestions[i] ? 'text-emerald-700' : 'text-slate-800'}`}>{q}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 text-xs text-slate-400 font-medium text-center">
                {Object.values(checkedQuestions).filter(Boolean).length} of {prep.sample_questions.length} practised
              </div>
            </motion.div>
          )}

          {/* ── Vocabulary Coach ── */}
          {activeSection === 'vocabulary' && (
            <motion.div key="vocabulary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-slate-400 text-sm font-medium mb-5">
                Know these terms cold. Click to mark as known. Using the right vocabulary signals expertise.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {prep.vocabulary.map((word, i) => <VocabPill key={i} word={word} />)}
              </div>

              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Star size={14} className="text-amber-500" /> Power Phrases
                </h3>
                <div className="space-y-3">
                  {[
                    { phrase: '"I take ownership of…"', context: 'Shows accountability' },
                    { phrase: '"Let me walk you through my thinking…"', context: 'Shows structured reasoning' },
                    { phrase: '"The tradeoff I considered was…"', context: 'Shows engineering maturity' },
                    { phrase: '"I measured success by…"', context: 'Shows results-orientation' },
                    { phrase: '"In hindsight, I would have…"', context: 'Shows self-reflection' },
                  ].map(({ phrase, context }, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                      <div className="flex-1">
                        <p className="font-extrabold text-sm text-slate-900">{phrase}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{context}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA bottom */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 justify-center">
          <motion.button onClick={() => navigate('/equipment-test')} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
            className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex items-center gap-3 shadow-[0_4px_20px_rgba(220,38,38,0.35)] transition-all text-sm">
            <Zap size={18} /> I'm Ready — Begin Interview
          </motion.button>
          <p className="text-slate-400 text-xs font-medium">You can return to this page anytime from your portal.</p>
        </motion.div>
      </main>
    </div>
  );
}
