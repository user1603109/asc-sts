'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import JudgeLayout from '@/components/JudgeLayout';
import { Trophy, RefreshCw, PlayCircle, ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { Event } from '@/lib/types';

export default function JudgeScoreIndexPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) return;
        const me = await meRes.json();
        if (me.authenticated) {
          setUser(me.user);
          const evtsRes = await fetch(`/api/events?judgeId=${me.user.userId}`);
          const evts = evtsRes.ok ? await evtsRes.json() : [];
          if (Array.isArray(evts)) {
            // If only 1 active/ongoing event, automatically redirect to it for quick judging!
            const ongoing = evts.filter((e: any) => e.status?.toLowerCase() === 'ongoing');
            if (ongoing.length === 1) {
              router.push(`/judge/score/${ongoing[0].id}`);
              return;
            } else if (evts.length === 1) {
              router.push(`/judge/score/${evts[0].id}`);
              return;
            }
            setEvents(evts);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  return (
    <JudgeLayout
      user={user}
      pageTitle="Touch Scoring Arena"
      pageSubtitle="Select a competition below to launch your digital touch scorecard"
    >
      <div className="space-y-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0F4C81] mb-2" />
            <p className="text-xs font-bold text-slate-700">Loading your assigned scorecards...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center shadow-xs space-y-3">
            <Clock className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Active Competitions Assigned</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You are currently not assigned to any ongoing competition events. When the Tabulation Committee assigns you to a competition, it will appear here.
            </p>
            <div className="pt-2">
              <Link
                href="/judge/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0F4C81] text-white text-xs font-bold"
              >
                <span>Return to Dashboard</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center gap-2.5 text-xs text-amber-800">
              <Trophy className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Please select the competition event you are currently adjudicating from the list below:
              </span>
            </div>

            <div className="space-y-3">
              {events.map((evt) => (
                <Link
                  key={evt.id}
                  href={`/judge/score/${evt.id}`}
                  className="block bg-white border border-slate-200 hover:border-[#0F4C81] p-4 sm:p-5 rounded-2xl shadow-xs hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#0F4C81]/10 text-[#0F4C81]">
                          {evt.type}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {evt.status}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#0F4C81] transition-colors">
                        {evt.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        AY {evt.academic_year || '2025-2026'} • {evt.organizer || 'Tabulation Committee'}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0F4C81] group-hover:bg-[#0A3258] text-white text-xs font-bold shadow-xs transition-colors">
                      <PlayCircle className="w-4 h-4 text-amber-400" />
                      <span className="hidden sm:inline">Launch Scorecard</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </JudgeLayout>
  );
}
