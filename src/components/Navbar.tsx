'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Award, LogOut, Shield, User, Database } from 'lucide-react';

interface NavbarProps {
  user?: {
    username: string;
    fullName: string;
    role: 'admin' | 'judge';
  } | null;
  googleConfigured?: boolean;
}

export default function Navbar({ user, googleConfigured = false }: NavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  return (
    <header className="no-print sticky top-0 z-50 bg-white border-b border-slate-200/90 h-14 flex items-center justify-between px-4 sm:px-6 shadow-sm">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        {/* Brand Logo & Title */}
        <Link
          href={user ? (user.role === 'admin' ? '/admin/dashboard' : '/judge/dashboard') : '/'}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center text-gold-400 font-black shadow-sm group-hover:bg-yale-700 transition-colors">
            <Award className="w-4 h-4 text-gold-400" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-sm tracking-tight text-navy-900">
                ASC<span className="text-yale-700">-STS</span>
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gold-100 text-gold-700 border border-gold-300/40">
                STUDIO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Apayao State College</p>
          </div>
        </Link>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Database indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Sheets DB</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          {/* User Profile or Login links */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                {user.role === 'admin' ? (
                  <Shield className="w-3.5 h-3.5 text-yale-700" />
                ) : (
                  <User className="w-3.5 h-3.5 text-gold-600" />
                )}
                <div className="text-left text-xs">
                  <p className="font-bold text-slate-800 leading-tight">{user.fullName}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{user.role}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Judge Portal
              </Link>
              <Link
                href="/admin/login"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 shadow-sm transition-colors"
              >
                Admin Control
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
