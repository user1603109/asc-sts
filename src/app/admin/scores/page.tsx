'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { Event } from '@/lib/types';
import { TabulationResult } from '@/lib/tabulation';

function ScoresContent() {
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

  const loadScores = async () => {
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
    loadScores();
  }, [selectedEventId]);

  return (
    <AppLayout
      pageTitle="Live Scoring Matrix"
      pageSubtitle="Real-time audit scorecard of individual criteria scores recorded by accredited judges"
    >
      <div className="space-y-6">
        {/* Controls Card */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Select Competition:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-yale-600 focus:bg-white"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>{evt.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadScores}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Matrix</span>
            </button>
          </div>
        </div>

        {/* Scores Matrix Table Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-yale-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Score Evaluation Grid ({tabData?.tabulations.length || 0} Contenders • {tabData?.judges.length || 0} Judges)
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading scoring grid...</div>
          ) : !tabData || tabData.tabulations.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No score records submitted yet. When judges input scores, they will update here in real-time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
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
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">
                          #{res.candidate.order_number} {res.candidate.name}
                        </span>
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
          )}
        </div>
      </div>
    </AppLayout>
  );
}

export default function AdminScoresPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Score Matrix...</div>}>
      <ScoresContent />
    </Suspense>
  );
}
