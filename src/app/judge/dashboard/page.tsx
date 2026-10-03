'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import JudgeLayout from '@/components/JudgeLayout';
import {
  Calendar,
  Clock,
  RefreshCw,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Users,
  Award,
  Layers,
  ChevronRight,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Event, Score } from '@/lib/types';

export default function JudgeDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Ongoing' | 'Upcoming' | 'Completed'>('All');
  const [showAllEventsMode, setShowAllEventsMode] = useState(false);

  const loadDashboardData = async (forceAll: boolean = false) => {
    try {
      setLoading(true);
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        setLoading(false);
        return;
      }
      const userData = await meRes.json();
      if (!userData.authenticated || !userData.user) {
        setLoading(false);
        return;
      }

      setUser(userData.user);
      const judgeId = userData.user.userId;
      const isAdmin = userData.user.role === 'admin';

      // Fetch events: if forceAll or admin wants to see all, fetch all events, otherwise filter by judgeId
      const eventsUrl = (forceAll || (isAdmin && showAllEventsMode))
        ? '/api/events'
        : `/api/events?judgeId=${judgeId}`;

      const [eventsRes, scoresRes] = await Promise.all([
        fetch(eventsUrl),
        fetch(`/api/scores?judgeId=${judgeId}`),
      ]);

      const eventsData = eventsRes.ok ? await eventsRes.json() : [];
      const scoresData = scoresRes.ok ? await scoresRes.json() : [];

      if (Array.isArray(eventsData)) {
        // If assigned events are 0 and user is admin, auto-fallback to all events
        if (eventsData.length === 0 && isAdmin && !forceAll) {
          const allEvtRes = await fetch('/api/events');
          if (allEvtRes.ok) {
            const allEvts = await allEvtRes.json();
            if (Array.isArray(allEvts) && allEvts.length > 0) {
              setEvents(allEvts);
              setShowAllEventsMode(true);
            } else {
              setEvents([]);
            }
          }
        } else {
          setEvents(eventsData);
        }
      }

      if (Array.isArray(scoresData)) {
        setScores(scoresData);
      }
    } catch (e) {
      console.error('Failed to load judge dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [showAllEventsMode]);

  // Compute scoring progress per event
  const eventsWithProgress = useMemo(() => {
    return events.map((evt) => {
      const candidatesCount = Number(evt.candidatesCount) || 0;
      const eventScores = scores.filter((s) => Number(s.event_id) === Number(evt.id));
      
      // Distinct candidates scored by this judge
      const scoredCandidateIds = new Set(eventScores.map((s) => Number(s.candidate_id)));
      const scoredCount = scoredCandidateIds.size;
      const progressPercent = candidatesCount > 0
        ? Math.min(100, Math.round((scoredCount / candidatesCount) * 100))
        : 0;

      return {
        ...evt,
        scoredCount,
        progressPercent,
        isCompleted: candidatesCount > 0 && scoredCount >= candidatesCount,
      };
    });
  }, [events, scores]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    return eventsWithProgress.filter((evt) => {
      const matchesSearch =
        evt.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        evt.organizer?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === 'All' || evt.status?.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [eventsWithProgress, searchQuery, statusFilter]);

  // Summary counts
  const totalAssigned = events.length;
  const ongoingCount = events.filter((e) => e.status === 'Ongoing').length;
  const completedScoringCount = eventsWithProgress.filter((e) => e.isCompleted).length;

  return (
    <JudgeLayout
      user={user}
      pageTitle="Judge Competition Dashboard"
      pageSubtitle="Official scoring portal • Access your assigned competitions and record live scores"
    >
      <div className="space-y-5">
        {/* Welcome Stat Cards Header */}
        <div className="bg-gradient-to-r from-[#0F4C81] via-[#0A3258] to-[#061B33] rounded-2xl p-4 sm:p-6 text-white shadow-md border border-white/10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider mb-2">
                <Shield className="w-3 h-3 text-amber-400" />
                <span>Accredited Official Judge</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Welcome, {user?.fullName || 'Judge Panel'}
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                Your evaluations are recorded in real-time and synchronized directly with the Tabulation Committee. Tap on any assigned competition below to enter the live touchscreen scoring sheet.
              </p>
            </div>

            {/* Quick Summary Badges */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-2 rounded-xl text-center min-w-[80px]">
                <div className="text-[10px] text-slate-300 font-bold uppercase">Assigned</div>
                <div className="text-lg font-black text-amber-300">{totalAssigned}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-2 rounded-xl text-center min-w-[80px]">
                <div className="text-[10px] text-slate-300 font-bold uppercase">Ongoing</div>
                <div className="text-lg font-black text-emerald-300">{ongoingCount}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-2 rounded-xl text-center min-w-[80px]">
                <div className="text-[10px] text-slate-300 font-bold uppercase">Scored</div>
                <div className="text-lg font-black text-white">{completedScoringCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search, Filter & View Controls */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search assigned events by name, type, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-[#0F4C81] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none transition-all"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['All', 'Ongoing', 'Upcoming', 'Completed'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    statusFilter === st
                      ? 'bg-[#0F4C81] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}

              {/* Refresh button */}
              <button
                onClick={() => loadDashboardData()}
                disabled={loading}
                title="Refresh events from server"
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0F4C81]' : ''}`} />
              </button>
            </div>
          </div>

          {/* Admin toggle if applicable */}
          {user?.role === 'admin' && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Admin Test Mode Active: You can preview any competition</span>
              </span>
              <button
                onClick={() => setShowAllEventsMode(!showAllEventsMode)}
                className="text-[11px] font-bold text-[#0F4C81] hover:underline"
              >
                {showAllEventsMode ? 'Show Only My Assigned Events' : 'Show All System Competitions'}
              </button>
            </div>
          )}
        </div>

        {/* LIST MODE COMPETITIONS (NOT TABULAR) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0F4C81]" />
              <span>Assigned Competition Events ({filteredEvents.length})</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">List View (Optimized for Mobile)</span>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0F4C81] mb-2" />
              <p className="text-xs font-bold text-slate-700">Connecting to ASC Tabulation Server...</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Fetching assigned competitions and current scoring progress</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">No Assigned Competitions Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'All'
                    ? 'No events match your current filter. Try resetting search criteria.'
                    : 'The Tabulation Committee has not assigned any active competitions to your judge account yet. Please check back shortly or request assignment from the Tabulator.'}
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('All');
                    loadDashboardData();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Reset Filters & Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((evt) => {
                const isOngoing = evt.status?.toLowerCase() === 'ongoing';
                const isCompleted = evt.status?.toLowerCase() === 'completed';

                return (
                  <div
                    key={evt.id}
                    className="bg-white border border-slate-200 hover:border-[#0F4C81]/50 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
                  >
                    {/* Top Row: Type & Status Badges */}
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-[#0F4C81]/10 text-[#0F4C81] border border-[#0F4C81]/20">
                            {evt.type || 'Competition'}
                          </span>
                          {evt.department && (
                            <span className="text-[10px] font-semibold text-slate-500 hidden sm:inline">
                              {evt.department}
                            </span>
                          )}
                        </div>

                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                            isOngoing
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCompleted
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isOngoing && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                          {isCompleted && <CheckCircle2 className="w-3 h-3 text-slate-500" />}
                          <span>{evt.status}</span>
                        </span>
                      </div>

                      {/* Event Name (Fully displayed without cuts) */}
                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                        {evt.name}
                      </h3>

                      {evt.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {evt.description}
                        </p>
                      )}

                      {/* Meta Information Pills */}
                      <div className="mt-3 flex items-center gap-2 sm:gap-4 flex-wrap text-xs text-slate-600">
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60">
                          <Users className="w-3.5 h-3.5 text-[#0F4C81]" />
                          <span>Contestants: <strong className="text-slate-900 font-bold">{evt.candidatesCount || 0}</strong></span>
                        </span>

                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60">
                          <Layers className="w-3.5 h-3.5 text-[#0F4C81]" />
                          <span>Portions: <strong className="text-slate-900 font-bold">{evt.portionsCount || 0}</strong></span>
                        </span>

                        {evt.academic_year && (
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60 text-slate-500">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>AY {evt.academic_year}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar & Open Scoring Action Button */}
                    <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Judge Evaluation Progress */}
                      <div className="flex-1 max-w-sm">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-1">
                          <span>Your Scoring Progress:</span>
                          <span className={evt.isCompleted ? 'text-emerald-700 font-bold' : 'text-[#0F4C81]'}>
                            {evt.scoredCount} / {evt.candidatesCount || 0} Contestants ({evt.progressPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/70">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              evt.isCompleted
                                ? 'bg-emerald-500'
                                : evt.progressPercent > 0
                                ? 'bg-[#0F4C81]'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${evt.progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Primary Touch Scoring Button */}
                      <Link
                        href={`/judge/score/${evt.id}`}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all ${
                          evt.isCompleted
                            ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                            : isOngoing
                            ? 'bg-[#0F4C81] hover:bg-[#0A3258] text-white'
                            : 'bg-slate-800 hover:bg-slate-900 text-white'
                        }`}
                      >
                        <PlayCircle className="w-4 h-4 text-amber-400" />
                        <span>{evt.isCompleted ? 'Review Submitted Scores' : 'Open Touch Scoring Sheet'}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </JudgeLayout>
  );
}
