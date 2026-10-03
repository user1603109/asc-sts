'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Trophy, RefreshCw, Award, Search, CheckCircle2 } from 'lucide-react';
import { Event } from '@/lib/types';
import { TabulationResult } from '@/lib/tabulation';

function RankingsContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get('eventId');

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || '');
  const [eventSearch, setEventSearch] = useState('');
  const [tabData, setTabData] = useState<{
    event: Event;
    portions: any[];
    criteria: any[];
    judges: any[];
    tabulations: TabulationResult[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setEvents(data);
          if (!selectedEventId) setSelectedEventId(String(data[0].id));
        }
      });
  }, []);

  const loadRankings = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tabulation?eventId=${selectedEventId}`);
      const data = await res.json();
      setTabData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, [selectedEventId]);

  const filteredEvents = events.filter((evt) =>
    evt.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
    (evt.type && evt.type.toLowerCase().includes(eventSearch.toLowerCase()))
  );

  return (
    <AppLayout
      pageTitle="Official Competition Rankings"
      pageSubtitle="Authenticated composite leaderboard and award standings calculated across weighted criteria"
    >
      <div className="space-y-6">
        {/* Controls Card with Searchable Competition Selector */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            {/* Search Input Filter */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Search competition..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white"
              />
            </div>

            {/* Event Dropdown */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-semibold text-slate-600 shrink-0">Competition:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-yale-600 focus:bg-white truncate"
              >
                {filteredEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} ({evt.status || 'Upcoming'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadRankings}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Standings</span>
            </button>
          </div>
        </div>

        {/* Podium Top 3 Highlight Cards */}
        {tabData && tabData.tabulations.length >= 3 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 2nd Place */}
            {tabData.tabulations[1] && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card flex items-center gap-4 order-2 md:order-1">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-300 flex items-center justify-center font-black text-slate-700 text-lg shadow-xs">
                  2
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">1st Runner Up</span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    #{tabData.tabulations[1].candidate.order_number} {tabData.tabulations[1].candidate.name}
                  </h3>
                  <p className="text-xs font-mono font-bold text-yale-700 mt-0.5">
                    {tabData.tabulations[1].totalScore.toFixed(2)} pts
                  </p>
                </div>
              </div>
            )}

            {/* 1st Place (Champion) */}
            {tabData.tabulations[0] && (
              <div className="bg-gradient-to-b from-amber-500/10 to-white border-2 border-amber-400 rounded-2xl p-5 shadow-card flex items-center gap-4 order-1 md:order-2">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-navy-950 font-black text-2xl shadow-sm">
                  <Trophy className="w-7 h-7 text-navy-950" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-navy-950">
                    Grand Champion (1st)
                  </span>
                  <h3 className="text-base font-black text-slate-900 truncate mt-1">
                    #{tabData.tabulations[0].candidate.order_number} {tabData.tabulations[0].candidate.name}
                  </h3>
                  <p className="text-sm font-mono font-black text-yale-800 mt-0.5">
                    {tabData.tabulations[0].totalScore.toFixed(2)} pts
                  </p>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {tabData.tabulations[2] && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card flex items-center gap-4 order-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-900/10 border border-amber-800/20 flex items-center justify-center font-black text-amber-800 text-lg shadow-xs">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">2nd Runner Up</span>
                  <h3 className="text-sm font-bold text-slate-900 truncate">
                    #{tabData.tabulations[2].candidate.order_number} {tabData.tabulations[2].candidate.name}
                  </h3>
                  <p className="text-xs font-mono font-bold text-yale-700 mt-0.5">
                    {tabData.tabulations[2].totalScore.toFixed(2)} pts
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Complete Rankings Roster Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yale-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Official Roster Leaderboard ({tabData?.tabulations.length || 0} Contenders)
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {tabData?.event ? `${tabData.event.name}` : ''}
            </span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-yale-700 mb-2" />
              Calculating official standings...
            </div>
          ) : !tabData || tabData.tabulations.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">
              No contenders tabulated for this event yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-20 text-center">Rank</th>
                    <th className="py-3 px-4">Contender</th>
                    <th className="py-3 px-4">Course Program</th>
                    {tabData.portions.map((p) => (
                      <th key={p.id} className="py-3 px-4 text-right">
                        {p.portion_name} ({p.percentage}%)
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right font-black">Composite Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tabData.tabulations.map((res) => (
                    <tr
                      key={res.candidate.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        res.rank === 1 ? 'bg-amber-50/40 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-black">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            res.rank === 1
                              ? 'bg-amber-400 text-navy-950 shadow-xs'
                              : res.rank === 2
                              ? 'bg-slate-200 text-slate-800'
                              : res.rank === 3
                              ? 'bg-amber-800 text-white'
                              : 'text-slate-500 border border-slate-200'
                          }`}
                        >
                          {res.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                            {res.candidate.image_path ? (
                              <img
                                src={res.candidate.image_path}
                                alt={res.candidate.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              `#${res.candidate.order_number}`
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">
                              #{res.candidate.order_number} {res.candidate.name}
                            </p>
                            <p className="text-[10px] text-slate-400">{res.candidate.year_level || '1st Year'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {res.candidate.course_name || 'General Program'}
                      </td>
                      {tabData.portions.map((p) => {
                        const pScore = (res.portionScores || res.portionBreakdown || []).find(
                          (ps: any) => Number(ps.portionId) === Number(p.id)
                        );
                        return (
                          <td key={p.id} className="py-3 px-4 text-right font-mono text-slate-700">
                            {pScore ? Number(pScore.weightedScore ?? pScore.portionTotal ?? 0).toFixed(2) : '0.00'}
                          </td>
                        );
                      })}
                      <td className="py-3 px-4 text-right font-black font-mono text-sm text-yale-800 bg-yale-50/50">
                        {res.totalScore.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function AdminRankingsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Rankings Board...</div>}>
      <RankingsContent />
    </Suspense>
  );
}
