'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Sliders,
  UserCheck,
  Trophy,
  Printer,
  Settings,
  Database,
  Search,
  User,
  Menu,
  X,
  LogOut,
  Award,
  CheckCircle2,
  Sparkles,
  Layers,
  ClipboardList,
} from 'lucide-react';

interface AppLayoutProps {
  children: ReactNode;
  user?: {
    username: string;
    fullName: string;
    role: 'admin' | 'judge';
  } | null;
  googleConfigured?: boolean;
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function AppLayout({
  children,
  user = { username: 'admin', fullName: 'ASC Administrator', role: 'admin' },
  googleConfigured = false,
  pageTitle,
  pageSubtitle,
}: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  const navGroups = [
    {
      group: 'STACK & WORKSPACE',
      items: [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, badge: null },
        { label: 'Enlistment Studio', href: '/admin/enlistment', icon: Calendar, badge: null },
      ],
    },
    {
      group: 'TABULATION SUITE',
      items: [
        { label: 'Live Tabulation', href: '/admin/tabulation', icon: Trophy, hasDot: true },
        { label: 'Scores Matrix', href: '/admin/scores', icon: ClipboardList, badge: null },
        { label: 'Official Rankings', href: '/admin/rankings', icon: Award, badge: null },
        { label: 'Criteria & Portions', href: '/admin/criteria', icon: Sliders, badge: null },
        { label: 'Judges Roster', href: '/admin/judges', icon: UserCheck, badge: null },
      ],
    },
    {
      group: 'REPORTS & AUDIT',
      items: [
        { label: 'Official Reports', href: '/admin/reports', icon: Printer, badge: null },
        { label: 'System Logs', href: '/admin/logs', icon: Layers, badge: null },
        { label: 'Database Backups', href: '/admin/backups', icon: Database, badge: null },
        { label: 'Sample Data Tool', href: '/admin/sample-data', icon: Sparkles, badge: 'DEMO' },
        { label: 'Settings & Sheets', href: '/admin/settings', icon: Settings, badge: null },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* TOP DESKTOP & MOBILE HEADER */}
      <header className="no-print sticky top-0 z-40 bg-gradient-to-r from-[#060D17] via-[#0A192F] to-[#0F4C81] border-b border-white/10 text-white h-14 flex items-center justify-between px-4 lg:px-6 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>

          {/* Logo & System Name */}
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20 shadow-sm group-hover:bg-white/20 transition-all">
              <img
                src="/api/logo"
                alt="ASC Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/assets/img/astslogo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  ASC<span className="text-amber-400">-STS</span>
                </span>
                <span className="hidden sm:inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  PRO STUDIO
                </span>
              </div>
              <p className="text-[10px] text-slate-300/80 font-medium hidden sm:block">
                Automated Scoring &amp; Tabulation System • Apayao State College
              </p>
            </div>
          </Link>
        </div>

        {/* Universal Functional Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search events, contestants, scores, criteria... (Ctrl + /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  const q = searchQuery.trim().toLowerCase();
                  if (q === 'scores' || q === 'score') router.push('/admin/scores');
                  else if (q === 'rankings' || q === 'ranking') router.push('/admin/rankings');
                  else if (q === 'tabulation' || q === 'live') router.push('/admin/tabulation');
                  else if (q === 'criteria') router.push('/admin/criteria');
                  else if (q === 'judges' || q === 'judge') router.push('/admin/judges');
                  else if (q === 'reports' || q === 'report') router.push('/admin/reports');
                  else if (q === 'logs' || q === 'log') router.push('/admin/logs');
                  else if (q === 'settings') router.push('/admin/settings');
                  else if (q === 'backups' || q === 'backup') router.push('/admin/backups');
                  else {
                    router.push(`/admin/enlistment?tab=events&q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }
              }}
              className="w-full bg-[#061224]/60 hover:bg-[#061224]/80 focus:bg-[#061224] text-white border border-white/20 focus:border-amber-400 rounded-xl pl-9 pr-16 py-1.5 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-12 top-2 p-0.5 text-slate-400 hover:text-white rounded"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <kbd className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-300 bg-white/10 rounded border border-white/15 pointer-events-none">
              Ctrl + /
            </kbd>
          </div>
        </div>

        {/* Profile Icon Button & Logout Icon Button Beside Each Other */}
        <div className="flex items-center gap-2">
          {/* Profile Icon Button */}
          <Link
            href="/admin/settings"
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all group"
            title={`Profile: ${user?.fullName || 'Administrator'} (${user?.role || 'admin'})`}
          >
            <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 group-hover:scale-105 transition-transform">
              <User className="w-3.5 h-3.5" />
            </div>
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-200 group-hover:text-white">
              {user?.fullName?.split(' ')[0] || 'Profile'}
            </span>
          </Link>

          {/* Logout Icon Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-white/15 hover:border-rose-400/40 transition-all group"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 text-slate-300 group-hover:text-rose-300 transition-colors" />
            <span className="hidden sm:inline-block text-xs font-semibold group-hover:text-rose-300 transition-colors">
              Logout
            </span>
          </button>
        </div>
      </header>

      {/* BODY WITH FIXED/COLLAPSIBLE SIDEBAR */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside
          className={`no-print fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0 pt-14' : '-translate-x-full lg:pt-0'
          }`}
        >
          {/* Nav links */}
          <div className="p-4 space-y-6 overflow-y-auto">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                <p className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-400">
                  {group.group}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-yale-50 text-yale-700 font-semibold'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon
                            className={`w-4 h-4 transition-colors ${
                              isActive
                                ? 'text-yale-700'
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          />
                          <span>{item.label}</span>
                        </div>

                        {/* Badges / Active Dot */}
                        <div className="flex items-center gap-1.5">
                          {item.hasDot && (
                            <span className="w-2 h-2 rounded-full bg-yale-600 animate-pulse" />
                          )}
                          {item.badge && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                item.badge === 'active'
                                  ? 'bg-yale-100 text-yale-700 border border-yale-200'
                                  : item.badge === 'PRO'
                                  ? 'bg-gold-100 text-gold-700 border border-gold-300'
                                  : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Sidebar Box */}
          <div className="p-4 border-t border-slate-200/90 bg-slate-50/50">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-subtle flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-800 leading-tight">ASC System v2.0</p>
                  <p className="text-[10px] text-slate-400 font-medium">{googleConfigured ? 'Sheets Synced' : 'Database Active'}</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                ACTIVE
              </span>
            </div>
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* MAIN VIEW CONTENT AREA */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
          {pageTitle && (
            <div className="mb-6">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy-900">
                {pageTitle}
              </h1>
              {pageSubtitle && (
                <p className="text-xs sm:text-sm text-slate-500 mt-1">{pageSubtitle}</p>
              )}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
