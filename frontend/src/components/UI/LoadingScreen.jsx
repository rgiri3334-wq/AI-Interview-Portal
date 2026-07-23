import React from 'react';

export default function LoadingScreen({ message }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 font-medium text-sm tracking-wider">{message || 'Loading Sterling E-Mobility...'}</p>
    </div>
  );
}
