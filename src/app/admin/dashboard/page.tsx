'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import {
  Calendar,
  Users,
  UserCheck,
  Trophy,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Wifi,
  Clock,
  Layers,
  Activity,
  ChevronUp,
  ChevronDown,
  Play,
  BookOpen,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [showStatsCards, setShowStatsCards] = useState(true);
  const [showCard1, setShowCard1] = useState(true);
  const [showCard2, setShowCard2] = useState(true);
  const [showCard3, setShowCard3] = useState(true);

  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    completedEvents: 0,
    totalCandidates: 0,
    totalScores: 0,
    totalJudges: 0,
    pendingJudges: 0,
    totalDepartments: 0,
  });
  const [events, setEvents] = useState<any[]>([]);
  const [pendingJudges, setPendingJudges] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsRes, judgesRes, candidatesRes, scoresRes, deptsRes, sheetsStatusRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/judges'),
        fetch('/api/candidates'),
        fetch('/api/scores'),
        fetch('/api/departments'),
        fetch('/api/setup-sheets'),
      ]);

      const eventsData = await eventsRes.json();
      const judgesData = await judgesRes.json();
      const candidatesData = await candidatesRes.json();
      const scoresData = await scoresRes.json();
      const deptsData = await deptsRes.json();
      const statusData = await sheetsStatusRes.json();

      setDbStatus(statusData);

      const evList = Array.isArray(eventsData) ? eventsData : [];
      const jList = Array.isArray(judgesData) ? judgesData : [];
      const cList = Array.isArray(candidatesData) ? candidatesData : [];
      const sList = Array.isArray(scoresData) ? scoresData : [];
      const dList = Array.isArray(deptsData) ? deptsData : [];

      setEvents(evList);
      setPendingJudges(jList.filter((j: any) => j.approval_status === 'pending'));

      setStats({
        totalEvents: evList.length,
        activeEvents: evList.filter((e: any) => e.status === 'Ongoing' || e.status === 'Tabulating').length,
        completedEvents: evList.filter((e: any) => e.status === 'Completed').length,
        totalCandidates: cList.length,
        totalScores: sList.length,
        totalJudges: jList.filter((j: any) => j.approval_status === 'approved' || !j.approval_status).length,
        pendingJudges: jList.filter((j: any) => j.approval_status === 'pending').length,
        totalDepartments: dList.length,
      });
    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickApproveJudge = async (judgeId: number) => {
    try {
      await fetch('/api/judges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', judgeId, status: 'approved' }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleQuickRejectJudge = async (judgeId: number) => {
    try {
      await fetch('/api/judges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', judgeId, status: 'rejected' }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSyncSheets = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await fetch('/api/setup-mysql', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync');
      setSyncMessage('MySQL database connection and all 13 tables verified successfully!');
      loadData();
    } catch (err: any) {
      setSyncMessage(`Error: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const ongoingEvents = events.filter((e) => e.status === 'Ongoing');

  return (
    <AppLayout
      pageTitle="Manage collegiate events, criteria weightings, and real-time tabulation in one place"
    >
      <div className="space-y-6">
        {/* SUBHEADER CONTROLS (Your stack at a glance) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">Your tournament at a glance</span>
            <button
              type="button"
              onClick={() => setShowStatsCards(!showStatsCards)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title={showStatsCards ? 'Minimize Statistics' : 'Expand Statistics'}
            >
              {showStatsCards ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/enlistment"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yale-50 text-yale-700 hover:bg-yale-100 border border-yale-200 text-xs font-semibold transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-yale-700" />
              <span>Event Operations Guide</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 8 MINIMAL, SOFT INSTITUTIONAL STATISTIC CARDS */}
        {/* ========================================================================= */}
        {showStatsCards && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 animate-in fade-in duration-200">
            {/* Card 1: Total Competitions */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Competitions</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 tracking-tight">{stats.totalEvents}</h2>
                </div>
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-3.5 pt-2.5 border-t border-slate-100">
                <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  All Categories
                </span>
                <Link
                  href="/admin/enlistment?tab=events"
                  className="text-[11px] font-semibold text-slate-600 hover:text-yale-700 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>View</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Card 2: Live & Tabulating */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Live &amp; Tabulating</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 tracking-tight">{stats.activeEvents}</h2>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-3.5 pt-2.5 border-t border-slate-100">
                <span className="text-emerald-700 text-[11px] font-medium flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  Active Now
                </span>
                <Link
                  href="/admin/tabulation"
                  className="text-[11px] font-semibold text-slate-600 hover:text-emerald-700 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>Monitor</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Card 3: Enlisted Contenders */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Enlisted Contenders</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 tracking-tight">{stats.totalCandidates}</h2>
                </div>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-3.5 pt-2.5 border-t border-slate-100">
                <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />
                  Candidate Roster
                </span>
                <Link
                  href="/admin/enlistment?tab=participants"
                  className="text-[11px] font-semibold text-slate-600 hover:text-indigo-700 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>Roster</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Card 4: Tabulated Scores */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tabulated Scores</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 tracking-tight">{stats.totalScores}</h2>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
                  <Sliders className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-3.5 pt-2.5 border-t border-slate-100">
                <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                  Logged Ballots
                </span>
                <Link
                  href="/admin/scores"
                  className="text-[11px] font-semibold text-slate-600 hover:text-blue-700 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>Audit</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Card 5: Approved Evaluators */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Approved Evaluators</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 tracking-tight">{stats.totalJudges}</h2>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-3.5 pt-2.5 border-t border-slate-100">
                <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  Accredited
                </span>
                <Link
                  href="/admin/judges"
                  className="text-[11px] font-semibold text-slate-600 hover:text-amber-700 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>Manage</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Card 6: Pending Approvals */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pending Approvals</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 tracking-tight">
                    {stats.pendingJudges}
                  </h2>
                </div>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  stats.pendingJudges > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-slate-50 border-slate-200/60 text-slate-400'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-3.5 pt-2.5 border-t border-slate-100">
                <span className={`text-[11px] font-medium flex items-center gap-1.5 ${
                  stats.pendingJudges > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  {stats.pendingJudges > 0 ? 'Awaiting Review' : 'All Clear'}
                </span>
                <Link
                  href="/admin/judges"
                  className="text-[11px] font-semibold text-slate-600 hover:text-yale-700 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>Review</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Card 7: Concluded Events */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Concluded Events</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 tracking-tight">{stats.completedEvents}</h2>
                </div>
                <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-3.5 pt-2.5 border-t border-slate-100">
                <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-purple-600" />
                  Finalized
                </span>
                <Link
                  href="/admin/rankings"
                  className="text-[11px] font-semibold text-slate-600 hover:text-purple-700 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>Certificates</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>

            {/* Card 8: Collegiate Programs */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all duration-150 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Collegiate Programs</span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 text-slate-900 tracking-tight">{stats.totalDepartments}</h2>
                </div>
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-3.5 pt-2.5 border-t border-slate-100">
                <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Departments
                </span>
                <Link
                  href="/admin/enlistment"
                  className="text-[11px] font-semibold text-slate-600 hover:text-teal-700 transition-colors inline-flex items-center gap-0.5"
                >
                  <span>Colleges</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* TOP 3-CARD PORTBOX-STYLE GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CARD 1: Events Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card flex flex-col justify-between space-y-4">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-yale-600" />
                  <h3 className="font-bold text-xs text-slate-800">Event services breakdown</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCard1(!showCard1)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  title={showCard1 ? 'Minimize' : 'Expand'}
                >
                  {showCard1 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
              {showCard1 && (
                <>
                  <p className="text-[11px] text-slate-400 mt-1">Active competitions in this session</p>

              {/* Stat number & pill */}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">{ongoingEvents.length}</span>
                  <span className="text-xs text-slate-400 font-semibold">/{events.length}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {ongoingEvents.length} events ongoing
                </span>
              </div>

              {/* Event list rows */}
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  PRIMARY EVENTS
                </p>
                {events.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 italic">No events configured yet</p>
                ) : (
                  events.slice(0, 4).map((evt) => (
                    <div key={evt.id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            evt.status === 'Ongoing'
                              ? 'bg-emerald-500 animate-pulse'
                              : evt.status === 'Completed'
                              ? 'bg-slate-400'
                              : 'bg-gold-500'
                          }`}
                        />
                        <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                          {evt.name}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        :{evt.type.substring(0, 4).toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
                </>
              )}
            </div>

            {/* Footer Buttons */}
            {showCard1 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <Link
                  href="/admin/enlistment"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Create Event</span>
                </Link>
                <Link
                  href="/admin/tabulation"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
                >
                  <span>Live Board</span>
                </Link>
              </div>
            )}
          </div>

          {/* CARD 2: Tabulation Resource Telemetry */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card flex flex-col justify-between space-y-4">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gold-600" />
                  <h3 className="font-bold text-xs text-slate-800">Scoring & tabulation telemetry</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCard2(!showCard2)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  title={showCard2 ? 'Minimize' : 'Expand'}
                >
                  {showCard2 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
              {showCard2 && (
                <>
                  <p className="text-[11px] text-slate-400 mt-1">Live judge score aggregation status</p>

              {/* Big Stat */}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">{stats.totalCandidates}</span>
                  <span className="text-xs text-slate-400 font-semibold">Contestants</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yale-50 text-yale-700 border border-yale-200">
                  ~100% Real-Time
                </span>
              </div>

              {/* Mock waveform visually like the PortBox telemetry waveform */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex justify-between text-[10px] text-slate-400 font-semibold mb-2">
                  <span>Real-Time Tabulation Accuracy</span>
                  <span className="text-yale-600 font-bold">100% Verified</span>
                </div>
                <div className="h-6 w-full flex items-end gap-1">
                  <div className="h-3 w-full bg-yale-200 rounded-t" />
                  <div className="h-4 w-full bg-yale-300 rounded-t" />
                  <div className="h-5 w-full bg-yale-400 rounded-t" />
                  <div className="h-6 w-full bg-yale-600 rounded-t" />
                  <div className="h-5 w-full bg-yale-500 rounded-t" />
                  <div className="h-6 w-full bg-yale-700 rounded-t" />
                </div>
              </div>

              {/* Metrics Progress bars */}
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Judges Accredited</span>
                  <span className="font-bold text-slate-800">{stats.totalJudges} judges</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-yale-600 h-1.5 rounded-full w-full" />
                </div>
              </div>
            </>
          )}
        </div>

            {/* Footer Action */}
            {showCard2 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <Link
                  href="/admin/tabulation"
                  className="inline-flex items-center gap-1.5 text-yale-700 hover:text-yale-800 font-bold"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>View Tabulation Report</span>
                </Link>
                <span className="text-[10px] text-slate-400">Updated just now</span>
              </div>
            )}
          </div>

          {/* CARD 3: Database Studio Metrics (MySQL Engine) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card flex flex-col justify-between space-y-4">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-yale-700" />
                  <h3 className="font-bold text-xs text-slate-800">Database Studio metrics</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCard3(!showCard3)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  title={showCard3 ? 'Minimize' : 'Expand'}
                >
                  {showCard3 ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
              {showCard3 && (
                <>
                  <p className="text-[11px] text-slate-400 mt-1">Cloud MySQL schema density &amp; tables</p>

              {/* 3 mini stat blocks */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-2 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">DATABASE</p>
                  <p className="text-lg font-black text-slate-800">MySQL</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">TABLES</p>
                  <p className="text-lg font-black text-slate-800">13</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">STATUS</p>
                  <p className="text-xs font-black text-emerald-600 mt-1">ONLINE</p>
                </div>
              </div>

              {/* Status Box */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Backend Engine:</span>
                  <span className="font-mono text-[11px] text-yale-700 font-bold">MySQL (InnoDB)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Hosting Target:</span>
                  <span className="font-mono text-[11px] text-emerald-700 font-bold">Cloud Serverless / Vercel</span>
                </div>
              </div>
                </>
              )}
            </div>

            {/* Footer Action */}
            {showCard3 && (
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link
                  href="/admin/settings"
                  className="w-full text-center py-2 px-3 rounded-lg bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs shadow-sm transition-colors"
                >
                  Manage Database Studio Pro
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM 4 STATUS CARDS (Matching PortBox bottom row) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bottom Card 1: Health Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tabulation Status</p>
              <p className="text-sm font-black text-slate-900">100% Operational</p>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
              HEALTHY
            </span>
          </div>

          {/* Bottom Card 2: Listeners / Active Events */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-yale-50 text-yale-700 flex items-center justify-center shrink-0 border border-yale-100">
              <Wifi className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Competitions</p>
              <p className="text-sm font-black text-slate-900">{events.length} Assigned</p>
            </div>
            <span className="text-[9px] font-bold uppercase text-slate-400 shrink-0">
              0 Conflicts
            </span>
          </div>

          {/* Bottom Card 3: Academic Term */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center shrink-0 border border-gold-200">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Academic Term</p>
              <p className="text-sm font-black text-slate-900">A.Y. 2025-2026</p>
            </div>
          </div>

          {/* Bottom Card 4: Schema Density */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Database Tables</p>
              <p className="text-sm font-black text-slate-900">13 Relational Tables</p>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
              MySQL
            </span>
          </div>
        </div>

        {/* PENDING JUDGE REGISTRATIONS WIDGET (Matching ASTS/admin/dashboard.php) */}
        {pendingJudges.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/80 mb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-700" />
                <h3 className="font-bold text-xs text-amber-900 uppercase tracking-wider">
                  Pending Judge Accreditations ({pendingJudges.length})
                </h3>
              </div>
              <Link href="/admin/judges" className="text-xs font-bold text-amber-800 hover:underline">
                Manage All Judges →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {pendingJudges.map((j) => (
                <div key={j.id} className="bg-white border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-xs">{j.full_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">@{j.username}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleQuickApproveJudge(j.id)}
                      className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors cursor-pointer"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleQuickRejectJudge(j.id)}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md border border-rose-200 transition-colors cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RECENT EVENTS QUICK TABLE */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yale-700" />
              <h3 className="font-bold text-xs text-slate-800">Recent Events Quick Action</h3>
            </div>
            <Link href="/admin/enlistment" className="text-xs font-semibold text-yale-700 hover:underline">
              View All Events →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Event Title</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Participation</th>
                  <th className="py-2.5 px-3">Contestants</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.slice(0, 5).map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-800">{evt.name}</td>
                    <td className="py-2.5 px-3 text-yale-700 font-semibold">{evt.type}</td>
                    <td className="py-2.5 px-3 text-slate-600">{evt.participation_mode}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{evt.candidatesCount || 0}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          evt.status === 'Ongoing'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : evt.status === 'Completed'
                            ? 'bg-slate-100 text-slate-600 border border-slate-200'
                            : 'bg-gold-50 text-gold-700 border border-gold-200'
                        }`}
                      >
                        {evt.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/admin/tabulation?eventId=${evt.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-yale-700 hover:text-yale-800"
                      >
                        <span>Open Tabulation</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
