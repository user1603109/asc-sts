'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Sliders,
  UserCheck,
  Trophy,
  Printer,
  Settings,
  Database,
  Search,
  BookOpen,
  Menu,
  X,
  LogOut,
  Shield,
  Award,
  CheckCircle2,
  Bell,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
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
        { label: 'Events Studio', href: '/admin/events', icon: Calendar, badge: null },
        { label: 'Enlistment / Contestants', href: '/admin/enlistment', icon: Users, badge: null },
      ],
    },
    {
      group: 'TABULATION SUITE',
      items: [
        { label: 'Live Tabulation', href: '/admin/tabulation', icon: Trophy, hasDot: true },
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
        { label: 'Settings & Sheets', href: '/admin/settings', icon: Settings, badge: null },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
      {/* TOP DESKTOP & MOBILE HEADER */}
      <header className="no-print sticky top-0 z-40 bg-white border-b border-slate-200/90 h-14 flex items-center justify-between px-4 lg:px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo & Brand */}
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-navy-900 p-1 flex items-center justify-center shadow-sm group-hover:bg-yale-700 transition-colors">
              <img
                src="/api/logo"
                alt="ASC Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/assets/img/astslogo.png';
                }}
              />
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-extrabold text-sm tracking-tight text-navy-900">
                  ASC<span className="text-yale-700">-STS</span>
                </span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gold-100 text-gold-700 border border-gold-300/40">
                  PRO STUDIO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Apayao State College</p>
            </div>
          </Link>
        </div>

        {/* Global Search Bar (like PortBox Ctrl + /) */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search events, contestants, criteria, or settings (Ctrl + /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 focus:border-yale-600 rounded-lg pl-9 pr-14 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-yale-600 transition-all"
            />
            <span className="absolute right-2.5 top-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/70 rounded border border-slate-300/60 pointer-events-none">
              Ctrl + /
            </span>
          </div>
        </div>

        {/* Top Right Controls & Indicators */}
        <div className="flex items-center gap-3">
          {/* DB Status Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Google Sheets DB</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <Link
            href="/admin/reports"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:text-yale-700 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-yale-700" />
            <span>Audit & Guide</span>
          </Link>

          {/* User profile dropdown button */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-yale-700 text-white font-bold text-xs flex items-center justify-center">
              A
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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
                  <p className="text-[10px] text-slate-400 font-medium">Sheets Synced</p>
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
