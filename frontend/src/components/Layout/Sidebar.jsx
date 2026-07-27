import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Database, UserPlus, FileText,
  Activity, ShieldCheck, ChevronRight, User, LogOut, Brain
} from 'lucide-react';
import logoUrl from '../../assets/sterling_logo.png';

const navSections = [
  {
    title: 'RECRUITER SUITE',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/admin', label: 'Admin Panel', icon: Database },
      { path: '/admin-candidate-registration', label: 'Candidate Registrations', icon: UserPlus },
      { path: '/report', label: 'Candidate Reports', icon: FileText },
    ],
  },
  {
    title: 'SYSTEM & CONTROLS',
    items: [
      { path: '/system-health', label: 'System Health HUD', icon: Activity },
      { path: '/admin-management', label: 'Security Access Matrix', icon: ShieldCheck },
      { path: '/ai-learning', label: 'AI Learning Engine', icon: Brain },
    ],
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const adminEmail = sessionStorage.getItem('adminEmail') || 'sparkhire.sterling@gmail.com';

  return (
    <aside className="w-72 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col p-6 shadow-sm z-20 shrink-0 font-sans">
      
      {/* Brand Header */}
      <div className="flex items-center gap-3 mb-6 cursor-pointer group" onClick={() => navigate('/')}>
        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(220,38,38,0.3)] border border-slate-800 p-2 relative overflow-hidden group-hover:scale-105 transition-transform">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
          <img src={logoUrl} alt="Sterling Logo" className="w-full h-full object-contain relative z-10" onError={(e) => { e.target.style.display = 'none'; }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-black text-base tracking-wider leading-tight text-slate-900 uppercase truncate">
            SPARK-HIRE
          </div>
          <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase truncate mt-0.5">
            BY STERLING E-MOBILITY
          </div>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 mb-6 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs text-slate-700 font-bold tracking-wide">System Online</span>
          <Activity size={14} className="text-emerald-500 ml-auto shrink-0" />
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-6 pr-1" style={{ scrollbarWidth: 'none' }}>
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1.5">
            <div className="text-[10px] text-slate-400 tracking-[0.18em] uppercase px-3 font-extrabold mb-2">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.path || (item.path === '/report' && pathname.startsWith('/report/'));
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all group ${
                    isActive 
                      ? 'bg-red-50 text-red-600 border border-red-200/80 shadow-xs font-bold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent font-medium'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon size={18} className={`shrink-0 transition-colors ${isActive ? 'text-red-600' : 'text-slate-400 group-hover:text-red-600'}`} />
                    <span className="text-xs tracking-wide truncate">
                      {item.label}
                    </span>
                  </div>
                  {isActive && <ChevronRight size={14} className="text-red-600 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer / HR Admin Profile Card */}
      <div className="mt-auto pt-5 border-t border-slate-200/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shadow-xs shrink-0 font-bold">
            <User size={18} />
          </div>
          <div className="text-left min-w-0 flex-1">
            <p className="text-xs font-extrabold text-slate-900 truncate">HR Admin</p>
            <p className="text-[11px] text-slate-400 truncate font-medium">{adminEmail}</p>
          </div>
        </div>

        <button
          onClick={() => {
            sessionStorage.removeItem('adminToken');
            sessionStorage.removeItem('adminEmail');
            sessionStorage.removeItem('isAuthenticated');
            sessionStorage.removeItem('role');
            navigate('/');
          }}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all shrink-0"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>

    </aside>
  );
}
