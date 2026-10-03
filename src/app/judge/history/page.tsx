'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import JudgeLayout from '@/components/JudgeLayout';
import {
  History,
  Calendar,
  ArrowRight,
  CheckCircle2,
  Trophy,
  Users,
  Search,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';
import { Event, Score } from '@/lib/types';

export default function JudgeHistoryPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) return;
        const meData = await meRes.json();
        if (meData.authenticated && meData.user) {
          setCurrentUser(meData.user);

          const [eventsRes, scoresRes] = await Promise.all([
            fetch('/api/events'),
            fetch(`/api/scores?judgeId=${meData.user.userId}`),
          ]);

          const eventsData = eventsRes.ok ? await eventsRes.json() : [];
          const scoresData = scoresRes.ok ? await scoresRes.json() : [];

          if (Array.isArray(eventsData)) {
            // Include completed, tabulating or any event where the judge submitted scores
            const scoredEventIds = new Set(scoresData.map((s: Score) => Number(s.event_id)));
            const historical = eventsData.filter(
              (e: Event) =>
                e.status === 'Completed' ||
                e.status === 'Tabulating' ||
                scoredEventIds.has(Number(e.id))
            );
            setEvents(historical);
          }

          if (Array.isArray(scoresData)) {
            setScores(scoresData);
          }
        }
      } catch (e) {
        console.error('Failed to load history:', e);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const filteredEvents = events.filter((e) =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.type?.toLowerCase().includes(search.toLowerCase()) ||
    e.organizer?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <JudgeLayout
      user={currentUser}
      pageTitle="Scoring History & Tabulation Archive"
      pageSubtitle="Review your past submitted scorecards and archived institutional competitions"
    >
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Search Bar */}
        <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search historical competitions by event name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-[#0F4C81] rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none transition-all"
            />
          </div>
          <span className="text-xs font-bold text-slate-500 whitespace-nowrap hidden sm:inline">
            {filteredEvents.length} Competitions
          </span>
        </div>

        {/* LIST MODE (NOT TABULAR) */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F4C81] mb-2" />
            <p className="text-xs font-bold text-slate-700">Loading your adjudication records...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Past Adjudications Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Completed and archived competition scorecards will be permanently stored here for audit and verification.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((evt) => {
              const eventScores = scores.filter((s) => Number(s.event_id) === Number(evt.id));
              const scoredCandidates = new Set(eventScores.map((s) => Number(s.candidate_id))).size;

              return (
                <div
                  key={evt.id}
                  className="bg-white border border-slate-200 hover:border-[#0F4C81]/50 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {evt.type || 'Competition'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>{evt.status}</span>
                      </span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                      {evt.name}
                    </h3>

                    {evt.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {evt.description}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2 sm:gap-4 flex-wrap text-xs text-slate-600">
                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60">
                        <Users className="w-3.5 h-3.5 text-[#0F4C81]" />
                        <span>Contestants Evaluated: <strong className="text-slate-900 font-bold">{scoredCandidates}</strong></span>
                      </span>

                      <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>AY {evt.academic_year || '2025-2026'}</span>
                      </span>

                      {evt.organizer && (
                        <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60 text-slate-500">
                          <span>{evt.organizer}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Scores Locked & Synced</span>
                    </span>

                    <Link
                      href={`/judge/score/${evt.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#0F4C81] text-slate-700 hover:text-white font-bold text-xs transition-colors"
                    >
                      <span>Review Score Record</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </JudgeLayout>
  );
}
