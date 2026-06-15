import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, AlertTriangle, FileText, CheckSquare, Square } from 'lucide-react';
import { motion } from 'framer-motion';

export default function KycGuidelines() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-3xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 opacity-10 translate-x-1/4 -translate-y-1/4">
            <Shield size={200} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <FileText size={20} className="text-white" />
              </div>
              <span className="text-red-400 font-bold tracking-widest uppercase text-sm">Step 2 of 3</span>
            </div>
            <h1 className="text-4xl font-black mb-2">Privacy & Recording Guidelines</h1>
            <p className="text-slate-400 font-medium text-lg">Please review our compliance and privacy terms before proceeding.</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 md:p-12">
          
          <div className="bg-red-50 border border-red-100 rounded-2xl p-6 mb-8 flex gap-4">
            <AlertTriangle className="text-red-600 shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-red-900 font-bold text-lg mb-2">Continuous Video Recording</h3>
              <p className="text-red-800/80 leading-relaxed">
                For auditing and anti-fraud compliance, your entire interview session will be <strong>continuously recorded</strong> (both video and audio) from the moment the interview begins until it ends. This recording will be securely stored and reviewed solely by the HR administration team.
              </p>
            </div>
          </div>

          <div className="space-y-6 text-slate-600 mb-10 leading-relaxed">
            <div>
              <h4 className="font-bold text-slate-900 mb-1">1. Identity Verification (KYC)</h4>
              <p>In the next step, you will be required to capture a live photo of your <strong>Aadhar Card</strong> alongside a live selfie. This is used exclusively to verify your identity against your application. Your ID image will <strong>not</strong> be stored permanently after the verification process is complete.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">2. AI Evaluation</h4>
              <p>Your responses will be evaluated by an artificial intelligence system designed to objectively assess your technical depth, communication skills, and problem-solving abilities without bias.</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 mb-1">3. Privacy Guarantee</h4>
              <p>We adhere to strict data privacy regulations (including GDPR standards). Your data will not be sold, shared with third parties, or used for any purpose other than evaluating your candidacy for this role.</p>
            </div>
          </div>

          <hr className="border-slate-100 mb-8" />

          {/* Acceptance Checkbox */}
          <div 
            className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors mb-8"
            onClick={() => setAccepted(!accepted)}
          >
            <div className="mt-1">
              {accepted ? (
                <CheckSquare size={28} className="text-red-600" />
              ) : (
                <Square size={28} className="text-slate-300" />
              )}
            </div>
            <div>
              <h4 className={`font-bold text-lg ${accepted ? 'text-slate-900' : 'text-slate-500'}`}>I have read and agree to the privacy terms</h4>
              <p className="text-sm text-slate-500">I explicitly consent to continuous video recording and AI-driven KYC verification.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button 
              onClick={() => navigate('/equipment-test')}
              className="flex-1 py-4 rounded-xl font-bold uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Go Back
            </button>
            <motion.button
              whileHover={{ scale: accepted ? 1.02 : 1 }}
              whileTap={{ scale: accepted ? 0.98 : 1 }}
              disabled={!accepted}
              onClick={() => navigate('/kyc-capture')}
              className={`flex-[2] py-4 rounded-xl font-bold uppercase tracking-widest transition-all ${accepted ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              {accepted ? 'Proceed to KYC' : 'Accept Terms to Proceed'}
            </motion.button>
          </div>

        </div>
      </div>
    </div>
  );
}
