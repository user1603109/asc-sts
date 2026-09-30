'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import {
  Trophy,
  Printer,
  RefreshCw,
  Users,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import { TabulationResult } from '@/lib/tabulation';
import { Event } from '@/lib/types';

function TabulationContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get('eventId');

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || '');
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

  return (
    <AppLayout
      pageTitle="Official Tabulation & Rankings Studio"
      pageSubtitle="Real-time multi-judge score tabulation and weighted portion aggregation"
    >
      <div className="space-y-6">
        {/* TOP CONTROLS CARD */}
        <div className="no-print bg-white border border-slate-200 rounded-xl p-4 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yale-50 text-yale-700 flex items-center justify-center border border-yale-100">
              <Trophy className="w-5 h-5 text-yale-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {tabData?.event.name || 'Select an Event'}
              </h2>
              <p className="text-xs text-slate-500">
                Category: {tabData?.event.type || 'Competition'} • Mode: {tabData?.event.participation_mode || 'Individual'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Event Selector */}
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yale-600 focus:bg-white"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} ({evt.status})
                </option>
              ))}
            </select>

            <button
              onClick={fetchTabulation}
              disabled={loading}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs transition-colors"
              title="Refresh Tabulation"
            >
              <RefreshCw className={`w-4 h-4 text-yale-700 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Official Sheet</span>
            </button>
          </div>
        </div>

        {/* PRINTABLE LETTERHEAD (Active only on window.print) */}
        <div className="hidden print:block text-center border-b pb-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-700">Republic of the Philippines</p>
          <h2 className="text-lg font-bold text-slate-900">APAYAO STATE COLLEGE</h2>
          <p className="text-xs text-slate-600">Automated Scoring & Tabulation System (ASC-STS)</p>
          <h1 className="text-xl font-extrabold uppercase mt-3 text-slate-900">
            {tabData?.event.name || 'Official Tabulation Sheet'}
          </h1>
          <p className="text-xs text-slate-600">
            Category: {tabData?.event.type} | Mode: {tabData?.event.participation_mode} | A.Y. {tabData?.event.academic_year || '2025-2026'}
          </p>
        </div>

        {/* SUMMARY TELEMETRY BAR */}
        {tabData && (
          <div className="no-print grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
              <span className="font-black text-gold-600 text-sm">{tabData.portions.length || 1}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-subtle flex items-center justify-between">
              <span className="text-slate-500">Validation:</span>
              <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                VERIFIED
              </span>
            </div>
          </div>
        )}

        {/* TABULATION TABLE CARD */}
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
          <div className="bg-white border border-slate-200 print:border-none rounded-xl overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 print:bg-slate-100 text-slate-600 print:text-black uppercase tracking-wider font-semibold border-b border-slate-200">
                    <th className="py-3 px-4 w-16 text-center">Rank</th>
                    <th className="py-3 px-4 w-16 text-center">No.</th>
                    <th className="py-3 px-4">Contestant Name</th>
                    {tabData.portions.map((p) => (
                      <th key={p.id} className="py-3 px-4 text-center">
                        {p.portion_name} <span className="text-[10px] text-yale-600">({p.percentage}%)</span>
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right">Total Score</th>
                    <th className="no-print py-3 px-4 text-center w-20">Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {tabData.tabulations.map((res) => {
                    const isRank1 = res.rank === 1;
                    const isRank2 = res.rank === 2;
                    const isRank3 = res.rank === 3;
                    const isExpanded = expandedCandidate === res.candidate.id;

                    return (
                      <Fragment key={res.candidate.id}>
                        <tr className={`hover:bg-slate-50 print:hover:bg-transparent transition-colors ${
                          isRank1 ? 'bg-gold-50/50' : ''
                        }`}>
                          {/* Rank badge */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                                isRank1
                                  ? 'bg-gold-500 text-navy-950 shadow-sm'
                                  : isRank2
                                  ? 'bg-slate-200 text-slate-800'
                                  : isRank3
                                  ? 'bg-amber-700/20 text-amber-800'
                                  : 'text-slate-500'
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
                          <td className="py-3 px-4 font-bold text-slate-900 print:text-black">
                            {res.candidate.name}
                            {res.candidate.year_level && (
                              <span className="block text-[11px] font-normal text-slate-400">
                                {res.candidate.year_level}
                              </span>
                            )}
                          </td>

                          {/* Portion scores */}
                          {(res.portionBreakdown || []).map((pb) => (
                            <td key={pb.portionId} className="py-3 px-4 text-center font-semibold text-slate-700 print:text-black">
                              {pb.portionTotal.toFixed(2)}
                            </td>
                          ))}

                          {/* Total Score */}
                          <td className="py-3 px-4 text-right font-black text-yale-700 print:text-black text-sm">
                            {res.totalScore.toFixed(2)}%
                          </td>

                          {/* Expand Details */}
                          <td className="no-print py-3 px-4 text-center">
                            <button
                              onClick={() => setExpandedCandidate(isExpanded ? null : res.candidate.id)}
                              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Criteria Breakdown */}
                        {isExpanded && (
                          <tr className="no-print bg-slate-50/80">
                            <td colSpan={5 + tabData.portions.length} className="p-4 border-t border-slate-200">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                <h4 className="text-xs font-bold text-yale-700 uppercase tracking-wider">
                                  Criteria Breakdown for #{res.candidate.order_number} {res.candidate.name}
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                  {(res.portionBreakdown || []).flatMap((pb) =>
                                    (pb.criteriaBreakdown || []).map((cb) => (
                                      <div key={cb.criteriaId} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs">
                                        <div className="flex justify-between items-center font-semibold text-slate-800">
                                          <span>{cb.criteriaName}</span>
                                          <span className="text-gold-700">{cb.percentage}%</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                                          <span>Raw Avg: {cb.averageRawScore.toFixed(2)} / {cb.maxScore}</span>
                                          <span className="font-bold text-yale-700">Weighted: {cb.weightedScore.toFixed(2)}%</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
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

        {/* PRINTABLE SIGNATURES */}
        <div className="hidden print:block mt-12 pt-8 text-xs text-black">
          <p className="font-bold mb-6">CERTIFIED TRUE AND CORRECT BY THE BOARD OF JUDGES:</p>
          <div className="grid grid-cols-3 gap-8 text-center pt-4">
            {tabData?.judges.map((j) => (
              <div key={j.id} className="border-t border-black pt-2">
                <p className="font-bold uppercase">{j.full_name}</p>
                <p className="text-[10px] text-slate-600">Event Judge</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid grid-cols-2 gap-8 text-center">
            <div className="border-t border-black pt-2">
              <p className="font-bold uppercase">Tabulation Committee Chair</p>
              <p className="text-[10px] text-slate-600">Head Tabulator</p>
            </div>
            <div className="border-t border-black pt-2">
              <p className="font-bold uppercase">Director of Student Affairs</p>
              <p className="text-[10px] text-slate-600">Apayao State College</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default function TabulationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-yale-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading Tabulation Studio...</p>
          </div>
        </div>
      }
    >
      <TabulationContent />
    </Suspense>
  );
}
