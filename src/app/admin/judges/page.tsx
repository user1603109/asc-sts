'use client';

import { useEffect, useState, type FormEvent } from 'react';
import AppLayout from '@/components/AppLayout';
import { UserCheck, CheckCircle2, XCircle, RefreshCw, Search, X, Key } from 'lucide-react';
import { Event } from '@/lib/types';

export default function AdminJudgesPage() {
  const [judges, setJudges] = useState<any[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Password reset modal state
  const [resetModalJudge, setResetModalJudge] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('12345678');
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');

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

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetModalJudge) return;
    setResetting(true);
    try {
      const res = await fetch('/api/judges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset_password',
          judgeId: resetModalJudge.id,
          newPassword,
        }),
      });
      const data = await res.json();
      setResetSuccess(data.message || 'Password reset successfully!');
      setTimeout(() => {
        setResetSuccess('');
        setResetModalJudge(null);
      }, 1500);
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
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

  const filteredJudges = judges.filter(
    (j) =>
      j.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout
      pageTitle="Judges Accreditation & Roster"
      pageSubtitle="Review credentials, manage approval statuses (Approved, Pending, Suspended, Rejected), and assign event duties"
    >
      <div className="space-y-6">
        {/* Controls Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search judges by legal name or username..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Roster</span>
            </button>
          </div>
        </div>

        {/* Judges Table Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="py-3 px-4">Judge Information</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Accreditation Status</th>
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
                ) : filteredJudges.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      No accredited judges found.
                    </td>
                  </tr>
                ) : (
                  filteredJudges.map((j) => (
                    <tr key={j.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{j.full_name}</td>
                      <td className="py-3 px-4 text-slate-500 font-mono">@{j.username}</td>
                      <td className="py-3 px-4">
                        <select
                          value={j.approval_status || 'pending'}
                          onChange={(e) => handleUpdateStatus(j.id, e.target.value)}
                          className={`px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none ${
                            j.approval_status === 'approved'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : j.approval_status === 'pending'
                              ? 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                              : j.approval_status === 'suspended'
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <option value="approved">Approved</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspended</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {events.map((evt) => {
                            const isAssigned = (j.assignedEventIds || []).includes(Number(evt.id));
                            return (
                              <button
                                key={evt.id}
                                onClick={() => handleToggleAssignment(j.id, evt.id, isAssigned)}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
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
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setResetModalJudge(j);
                            setNewPassword('12345678');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="Reset Password"
                        >
                          <Key className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reset Password</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RESET PASSWORD MODAL MATCHING ASTS/admin/judges.php */}
        {resetModalJudge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl relative">
              <button
                onClick={() => setResetModalJudge(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Key className="w-4 h-4 text-yale-700" />
                <span>Reset Judge Password</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Set a temporary or replacement password for <strong className="text-slate-800">{resetModalJudge.full_name}</strong> (@{resetModalJudge.username}).
              </p>

              {resetSuccess && (
                <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalJudge(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    {resetting ? 'Resetting...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
