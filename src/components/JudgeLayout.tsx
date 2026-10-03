'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Trophy,
  History,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wifi,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string | null;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

interface JudgeLayoutProps {
  children: ReactNode;
  user?: {
    userId?: number;
    username: string;
    fullName: string;
    role: string;
  } | null;
  pageTitle?: string;
  pageSubtitle?: string;
}

export default function JudgeLayout({
  children,
  user,
  pageTitle,
  pageSubtitle,
}: JudgeLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
      router.refresh();
    } catch (e) {
      console.error(e);
      router.push('/');
    }
  };

  const navGroups: NavGroup[] = [
    {
      group: 'JUDGE WORKSPACE',
      items: [
        { label: 'Judge Dashboard', href: '/judge/dashboard', icon: LayoutDashboard },
        { label: 'Scoring Arena', href: '/judge/score', icon: Trophy },
      ],
    },
    {
      group: 'RECORDS & CREDENTIALS',
      items: [
        { label: 'Scoring History', href: '/judge/history', icon: History },
        { label: 'Judge Profile & PIN', href: '/judge/profile', icon: ShieldCheck },
      ],
    },
  ];

  return (
    <div className="min-h-screen h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* TOP DESKTOP & MOBILE HEADER */}
      <header className="shrink-0 z-40 bg-gradient-to-r from-[#060D17] via-[#0A192F] to-[#0F4C81] border-b border-white/10 text-white h-14 flex items-center justify-between px-3 sm:px-5 lg:px-6 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>

          {/* Desktop minimize / maximize sidebar toggle button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar collapse"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-amber-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* Dual Institutional Logos & Branding */}
          <Link href="/judge/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex items-center gap-1.5 bg-white/10 p-1 rounded-lg border border-white/15 group-hover:bg-white/20 transition-all">
              {/* astslogo */}
              <img
                src="/api/logo?name=astslogo&v=2"
                alt="ASTS Logo"
                className="w-7 h-7 object-contain rounded"
                onError={(e) => {
                  e.currentTarget.src = '/assets/img/astslogo.png';
                }}
              />
              {/* asclogo */}
              <img
                src="/api/logo?name=asclogo&v=2"
                alt="ASC College Logo"
                className="w-7 h-7 object-contain rounded"
                onError={(e) => {
                  e.currentTarget.src = '/assets/img/asclogo.png';
                }}
              />
            </div>

            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  ASC<span className="text-amber-400">-ASTS</span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded">
                  JUDGE
                </span>
              </div>
              <p className="text-[10px] text-slate-300/80 font-medium hidden sm:block leading-tight mt-0.5">
                Apayao State College • Tabulation Suite
              </p>
            </div>
          </Link>
        </div>

        {/* Right side: Judge Profile info & Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Status Live Indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Portal</span>
          </div>

          {/* Judge Account Pill */}
          <Link
            href="/judge/profile"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition-all text-xs"
            title="View Judge Profile"
          >
            <div className="w-6 h-6 rounded-lg bg-amber-400 text-slate-900 font-black text-xs flex items-center justify-center shrink-0">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'J'}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="font-bold text-xs truncate max-w-[120px]">{user?.fullName || 'Judge Panel'}</div>
              <div className="text-[10px] text-slate-300">Accredited Judge</div>
            </div>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 hover:text-rose-200 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Sign Out of Portal"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* BODY WITH DEDICATED SIDEBAR & CONTENT */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile backdrop overlay */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 transition-opacity"
          />
        )}

        {/* DEDICATED JUDGE SIDEBAR */}
        <aside
          className={`
            fixed lg:static top-14 bottom-0 left-0 z-30
            bg-[#0B1526] text-slate-200 border-r border-slate-800/80
            flex flex-col justify-between transition-all duration-200 ease-in-out
            ${sidebarCollapsed ? 'lg:w-[72px]' : 'lg:w-64'}
            ${sidebarOpen ? 'w-72 translate-x-0' : '-translate-x-full lg:translate-x-0'}
            shadow-xl lg:shadow-none
          `}
        >
          {/* Top section: Judge info banner & Navigation Links */}
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {/* Judge Quick Bio (when expanded) */}
            {!sidebarCollapsed && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-inner">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0F4C81] to-blue-500 text-white font-extrabold text-sm flex items-center justify-center shadow-md shrink-0">
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'J'}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-xs text-white truncate">
                      {user?.fullName || 'Accredited Judge'}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                        Official Judge
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Groups */}
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                {!sidebarCollapsed ? (
                  <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400/90">
                    {group.group}
                  </p>
                ) : (
                  <div className="h-2" />
                )}

                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/judge/dashboard' && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all
                          ${
                            isActive
                              ? 'bg-[#0F4C81] text-white shadow-md border border-white/20'
                              : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                          }
                          ${sidebarCollapsed ? 'justify-center px-2' : ''}
                        `}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Sidebar Status Card */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
            {!sidebarCollapsed ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Sheets Connected</span>
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">v2.0</span>
                </div>
                <div className="text-[10px] text-slate-400 text-center leading-tight">
                  Apayao State College Tabulation Suite
                </div>
              </div>
            ) : (
              <div className="flex justify-center" title="Connected to Google Sheets Database">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            )}
          </div>
        </aside>

        {/* MAIN SCROLLABLE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] flex flex-col">
          {/* Subheader / Page Title if provided */}
          {(pageTitle || pageSubtitle) && (
            <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 shadow-xs">
              <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">{pageTitle}</h1>
                  {pageSubtitle && <p className="text-xs text-slate-500 mt-0.5">{pageSubtitle}</p>}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 p-3 sm:p-5 lg:p-6 max-w-6xl w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
