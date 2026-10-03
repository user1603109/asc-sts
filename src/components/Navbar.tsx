'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Award, LogOut, Shield, User } from 'lucide-react';

interface NavbarProps {
  user?: {
    username: string;
    fullName: string;
    role: 'admin' | 'judge';
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
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
    <header className="no-print sticky top-0 z-50 bg-gradient-to-r from-[#060D17] via-[#0A192F] to-[#0F4C81] border-b border-white/10 text-white h-14 flex items-center justify-between px-4 sm:px-6 shadow-md">
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
        {/* Brand Logo & Title */}
        <Link
          href={user ? (user.role === 'admin' ? '/admin/dashboard' : '/judge/dashboard') : '/'}
          className="flex items-center gap-2.5 group"
        >
          <div className="flex items-center gap-1 bg-white/10 p-1 rounded-lg border border-white/15 group-hover:bg-white/20 transition-all">
            <img
              src="/api/logo?name=astslogo&v=2"
              alt="ASTS Logo"
              className="w-7 h-7 object-contain rounded"
              onError={(e) => {
                e.currentTarget.src = '/assets/img/astslogo.png';
              }}
            />
            <img
              src="/api/logo?name=asclogo&v=2"
              alt="ASC Logo"
              className="w-7 h-7 object-contain rounded"
              onError={(e) => {
                e.currentTarget.src = '/assets/img/asclogo.png';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-sm tracking-tight text-white">
                ASC<span className="text-amber-400">-ASTS</span>
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                PORTAL
              </span>
            </div>
            <p className="text-[10px] text-slate-300/80 font-medium">Apayao State College</p>
          </div>
        </Link>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">

          {/* User Profile or Login links */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/15">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                {user.role === 'admin' ? (
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <User className="w-3.5 h-3.5 text-amber-300" />
                )}
                <div className="text-left text-xs">
                  <p className="font-bold text-white leading-tight">{user.fullName}</p>
                  <p className="text-[10px] text-slate-300 capitalize">{user.role}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-300 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg transition-colors"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                Judge Portal
              </Link>
              <Link
                href="/admin/login"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-navy-950 bg-amber-400 hover:bg-amber-300 shadow-sm transition-colors"
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
