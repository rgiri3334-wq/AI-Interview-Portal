import React from 'react';
import { Github, Twitter, Linkedin, Mail } from 'lucide-react';

export default function DynamicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16 px-6 relative z-10 border-t border-slate-800">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="md:col-span-1">
          <span className="font-extrabold text-xl tracking-wide text-white mb-4 block">
            Spark-<span className="text-red-500">Hire</span>
          </span>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            The definitive AI hiring engine for enterprise engineering teams.
          </p>
          <div className="flex gap-4">
            {[Twitter, Github, Linkedin, Mail].map((Icon, i) => (
              <a key={i} href="#" className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors">
                <Icon size={14} />
              </a>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Product</h4>
          <ul className="space-y-3 text-sm">
            {['AI Question Engine', 'Vision Analytics', 'Voice Processing', 'Enterprise Reports'].map(link => (
              <li key={link}><a href="#" className="hover:text-red-400 transition-colors">{link}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Resources</h4>
          <ul className="space-y-3 text-sm">
            {['Documentation', 'API Reference', 'System Status', 'Compliance'].map(link => (
              <li key={link}><a href="#" className="hover:text-red-400 transition-colors">{link}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Legal</h4>
          <ul className="space-y-3 text-sm">
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'GDPR'].map(link => (
              <li key={link}><a href="#" className="hover:text-red-400 transition-colors">{link}</a></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 text-center text-xs tracking-widest uppercase font-mono">
        Spark-Hire &copy; 2026 &middot; Sterling E-Mobility
      </div>
    </footer>
  );
}
