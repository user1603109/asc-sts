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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  hasDot?: boolean;
  badge?: string | null;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  const navGroups: NavGroup[] = [
    {
      group: 'STACK & WORKSPACE',
      items: [
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, badge: null },
        { label: 'Enlistment & Registry', href: '/admin/enlistment', icon: Calendar, badge: null },
      ],
    },
    {
      group: 'TABULATION SUITE',
      items: [
        { label: 'Tabulation & Scores', href: '/admin/tabulation', icon: Trophy, hasDot: true },
        { label: 'Official Rankings', href: '/admin/rankings', icon: Award, badge: null },
        { label: 'Criteria & Portions', href: '/admin/criteria', icon: Sliders, badge: null },
        { label: 'Judges Roster & Assignment', href: '/admin/judges', icon: UserCheck, badge: null },
      ],
    },
    {
      group: 'REPORTS & AUDIT',
      items: [
        { label: 'Official Reports', href: '/admin/reports', icon: Printer, badge: null },
        { label: 'System Logs', href: '/admin/logs', icon: Layers, badge: null },
        { label: 'Database Backups', href: '/admin/backups', icon: Database, badge: null },
        { label: 'Settings & Sheets', href: '/admin/settings', icon: Settings, badge: null },
      ],
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* TOP DESKTOP & MOBILE HEADER - Fixed Height & Non-scrolling */}
      <header className="no-print shrink-0 z-40 bg-gradient-to-r from-[#060D17] via-[#0A192F] to-[#0F4C81] border-b border-white/10 text-white h-14 flex items-center justify-between px-4 lg:px-6 shadow-md">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
          </button>

          {/* Desktop minimize / maximize sidebar toggle button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 transition-colors"
            title={sidebarCollapsed ? 'Maximize sidebar (Expand)' : 'Minimize sidebar (Collapse)'}
            aria-label="Toggle sidebar collapse"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-amber-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-300" />
            )}
          </button>

          {/* Logo & System Name */}
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-white/10 p-1 flex items-center justify-center border border-white/20 shadow-sm group-hover:bg-white/20 transition-all">
              <img
                src="/api/logo?name=astslogo&v=2"
                alt="ASTS Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/assets/img/astslogo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white group-hover:text-amber-400 transition-colors">
                  ASC<span className="text-amber-400">-ASTS</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-300/80 font-medium hidden sm:block">
                Apayao State College • Tabulation Suite
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

      {/* BODY WITH INDEPENDENT SCROLL CONFIGURATION */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT SIDEBAR - INDEPENDENT SCROLL */}
        <aside
          className={`no-print fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-200 ease-in-out lg:static ${
            sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
          } ${
            sidebarOpen ? 'w-64 translate-x-0 pt-14 lg:pt-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Nav links - Separate Independent Scroll */}
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                {!sidebarCollapsed && (
                  <p className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-400 truncate">
                    {group.group}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`group flex items-center ${
                          sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2'
                        } rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-yale-50 text-yale-700 font-semibold shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-colors ${
                              isActive
                                ? 'text-yale-700'
                                : 'text-slate-400 group-hover:text-slate-600'
                            }`}
                          />
                          {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </div>

                        {/* Badges / Active Dot */}
                        {!sidebarCollapsed && (
                          <div className="flex items-center gap-1.5 shrink-0">
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
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Sidebar Box & Status */}
          <div className="p-3 border-t border-slate-200/90 bg-slate-50/50 shrink-0">
            {!sidebarCollapsed ? (
              <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-subtle flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">ASC-ASTS v2.0</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{googleConfigured ? 'Sheets Synced' : 'Database Active'}</p>
                  </div>
                </div>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
                  ACTIVE
                </span>
              </div>
            ) : (
              <div className="flex justify-center" title="ASC-ASTS v2.0 - Active">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs border border-emerald-200 shadow-xs">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-20 bg-slate-900/20 backdrop-blur-sm lg:hidden"
          />
        )}

        {/* MAIN VIEW CONTENT AREA - Independent Vertical Scroll */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
          <div className="max-w-7xl mx-auto">
            {pageTitle && (
              <div className="mb-6 print:hidden no-print">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-navy-900">
                  {pageTitle}
                </h1>
                {pageSubtitle && (
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">{pageSubtitle}</p>
                )}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      {/* GLOBAL PRINT LAYOUT OVERRIDES */}
      <style jsx global>{`
        @media print {
          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #__next,
          div[class*="h-screen"],
          div[class*="overflow-hidden"],
          div[class*="overflow-y-auto"],
          main {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            box-shadow: none !important;
          }
          .no-print, header, aside, [aria-label="Toggle navigation"] {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
