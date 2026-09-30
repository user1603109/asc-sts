'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Layers, RefreshCw, Search, ShieldCheck, CheckCircle2 } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (Array.isArray(data)) setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.judgeName.toLowerCase().includes(search.toLowerCase()) ||
      l.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      l.eventName.toLowerCase().includes(search.toLowerCase()) ||
      l.criteriaName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout
      pageTitle="System Activity & Audit Logs"
      pageSubtitle="Chronological trail of real-time scores recorded by accredited judges"
    >
      <div className="space-y-6">
        {/* Controls Card */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by judge, candidate, criteria, or event..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Trail</span>
            </button>
          </div>
        </div>

        {/* Logs Table Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-yale-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Score Transactions ({filteredLogs.length})
              </h2>
            </div>
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
                    <th className="py-3 px-4">Ref #</th>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Judge</th>
                    <th className="py-3 px-4">Contestant</th>
                    <th className="py-3 px-4">Criteria</th>
                    <th className="py-3 px-4 text-right">Awarded Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        #{log.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {log.eventName}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {log.judgeName}
                      </td>
                      <td className="py-3 px-4 text-yale-700 font-bold">
                        {log.candidateName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {log.criteriaName}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded font-black font-mono text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {Number(log.score).toFixed(2)}
                        </span>
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
