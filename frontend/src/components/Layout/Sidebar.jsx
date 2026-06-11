import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, User, Mic, FileText,
  ChevronRight, Activity, Database, Users
} from 'lucide-react';
import logoUrl from '../../assets/sterling_logo.png';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/admin', label: 'Admin Panel', icon: Database },
  { path: '/system-health', label: 'System Health', icon: Activity },
  { path: '/admin-management', label: 'Admin Management', icon: Users },
  { path: '/report', label: 'Report', icon: FileText },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-screen sticky top-0 flex flex-col p-6 shadow-sm z-10 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-black">
          <img src={logoUrl} alt="Sterling Logo" className="w-9 h-9 object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
          <div className="hidden w-9 h-9 bg-red-600 text-white flex items-center justify-center font-bold text-sm">Sterling</div>
        </div>
        <div>
          <div className="font-bold text-[15px] tracking-widest leading-tight text-slate-900 uppercase">
            SPARK-HIRE
          </div>
          <div className="text-[11px] text-slate-500 tracking-widest uppercase mt-0.5">
            by Sterling E-Mobility
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-8 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-slate-700 font-bold">System Online</span>
          <Activity size={14} className="text-green-500 ml-auto" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        <div className="text-[10px] text-slate-400 tracking-[0.15em] uppercase mb-3 pl-3 font-bold">
          Navigation
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.path || (item.path === '/candidate-register' && (pathname === '/candidate' || pathname === '/candidate-login' || pathname === '/candidate-register'));
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-red-50 text-red-600 border border-red-100 shadow-sm' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} className={isActive ? 'text-red-600' : 'text-slate-400 group-hover:text-red-600'} />
                <span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
              </div>
              {isActive && <ChevronRight size={16} className="text-red-600" />}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Profile */}
      <div className="mt-auto pt-6 border-t border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 shadow-sm shrink-0">
            <User size={18} />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">HR Admin</p>
            <p className="text-xs text-slate-500 truncate">{sessionStorage.getItem('adminEmail') || 'Admin'}</p>
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
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-2 shrink-0"
          title="Logout"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        </button>
      </div>
    </aside>
  );
}
