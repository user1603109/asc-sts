'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import {
  Calendar,
  Users,
  UserCheck,
  Trophy,
  Database,
  ArrowRight,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ExternalLink,
  ShieldCheck,
  Wifi,
  Clock,
  Layers,
  Activity,
  ChevronDown,
  ChevronUp,
  Play,
  Square,
  BookOpen,
  Sparkles,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    eventsCount: 0,
    candidatesCount: 0,
    judgesCount: 0,
    scoresCount: 0,
  });
  const [events, setEvents] = useState<any[]>([]);
  const [pendingJudges, setPendingJudges] = useState<any[]>([]);
  const [googleStatus, setGoogleStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventsRes, judgesRes, sheetsStatusRes] = await Promise.all([
        fetch('/api/events'),
        fetch('/api/judges'),
        fetch('/api/setup-sheets'),
      ]);

      const eventsData = await eventsRes.json();
      const judgesData = await judgesRes.json();
      const statusData = await sheetsStatusRes.json();

      setGoogleStatus(statusData);

      if (Array.isArray(judgesData)) {
        setPendingJudges(judgesData.filter((j: any) => j.approval_status === 'pending'));
      }

      if (Array.isArray(eventsData)) {
        setEvents(eventsData);
        const totalCandidates = eventsData.reduce((acc, curr) => acc + (curr.candidatesCount || 0), 0);
        setStats({
          eventsCount: eventsData.length,
          candidatesCount: totalCandidates,
          judgesCount: Array.isArray(judgesData) ? judgesData.length : 0,
          scoresCount: 0,
        });
      }
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
      const res = await fetch('/api/setup-sheets', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sync');
      setSyncMessage('Google Sheets connection and all 13 tables verified successfully!');
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
      googleConfigured={googleStatus?.googleConfigured}
    >
      <div className="space-y-6">
        {/* SUBHEADER CONTROLS (Your stack at a glance) */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">Your tournament at a glance</span>
            <button className="text-slate-400 hover:text-slate-600 p-0.5">
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/events"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yale-50 text-yale-700 hover:bg-yale-100 border border-yale-200 text-xs font-semibold transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-yale-700" />
              <span>Event Operations Guide</span>
            </Link>
          </div>
        </div>

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
                <button className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
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
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <Link
                href="/admin/events"
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
                <button className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Live judge score aggregation status</p>

              {/* Big Stat */}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">{stats.candidatesCount}</span>
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
                  <span className="font-bold text-slate-800">{stats.judgesCount} judges</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-yale-600 h-1.5 rounded-full w-full" />
                </div>
              </div>
            </div>

            {/* Footer Action */}
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
          </div>

          {/* CARD 3: Database Studio Metrics (Google Sheets) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card flex flex-col justify-between space-y-4">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-yale-700" />
                  <h3 className="font-bold text-xs text-slate-800">Database Studio metrics</h3>
                </div>
                <button className="text-slate-400 hover:text-slate-600">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Google Sheets schema density & tables</p>

              {/* 3 mini stat blocks */}
              <div className="grid grid-cols-3 gap-2 mt-3 pt-2 text-center">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">DATABASES</p>
                  <p className="text-lg font-black text-slate-800">1</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">TABLES</p>
                  <p className="text-lg font-black text-slate-800">13</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                  <p className="text-[10px] uppercase font-bold text-slate-400">STATUS</p>
                  <p className="text-xs font-black text-emerald-600 mt-1">SYNCED</p>
                </div>
              </div>

              {/* Status Box */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Backend Engine:</span>
                  <span className="font-mono text-[11px] text-yale-700 font-bold">Google Sheets API</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Cloud Storage:</span>
                  <span className="font-mono text-[11px] text-slate-700">5TB Google Drive</span>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link
                href="/admin/settings"
                className="w-full text-center py-2 px-3 rounded-lg bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs shadow-sm transition-colors"
              >
                Manage Database Studio Pro
              </Link>
            </div>
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
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Schema Density</p>
              <p className="text-sm font-black text-slate-900">13 Sheets • 0 SQL</p>
            </div>
            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
              Cloud
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
            <Link href="/admin/events" className="text-xs font-semibold text-yale-700 hover:underline">
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
