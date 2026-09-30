'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { UserCheck, CheckCircle2, XCircle, RefreshCw, ShieldAlert, Calendar } from 'lucide-react';
import { Event } from '@/lib/types';

export default function AdminJudgesPage() {
  const [judges, setJudges] = useState<any[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [judgesRes, eventsRes] = await Promise.all([
        fetch('/api/judges'),
        fetch('/api/events'),
      ]);
      const jData = await judgesRes.json();
      const eData = await eventsRes.json();
      if (Array.isArray(jData)) setJudges(jData);
      if (Array.isArray(eData)) setEvents(eData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateStatus = async (judgeId: number, status: string) => {
    try {
      await fetch('/api/judges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_status', judgeId, status }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleAssignment = async (judgeId: number, eventId: number, isCurrentlyAssigned: boolean) => {
    try {
      await fetch('/api/judges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isCurrentlyAssigned ? 'unassign_event' : 'assign_event',
          judgeId,
          eventId,
        }),
      });
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppLayout
      pageTitle="Judges Accreditation & Roster"
      pageSubtitle="Review judge credentials, approve accreditation requests, and assign judges to events"
    >
      <div className="space-y-6">
        {/* Judges Table Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Judge Name</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Accreditation</th>
                  <th className="py-3 px-4">Assigned Events</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-yale-700 mb-2" />
                      Loading judges...
                    </td>
                  </tr>
                ) : judges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No judges registered yet.
                    </td>
                  </tr>
                ) : (
                  judges.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{j.full_name}</td>
                      <td className="py-3 px-4 text-slate-500">@{j.username}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            j.approval_status === 'approved'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : j.approval_status === 'pending'
                              ? 'bg-gold-50 text-gold-700 border border-gold-200 animate-pulse'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {j.approval_status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {events.map((evt) => {
                            const isAssigned = (j.assignedEventIds || []).includes(Number(evt.id));
                            return (
                              <button
                                key={evt.id}
                                onClick={() => handleToggleAssignment(j.id, evt.id, isAssigned)}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                                  isAssigned
                                    ? 'bg-yale-50 text-yale-700 border-yale-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'
                                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                                }`}
                                title={isAssigned ? 'Click to unassign' : 'Click to assign'}
                              >
                                {isAssigned ? '✓ ' : '+ '}
                                {evt.name}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        {j.approval_status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(j.id, 'approved')}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {j.approval_status !== 'rejected' && (
                          <button
                            onClick={() => handleUpdateStatus(j.id, 'rejected')}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-semibold text-[11px] transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
