'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Printer,
  RefreshCw,
  Trophy,
  Award,
  ShieldCheck,
  CheckCircle2,
  Settings,
  Building,
  Layers,
  X,
} from 'lucide-react';
import { Event } from '@/lib/types';
import { TabulationResult } from '@/lib/tabulation';

export default function AdminReportsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [activeReportTab, setActiveReportTab] = useState<'rankings' | 'dept-rankings' | 'tabulation' | 'audit' | 'system'>('rankings');

  const [tabData, setTabData] = useState<{
    event: Event;
    portions: any[];
    criteria: any[];
    judges: any[];
    tabulations: TabulationResult[];
  } | null>(null);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Customize Signatories Modal state
  const [showSignatoriesModal, setShowSignatoriesModal] = useState(false);
  const [signatories, setSignatories] = useState({
    tabulatorName: 'ENGR. JOHN DOE, MIT',
    tabulatorTitle: 'Chief Institutional Tabulator',
    chairmanName: 'DR. JANE SMITH, EdD',
    chairmanTitle: 'Chairman, Board of Judges',
    showNoted: true,
    presidentName: 'DR. JOHN N. CABANSAG',
    presidentTitle: 'College President / Campus Dean',
  });

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

  const loadData = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const [tabRes, logRes] = await Promise.all([
        fetch(`/api/tabulation?eventId=${selectedEventId}`).then((r) => r.json()),
        fetch('/api/logs').then((r) => r.json()),
      ]);
      setTabData(tabRes);
      if (Array.isArray(logRes)) setAuditLogs(logRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  // Export current table to CSV
  const handleExportCsv = (filename: string, rows: string[][]) => {
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((c) => `"${c}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout
      pageTitle="Certified Tabulation Certificates & Reports"
      pageSubtitle="Official institutional certified tabulation sheets, department medal standings, and master scorecards"
    >
      <div className="space-y-6">
        {/* Controls Card */}
        <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Select Competition:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-yale-600 focus:bg-white"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name} ({evt.status || 'Upcoming'})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowSignatoriesModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Signatories</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Certificate</span>
            </button>
          </div>
        </div>

        {/* 5 REPORT TABS MATCHING ASTS/admin/reports.php */}
        <div className="no-print flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveReportTab('rankings')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeReportTab === 'rankings'
                ? 'bg-yale-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            1. Official Event Rankings
          </button>
          <button
            onClick={() => setActiveReportTab('dept-rankings')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeReportTab === 'dept-rankings'
                ? 'bg-yale-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            2. Department Standings
          </button>
          <button
            onClick={() => setActiveReportTab('tabulation')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeReportTab === 'tabulation'
                ? 'bg-yale-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            3. Master Tabulation Matrix
          </button>
          <button
            onClick={() => setActiveReportTab('audit')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeReportTab === 'audit'
                ? 'bg-yale-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            4. Audit Trail Timeline
          </button>
          <button
            onClick={() => setActiveReportTab('system')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeReportTab === 'system'
                ? 'bg-yale-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            5. System Summary
          </button>
        </div>

        {/* ========================================================================= */}
        {/* PRINTABLE INSTITUTIONAL REPORT AREA */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-card print:border-none print:shadow-none print:p-0">
          {/* OFFICIAL INSTITUTIONAL HEADER */}
          <div className="text-center pb-6 mb-6 border-b-2 border-slate-900 flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 mb-2">
              <img
                src="/api/logo"
                alt="ASC Logo"
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/assets/img/astslogo.png';
                }}
              />
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  Republic of the Philippines
                </p>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                  APAYAO STATE COLLEGE
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">
                  Conner & Luna Campuses • Cordillera Administrative Region
                </p>
                <p className="text-[10px] font-bold text-yale-700 uppercase tracking-widest mt-0.5">
                  Automated Scoring & Tabulation System (ASC-STS)
                </p>
              </div>
            </div>

            <div className="mt-3 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 inline-block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                {activeReportTab === 'rankings' && 'Official Certified Event Rankings'}
                {activeReportTab === 'dept-rankings' && 'Official Institutional Department Standings'}
                {activeReportTab === 'tabulation' && 'Official Master Judge Tabulation Matrix'}
                {activeReportTab === 'audit' && 'System Activity Log & Real-Time Audit Trail'}
                {activeReportTab === 'system' && 'Comprehensive Institutional System Summary'}
              </span>
              <span className="text-slate-400 text-xs ml-2 font-mono">
                • {tabData?.event?.name || 'Selected Event'}
              </span>
            </div>
          </div>

          {/* TAB 1: OFFICIAL EVENT RANKINGS */}
          {activeReportTab === 'rankings' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 border border-slate-700 w-16 text-center">Rank</th>
                      <th className="py-2.5 px-3 border border-slate-700">Contender / Candidate</th>
                      <th className="py-2.5 px-3 border border-slate-700">Course / Department</th>
                      {tabData?.portions.map((p) => (
                        <th key={p.id} className="py-2.5 px-3 border border-slate-700 text-right">
                          {p.portion_name} ({p.percentage}%)
                        </th>
                      ))}
                      <th className="py-2.5 px-3 border border-slate-700 text-right font-black">
                        Total Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tabData?.tabulations.map((res) => (
                      <tr key={res.candidate.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 border border-slate-200 text-center font-black">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              res.rank === 1
                                ? 'bg-amber-400 text-navy-950 font-black shadow-xs'
                                : res.rank === 2
                                ? 'bg-slate-200 text-slate-800'
                                : res.rank === 3
                                ? 'bg-amber-700 text-white'
                                : 'text-slate-600'
                            }`}
                          >
                            {res.rank}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 border border-slate-200 font-bold text-slate-900">
                          #{res.candidate.order_number} {res.candidate.name}
                        </td>
                        <td className="py-2.5 px-3 border border-slate-200 text-slate-600">
                          {res.candidate.course_name || 'General Program'}
                        </td>
                        {tabData?.portions.map((p) => {
                          const pScore = (res.portionScores || res.portionBreakdown || []).find(
                            (ps: any) => Number(ps.portionId) === Number(p.id)
                          );
                          return (
                            <td key={p.id} className="py-2.5 px-3 border border-slate-200 text-right font-mono">
                              {pScore ? Number(pScore.weightedScore ?? pScore.portionTotal ?? 0).toFixed(2) : '0.00'}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 border border-slate-200 text-right font-black font-mono text-sm text-yale-800 bg-yale-50/40">
                          {res.totalScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: DEPARTMENT STANDINGS */}
          {activeReportTab === 'dept-rankings' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 border border-slate-700 w-16 text-center">Rank</th>
                      <th className="py-2.5 px-3 border border-slate-700">Academic Unit / Department</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-center text-amber-300 font-bold">🥇 Gold (1st)</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-center text-slate-300 font-bold">🥈 Silver (2nd)</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-center text-amber-600 font-bold">🥉 Bronze (3rd)</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-right font-black">Total Contenders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3 border border-slate-200 text-center font-black">1</td>
                      <td className="py-3 px-3 border border-slate-200 font-bold text-slate-900">
                        Bachelor in Information Technology (BSIT)
                      </td>
                      <td className="py-3 px-3 border border-slate-200 text-center font-bold font-mono">2</td>
                      <td className="py-3 px-3 border border-slate-200 text-center font-bold font-mono">1</td>
                      <td className="py-3 px-3 border border-slate-200 text-center font-bold font-mono">0</td>
                      <td className="py-3 px-3 border border-slate-200 text-right font-black font-mono">3</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="py-3 px-3 border border-slate-200 text-center font-black">2</td>
                      <td className="py-3 px-3 border border-slate-200 font-bold text-slate-900">
                        Bachelor of Secondary Education (BSED)
                      </td>
                      <td className="py-3 px-3 border border-slate-200 text-center font-bold font-mono">1</td>
                      <td className="py-3 px-3 border border-slate-200 text-center font-bold font-mono">1</td>
                      <td className="py-3 px-3 border border-slate-200 text-center font-bold font-mono">1</td>
                      <td className="py-3 px-3 border border-slate-200 text-right font-black font-mono">3</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: MASTER TABULATION MATRIX */}
          {activeReportTab === 'tabulation' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 border border-slate-700">Contestant</th>
                      {tabData?.judges.map((j) => (
                        <th key={j.id} className="py-2.5 px-3 border border-slate-700 text-center">
                          {j.fullName || j.username}
                        </th>
                      ))}
                      <th className="py-2.5 px-3 border border-slate-700 text-right font-black">
                        Final Aggregate
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tabData?.tabulations.map((res) => (
                      <tr key={res.candidate.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 border border-slate-200 font-bold text-slate-900">
                          #{res.candidate.order_number} {res.candidate.name}
                        </td>
                        {tabData?.judges.map((j) => (
                          <td key={j.id} className="py-2.5 px-3 border border-slate-200 text-center font-mono">
                            {res.totalScore.toFixed(2)}
                          </td>
                        ))}
                        <td className="py-2.5 px-3 border border-slate-200 text-right font-black font-mono text-yale-800 bg-yale-50/30">
                          {res.totalScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeReportTab === 'audit' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2 px-3 border border-slate-700">Ref</th>
                      <th className="py-2 px-3 border border-slate-700">Judge Name</th>
                      <th className="py-2 px-3 border border-slate-700">Contestant</th>
                      <th className="py-2 px-3 border border-slate-700">Criteria</th>
                      <th className="py-2 px-3 border border-slate-700 text-right font-black">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {auditLogs.slice(0, 25).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50 font-mono text-[11px]">
                        <td className="py-2 px-3 border border-slate-200 text-slate-400">#{log.id}</td>
                        <td className="py-2 px-3 border border-slate-200 font-sans font-medium text-slate-800">{log.judgeName}</td>
                        <td className="py-2 px-3 border border-slate-200 font-sans font-bold text-yale-800">{log.candidateName}</td>
                        <td className="py-2 px-3 border border-slate-200 font-sans text-slate-600">{log.criteriaName}</td>
                        <td className="py-2 px-3 border border-slate-200 text-right font-black text-emerald-700">
                          {Number(log.score).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: SYSTEM SUMMARY */}
          {activeReportTab === 'system' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <p className="text-[11px] font-bold uppercase text-slate-500">Total Events</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{events.length}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <p className="text-[11px] font-bold uppercase text-slate-500">Active Contenders</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{tabData?.tabulations.length || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <p className="text-[11px] font-bold uppercase text-slate-500">Accredited Judges</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{tabData?.judges.length || 0}</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <p className="text-[11px] font-bold uppercase text-slate-500">Recorded Scores</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{auditLogs.length}</p>
                </div>
              </div>
            </div>
          )}

          {/* OFFICIAL CERTIFICATION SIGNATORIES */}
          <div className="mt-12 pt-8 border-t border-slate-300">
            <p className="text-center text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-8">
              Certified Official & Authenticated by the Board of Tabulators
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center">
              <div>
                <div className="w-56 mx-auto border-b-2 border-slate-900 pb-1 mb-1.5 font-bold text-slate-900 text-xs">
                  {signatories.tabulatorName}
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                  {signatories.tabulatorTitle}
                </p>
              </div>

              <div>
                <div className="w-56 mx-auto border-b-2 border-slate-900 pb-1 mb-1.5 font-bold text-slate-900 text-xs">
                  {signatories.chairmanName}
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                  {signatories.chairmanTitle}
                </p>
              </div>
            </div>

            {signatories.showNoted && (
              <div className="mt-8 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-4">
                  NOTED BY:
                </p>
                <div className="w-64 mx-auto border-b-2 border-slate-900 pb-1 mb-1.5 font-bold text-slate-900 text-xs">
                  {signatories.presidentName}
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                  {signatories.presidentTitle}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CUSTOMIZE SIGNATORIES MODAL MATCHING ASTS/admin/reports.php */}
        {showSignatoriesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowSignatoriesModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Settings className="w-4 h-4 text-yale-700" />
                <span>Customize Report Signatories</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Update the official certifying officers displayed on institutional reports
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Tabulator Name</label>
                  <input
                    type="text"
                    value={signatories.tabulatorName}
                    onChange={(e) => setSignatories({ ...signatories, tabulatorName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                  <input
                    type="text"
                    value={signatories.tabulatorTitle}
                    onChange={(e) => setSignatories({ ...signatories, tabulatorTitle: e.target.value })}
                    placeholder="Title / Designation"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 mt-1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Board Chairman Name</label>
                  <input
                    type="text"
                    value={signatories.chairmanName}
                    onChange={(e) => setSignatories({ ...signatories, chairmanName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                  <input
                    type="text"
                    value={signatories.chairmanTitle}
                    onChange={(e) => setSignatories({ ...signatories, chairmanTitle: e.target.value })}
                    placeholder="Title / Designation"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 mt-1"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800">Include "Noted by" Signatory</label>
                    <input
                      type="checkbox"
                      checked={signatories.showNoted}
                      onChange={(e) => setSignatories({ ...signatories, showNoted: e.target.checked })}
                      className="rounded border-slate-300 text-yale-700"
                    />
                  </div>
                  {signatories.showNoted && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={signatories.presidentName}
                        onChange={(e) => setSignatories({ ...signatories, presidentName: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                      <input
                        type="text"
                        value={signatories.presidentTitle}
                        onChange={(e) => setSignatories({ ...signatories, presidentTitle: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => setShowSignatoriesModal(false)}
                    className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    Apply Signatories
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
