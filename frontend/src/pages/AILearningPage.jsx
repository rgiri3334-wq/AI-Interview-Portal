import React from 'react';
import Sidebar from '../components/Layout/Sidebar';
import PageWrapper from '../components/Layout/PageWrapper';
import AILearningDashboard from '../components/admin/AILearningDashboard';

export default function AILearningPage() {
  return (
    <PageWrapper className="flex min-h-screen bg-slate-50 font-sans relative overflow-hidden text-slate-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative z-10 w-full max-w-full">
        <AILearningDashboard />
      </main>
    </PageWrapper>
  );
}
