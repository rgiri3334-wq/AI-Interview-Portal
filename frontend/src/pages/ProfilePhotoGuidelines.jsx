/**
 * ProfilePhotoGuidelines.jsx
 * Privacy and proctoring terms agreement page.
 * Cyber-Industrial Dark Glassmorphism.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, FileText, CheckSquare, Square } from 'lucide-react';
import { motion } from 'framer-motion';
import PageWrapper from '../components/Layout/PageWrapper';

export default function ProfilePhotoGuidelines() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  return (
    <PageWrapper className="flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-slate-950/80 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-950 p-8 border-b border-white/10 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-5 translate-x-1/4 -translate-y-1/4">
            <Shield size={200} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 bg-red-600/20 border border-red-500/30 rounded-xl flex items-center justify-center">
                <FileText size={18} className="text-red-400" />
              </div>
              <span className="text-red-400 font-bold tracking-widest uppercase text-xs">Step 2 of 3</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mb-1">Privacy & Proctoring Terms</h1>
            <p className="text-slate-400 text-xs font-medium">Please review compliance rules and continuous audit recording details.</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-10">
          
          <div className="bg-red-950/40 border border-red-500/30 rounded-2xl p-6 mb-8 flex gap-4">
            <AlertTriangle className="text-red-400 shrink-0 mt-1" size={22} />
            <div>
              <h3 className="text-red-200 font-bold text-sm mb-1">Continuous Video Audit</h3>
              <p className="text-red-300/80 text-xs leading-relaxed">
                Your entire assessment session will be <strong>continuously recorded</strong> (video & audio) from start to completion for compliance auditing. Records are stored securely and evaluated exclusively by authorized administrators.
              </p>
            </div>
          </div>

          <div className="space-y-5 text-slate-300 text-xs mb-8 leading-relaxed">
            <div>
              <h4 className="font-bold text-white mb-1">1. Identity Verification</h4>
              <p className="text-slate-400">Your profile photo will be captured in the next step to verify your candidacy against records.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">2. AI Evaluation</h4>
              <p className="text-slate-400">Responses are evaluated by autonomous assessment algorithms to measure technical accuracy without bias.</p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">3. Strict Data Protection</h4>
              <p className="text-slate-400">We adhere to enterprise encryption and privacy standards. Candidate telemetry is never shared with third parties.</p>
            </div>
          </div>

          <hr className="border-white/10 mb-8" />

          {/* Acceptance Checkbox */}
          <div 
            className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-red-500/40 cursor-pointer transition-all mb-8"
            onClick={() => setAccepted(!accepted)}
          >
            <div className="mt-0.5">
              {accepted ? (
                <CheckSquare size={24} className="text-red-500" />
              ) : (
                <Square size={24} className="text-slate-600" />
              )}
            </div>
            <div>
              <h4 className={`font-bold text-sm ${accepted ? 'text-white' : 'text-slate-400'}`}>I have read and agree to the proctoring terms</h4>
              <p className="text-xs text-slate-500 mt-0.5">I consent to continuous video recording and providing my identity capture photo.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/equipment-test')}
              className="flex-1 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs text-slate-400 bg-slate-900 hover:bg-slate-800 transition-colors border border-white/10"
            >
              Go Back
            </button>
            <motion.button
              whileHover={{ scale: accepted ? 1.02 : 1 }}
              whileTap={{ scale: accepted ? 0.98 : 1 }}
              disabled={!accepted}
              onClick={() => navigate('/profile-photo-capture')}
              className={`flex-[2] py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${accepted ? 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-lg shadow-red-600/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
            >
              {accepted ? 'Proceed to Capture Photo →' : 'Accept Terms to Proceed'}
            </motion.button>
          </div>

        </div>
      </div>
    </PageWrapper>
  );
}
