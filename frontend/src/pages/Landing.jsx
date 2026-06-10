import React from 'react';
import { useNavigate } from 'react-router-dom';
import logoUrl from '../assets/sterling_logo.png'; 

// Import new components
import InteractiveBrain3D from '../components/landing/InteractiveBrain3D';
import HeroSection from '../components/landing/HeroSection';
import TestimonialsCarousel from '../components/landing/TestimonialsCarousel';
import LiveDashboardPreview from '../components/landing/LiveDashboardPreview';
import ScrollFeatures from '../components/landing/ScrollFeatures';
import DeepDiveTabs from '../components/landing/DeepDiveTabs';
import InteractiveFAQ from '../components/landing/InteractiveFAQ';
import CTASection from '../components/landing/CTASection';
import DynamicFooter from '../components/landing/DynamicFooter';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 overflow-x-hidden font-sans relative selection:bg-red-200 selection:text-red-900">
      
      {/* Dynamic 3D Background */}
      <InteractiveBrain3D />

      {/* ── TOP NAV ── */}
      <nav className="fixed top-0 left-0 right-0 px-6 py-4 flex items-center justify-between z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shrink-0 shadow-md">
            <img src={logoUrl} alt="Sterling Logo" className="w-7 h-7 object-contain mix-blend-screen" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <div className="hidden w-7 h-7 bg-red-600 text-white flex items-center justify-center font-bold text-xs rounded">St</div>
          </div>
          <span className="font-extrabold text-base tracking-wide text-slate-900">
            Spark-<span className="text-red-600">Hire</span>
            <span className="hidden sm:inline text-slate-400 text-[10px] ml-2 tracking-[0.2em] font-mono uppercase">by Sterling E-Mobility</span>
          </span>
        </div>
        <div className="flex gap-4 items-center">
          <button className="text-sm font-semibold text-slate-600 hover:text-red-600 transition-colors" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
          <button 
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-full text-sm transition-all shadow-[0_4px_14px_0_rgba(220,38,38,0.39)] hover:-translate-y-[1px]" 
            onClick={() => navigate('/admin')}
          >
            Control Panel
          </button>
        </div>
      </nav>

      {/* ── SECTIONS ── */}
      <HeroSection />
      <TestimonialsCarousel />
      <ScrollFeatures />
      <LiveDashboardPreview />
      <DeepDiveTabs />
      <InteractiveFAQ />
      <CTASection />
      <DynamicFooter />
    </div>
  );
}
