'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Printer, RefreshCw, Trophy, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Event } from '@/lib/types';
import { TabulationResult } from '@/lib/tabulation';

export default function AdminReportsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
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
          setSelectedEventId(String(data[0].id));
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    setLoading(true);
    fetch(`/api/tabulation?eventId=${selectedEventId}`)
      .then((res) => res.json())
      .then((data) => setTabData(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [selectedEventId]);

  return (
    <AppLayout
      pageTitle="Certified Tabulation Certificates & Reports"
      pageSubtitle="Generate official institutional tabulation certificates and audit sheets for signature certification"
    >
      <div className="space-y-6">
        {/* Controls Card */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="flex items-center gap-3">
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

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Official Certificate</span>
          </button>
        </div>

        {/* Certificate Sheet Display */}
        <div className="bg-white border border-slate-200 print:border-none rounded-xl p-8 sm:p-12 shadow-card space-y-8 text-center text-slate-800 print:text-black">
          {/* Header */}
          <div className="border-b border-slate-200 print:border-black pb-6 space-y-1">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-500">
              Republic of the Philippines
            </p>
            <h2 className="text-2xl font-black text-slate-900 print:text-black tracking-tight">
              APAYAO STATE COLLEGE
            </h2>
            <p className="text-xs text-yale-700 print:text-slate-700 font-semibold">
              Office of Student Affairs & Services • Tabulation Committee
            </p>
            <div className="pt-3">
              <span className="inline-block px-3 py-1 rounded-full bg-gold-50 text-gold-700 border border-gold-300 font-bold text-xs uppercase tracking-wider print:border-black print:bg-transparent print:text-black">
                Official Certificate of Final Tabulation
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 print:text-black mt-2">
              {tabData?.event.name}
            </h3>
            <p className="text-xs text-slate-400 print:text-slate-600">
              Academic Year: {tabData?.event.academic_year || '2025-2026'} | Category: {tabData?.event.type}
            </p>
          </div>

          {/* Results Table */}
          {loading ? (
            <div className="py-12">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-yale-700" />
            </div>
          ) : !tabData || tabData.tabulations.length === 0 ? (
            <p className="text-xs text-slate-400 py-8">No tabulation data available.</p>
          ) : (
            <div className="overflow-x-auto text-left">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 print:border-black text-xs font-bold text-slate-600 print:text-black">
                    <th className="py-2.5 px-3 text-center">Rank</th>
                    <th className="py-2.5 px-3 text-center">No.</th>
                    <th className="py-2.5 px-3">Contestant Name</th>
                    <th className="py-2.5 px-3 text-right">Final Average</th>
                    <th className="py-2.5 px-3 text-right">Award / Title</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300 text-xs">
                  {tabData.tabulations.map((res) => (
                    <tr key={res.candidate.id}>
                      <td className="py-3 px-3 text-center font-black">{res.rank}</td>
                      <td className="py-3 px-3 text-center font-bold text-slate-500">#{res.candidate.order_number}</td>
                      <td className="py-3 px-3 font-bold text-slate-900 print:text-black">
                        {res.candidate.name}
                        {res.candidate.year_level && (
                          <span className="block text-[11px] font-normal text-slate-400 print:text-slate-600">
                            {res.candidate.year_level}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-yale-700 print:text-black">
                        {res.totalScore.toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-gold-700 print:text-black">
                        {res.rank === 1
                          ? 'Champion / Winner'
                          : res.rank === 2
                          ? '1st Runner-Up'
                          : res.rank === 3
                          ? '2nd Runner-Up'
                          : 'Finalist'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures */}
          <div className="pt-10 text-xs text-left text-slate-700 print:text-black space-y-8">
            <p className="font-bold text-center uppercase tracking-wider text-slate-600">
              Signed and Certified Correct:
            </p>

            <div className="grid grid-cols-3 gap-8 text-center pt-4">
              {tabData?.judges.map((j) => (
                <div key={j.id} className="border-t border-slate-300 print:border-black pt-2">
                  <p className="font-bold uppercase text-slate-900 print:text-black">{j.full_name}</p>
                  <p className="text-[10px] text-slate-500">Event Judge</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-12 text-center pt-6">
              <div className="border-t border-slate-300 print:border-black pt-2">
                <p className="font-bold uppercase text-slate-900 print:text-black">Official Tabulator</p>
                <p className="text-[10px] text-slate-500">Committee on Tabulation</p>
              </div>
              <div className="border-t border-slate-300 print:border-black pt-2">
                <p className="font-bold uppercase text-slate-900 print:text-black">College President / VP</p>
                <p className="text-[10px] text-slate-500">Apayao State College</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
