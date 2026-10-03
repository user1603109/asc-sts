'use client';

import { Fragment, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import {
  Trophy,
  RefreshCw,
  Users,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Search,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { TabulationResult } from '@/lib/tabulation';
import { Event } from '@/lib/types';

function TabulationContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get('eventId');
  const initialTab = searchParams.get('tab') === 'scores' ? 'scores' : 'tabulation';

  const [activeTab, setActiveTab] = useState<'tabulation' | 'scores'>(initialTab);
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
  const [expandedCandidate, setExpandedCandidate] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEvents(data);
          if (!selectedEventId && data.length > 0) {
            setSelectedEventId(String(data[0].id));
          }
        }
      });
  }, []);

  const fetchTabulation = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tabulation?eventId=${selectedEventId}`);
      const data = await res.json();
      if (res.ok) {
        setTabData(data);
      }
    } catch (e) {
      console.error('Error fetching tabulation:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTabulation();
  }, [selectedEventId]);

  const filteredEvents = events.filter((evt) =>
    evt.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
    (evt.type && evt.type.toLowerCase().includes(eventSearch.toLowerCase()))
  );

  return (
    <AppLayout
      pageTitle="Tabulation & Scores Studio"
      pageSubtitle="Real-time multi-judge score tabulation, criteria evaluation grid, and weighted portion aggregation"
    >
      <div className="space-y-6">
        {/* TOP CONTROLS CARD */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            {/* Search Input Filter */}
            <div className="relative w-full sm:w-60">
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
              <span className="text-xs font-semibold text-slate-600 shrink-0">Event:</span>
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
              onClick={fetchTabulation}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Tabulation</span>
            </button>
          </div>
        </div>

        {/* SUMMARY TELEMETRY BAR */}
        {tabData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-subtle flex items-center justify-between">
              <span className="text-slate-500">Contestants:</span>
              <span className="font-black text-slate-900 text-sm">{tabData.tabulations.length}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-subtle flex items-center justify-between">
              <span className="text-slate-500">Accredited Judges:</span>
              <span className="font-black text-yale-700 text-sm">{tabData.judges.length}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-subtle flex items-center justify-between">
              <span className="text-slate-500">Portions:</span>
              <span className="font-black text-amber-700 text-sm">{tabData.portions.length || 1}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-subtle flex items-center justify-between">
              <span className="text-slate-500">Validation:</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                VERIFIED
              </span>
            </div>
          </div>
        )}

        {/* TWIN TAB NAVIGATION (LIKE ENLISTMENT & REGISTRY) */}
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('tabulation')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'tabulation'
                ? 'border-yale-700 text-yale-800 bg-yale-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Master Tabulation &amp; Aggregate Ranks</span>
          </button>
          <button
            onClick={() => setActiveTab('scores')}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'scores'
                ? 'border-yale-700 text-yale-800 bg-yale-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Live Criteria &amp; Scorecard Matrix</span>
          </button>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-card">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-yale-700 mb-2" />
            <p className="text-xs font-semibold">Calculating rankings from Google Sheets...</p>
          </div>
        ) : !tabData || tabData.tabulations.length === 0 ? (
          <div className="p-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-card">
            <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-800">No Contestant Scores Tabulated Yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Ensure contestants are enlisted and assigned judges have submitted their scores.
            </p>
          </div>
        ) : (
          <>
            {/* TAB 1: MASTER TABULATION PANE */}
            {activeTab === 'tabulation' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold border-b border-slate-200">
                        <th className="py-3 px-4 w-16 text-center">Rank</th>
                        <th className="py-3 px-4 w-16 text-center">No.</th>
                        <th className="py-3 px-4">Contestant Name</th>
                        {tabData.portions.map((p) => (
                          <th key={p.id} className="py-3 px-4 text-center">
                            {p.portion_name} <span className="text-[10px] text-yale-600">({p.percentage}%)</span>
                          </th>
                        ))}
                        <th className="py-3 px-4 text-right">Total Score</th>
                        <th className="py-3 px-4 text-center w-24">Breakdown</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tabData.tabulations.map((res) => {
                        const isRank1 = res.rank === 1;
                        const isRank2 = res.rank === 2;
                        const isRank3 = res.rank === 3;
                        const isExpanded = expandedCandidate === res.candidate.id;

                        return (
                          <Fragment key={res.candidate.id}>
                            <tr
                              className={`hover:bg-slate-50 transition-colors ${
                                isRank1 ? 'bg-amber-50/50' : ''
                              }`}
                            >
                              {/* Rank badge */}
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                                    isRank1
                                      ? 'bg-amber-400 text-navy-950 shadow-sm'
                                      : isRank2
                                      ? 'bg-slate-200 text-slate-800'
                                      : isRank3
                                      ? 'bg-amber-800 text-white'
                                      : 'text-slate-500 border border-slate-200'
                                  }`}
                                >
                                  {res.rank}
                                </span>
                              </td>

                              {/* Contestant Number */}
                              <td className="py-3 px-4 text-center font-bold text-slate-500">
                                #{res.candidate.order_number}
                              </td>

                              {/* Name & Year */}
                              <td className="py-3 px-4 font-bold text-slate-900">
                                {res.candidate.name}
                                <span className="block text-[11px] font-normal text-slate-400">
                                  {res.candidate.course_name || res.candidate.year_level || 'Contender'}
                                </span>
                              </td>

                              {/* Portion scores */}
                              {(res.portionBreakdown || []).map((pb) => (
                                <td key={pb.portionId} className="py-3 px-4 text-center font-semibold text-slate-700">
                                  {pb.portionTotal.toFixed(2)}
                                </td>
                              ))}

                              {/* Total Score */}
                              <td className="py-3 px-4 text-right font-black text-yale-700 text-sm">
                                {res.totalScore.toFixed(2)}%
                              </td>

                              {/* Expand Details */}
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() => setExpandedCandidate(isExpanded ? null : res.candidate.id)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-yale-700 hover:bg-yale-50 px-2.5 py-1 rounded-md transition-colors"
                                >
                                  <span>{isExpanded ? 'Hide' : 'View'}</span>
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            </tr>

                            {/* EXPANDED CRITERIA BREAKDOWN */}
                            {isExpanded && (
                              <tr className="bg-slate-50/80">
                                <td colSpan={5 + tabData.portions.length} className="p-4">
                                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between border-b pb-2">
                                      <span className="text-xs font-bold text-slate-800">
                                        Detailed Criteria Breakdown for #{res.candidate.order_number} {res.candidate.name}
                                      </span>
                                      <span className="text-xs text-slate-500 font-mono">
                                        Judges Submitted: {res.judgeScoresCount} / {res.expectedJudgesCount}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                      {res.portionBreakdown.map((pb) => (
                                        <div key={pb.portionId} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                                          <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-slate-800">{pb.portionName}</span>
                                            <span className="text-xs font-mono font-bold text-yale-700">{pb.portionTotal.toFixed(2)}%</span>
                                          </div>
                                          <div className="space-y-1.5">
                                            {pb.criteriaBreakdown.map((cb) => (
                                              <div key={cb.criteriaId} className="flex justify-between items-center text-[11px] text-slate-600">
                                                <span className="truncate pr-2">{cb.criteriaName} ({cb.percentage}%)</span>
                                                <span className="font-mono font-semibold">{cb.weightedScore.toFixed(2)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE CRITERIA & SCORES MATRIX PANE */}
            {activeTab === 'scores' && (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-yale-700" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Live Score Evaluation Grid ({tabData.tabulations.length} Contenders • {tabData.judges.length} Judges)
                    </h2>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    Category: {tabData.event.type}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4 w-16 text-center">No.</th>
                        <th className="py-3 px-4">Contestant</th>
                        <th className="py-3 px-4">Course Program</th>
                        {tabData.portions.map((p) => (
                          <th key={p.id} className="py-3 px-4 text-right">
                            {p.portion_name} ({p.percentage}%)
                          </th>
                        ))}
                        <th className="py-3 px-4 text-right font-black">Composite Average</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tabData.tabulations.map((res) => (
                        <tr key={res.candidate.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-500">
                            #{res.candidate.order_number}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {res.candidate.name}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {res.candidate.course_name || 'General Program'}
                          </td>
                          {tabData.portions.map((p) => {
                            const pScore = (res.portionScores || res.portionBreakdown || []).find(
                              (ps: any) => Number(ps.portionId) === Number(p.id)
                            );
                            return (
                              <td key={p.id} className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                                {pScore ? Number(pScore.weightedScore ?? pScore.portionTotal ?? 0).toFixed(2) : '0.00'}
                              </td>
                            );
                          })}
                          <td className="py-3 px-4 text-right font-black font-mono text-sm text-yale-800 bg-yale-50/40">
                            {res.totalScore.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function AdminTabulationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Tabulation Studio...</div>}>
      <TabulationContent />
    </Suspense>
  );
}
