'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Layers, RefreshCw, Search, Trash2, X, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Event } from '@/lib/types';

interface AuditLog {
  id: number;
  judgeName: string;
  candidateName: string;
  criteriaName: string;
  eventName: string;
  score: number;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [limit, setLimit] = useState('50');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Clear modal state
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState('');

  useEffect(() => {
    fetch('/api/events')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
      });
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/logs?limit=${limit}&page=${page}&eventId=${selectedEventId}`);
      const data = await res.json();
      if (data && Array.isArray(data.logs)) {
        setLogs(data.logs);
        setTotalCount(data.totalCount || 0);
      } else if (Array.isArray(data)) {
        setLogs(data);
        setTotalCount(data.length);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [limit, page, selectedEventId]);

  const handleClearLogs = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setClearSuccess(data.message || 'Audit trail reset successfully!');
        setTimeout(() => {
          setClearSuccess('');
          setShowClearModal(false);
          fetchLogs();
        }, 1200);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClearing(false);
    }
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.judgeName.toLowerCase().includes(search.toLowerCase()) ||
      l.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      l.eventName.toLowerCase().includes(search.toLowerCase()) ||
      l.criteriaName.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = limit === 'all' ? 1 : Math.ceil(totalCount / parseInt(limit, 10)) || 1;

  return (
    <AppLayout
      pageTitle="System Activity & Audit Logs"
      pageSubtitle="Chronological trail of real-time scores recorded by accredited judges"
    >
      <div className="space-y-6">
        {/* Controls Card */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search judge, candidate, criteria..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white"
              />
            </div>

            {/* Filter by Competition */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-semibold">Event:</span>
              <select
                value={selectedEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="all">All Events</option>
                {events.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Limit Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-semibold">Page Size:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
              >
                <option value="25">25 records</option>
                <option value="50">50 records</option>
                <option value="100">100 records</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {/* Clear & Reset Button */}
            <button
              onClick={() => setShowClearModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear &amp; Reset Scores</span>
            </button>
          </div>
        </div>

        {/* Logs Table Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-yale-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Score Transactions ({totalCount} Total Recorded)
              </h2>
            </div>
            {limit !== 'all' && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Page {page} of {totalPages}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading audit trail...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No score records found. When judges submit scores, they will appear here in real-time.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-16">Ref #</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Judge</th>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Criteria</th>
                    <th className="py-3 px-4 text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 text-slate-400">#{log.id}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-700">{log.eventName}</td>
                      <td className="py-2.5 px-4 font-sans font-medium text-slate-900">{log.judgeName}</td>
                      <td className="py-2.5 px-4 font-sans font-bold text-yale-800">{log.candidateName}</td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">{log.criteriaName}</td>
                      <td className="py-2.5 px-4 text-right font-black text-emerald-700">
                        {Number(log.score).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* CONFIRM CLEAR MODAL */}
        {showClearModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
              <button
                onClick={() => setShowClearModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-rose-600 mb-1 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Clear &amp; Reset Scores</span>
              </h2>
              <p className="text-xs text-slate-600 mb-4">
                Are you sure you want to clear and reset all judge score submissions? This will remove all score records in Google Sheets. Events, criteria, and contestants will remain untouched.
              </p>

              {clearSuccess && (
                <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                  {clearSuccess}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearModal(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearLogs}
                  disabled={clearing}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  {clearing ? 'Clearing...' : 'Confirm Clear & Reset'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
