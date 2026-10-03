'use client';

import { useEffect, useState, type FormEvent } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  X,
  Key,
  Calendar,
  Edit2,
  Trash2,
  Plus,
  ShieldCheck,
  Check,
} from 'lucide-react';
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

  // Edit judge modal state
  const [editModalJudge, setEditModalJudge] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', username: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Assign events modal state
  const [assignModalJudge, setAssignModalJudge] = useState<any | null>(null);
  const [assigningLoading, setAssigningLoading] = useState(false);

  // Delete judge state
  const [deleteConfirmJudge, setDeleteConfirmJudge] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editModalJudge) return;
    setSavingEdit(true);
    try {
      await fetch('/api/judges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit_judge',
          judgeId: editModalJudge.id,
          full_name: editForm.full_name,
          username: editForm.username,
        }),
      });
      setEditModalJudge(null);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSavingEdit(false);
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
      // Update local state for assign modal judge and list
      setJudges((prev) =>
        prev.map((j) => {
          if (j.id === judgeId) {
            const currentIds: number[] = j.assignedEventIds || [];
            const nextIds = isCurrentlyAssigned
              ? currentIds.filter((id) => id !== eventId)
              : [...currentIds, eventId];
            return { ...j, assignedEventIds: nextIds };
          }
          return j;
        })
      );
      if (assignModalJudge && assignModalJudge.id === judgeId) {
        const currentIds: number[] = assignModalJudge.assignedEventIds || [];
        const nextIds = isCurrentlyAssigned
          ? currentIds.filter((id) => id !== eventId)
          : [...currentIds, eventId];
        setAssignModalJudge({ ...assignModalJudge, assignedEventIds: nextIds });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteJudge = async () => {
    if (!deleteConfirmJudge) return;
    setDeleting(true);
    try {
      await fetch('/api/judges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_judge', judgeId: deleteConfirmJudge.id }),
      });
      setDeleteConfirmJudge(null);
      loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  };

  const filteredJudges = judges.filter(
    (j) =>
      j.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout
      pageTitle="Judges Roster & Assignment"
      pageSubtitle="Review credentials, manage account approval statuses, and assign official scoring duties"
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
                  <th className="py-3 px-4 w-64">Judge Name</th>
                  <th className="py-3 px-4 w-36">Username</th>
                  <th className="py-3 px-4 w-40">Account Status</th>
                  <th className="py-3 px-4">Assigned Events</th>
                  <th className="py-3 px-4 text-right w-64">Actions</th>
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
                  filteredJudges.map((j) => {
                    const assignedList = events.filter((e) =>
                      (j.assignedEventIds || []).includes(Number(e.id))
                    );

                    return (
                      <tr key={j.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* 1. Judge Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-yale-50 text-yale-700 flex items-center justify-center font-bold text-xs shrink-0 border border-yale-200">
                              {(j.full_name || 'J').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{j.full_name}</p>
                              <span className="text-[10px] text-slate-400">ID #{j.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Username */}
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          @{j.username}
                        </td>

                        {/* 3. Account Status */}
                        <td className="py-3.5 px-4">
                          <select
                            value={j.approval_status || 'pending'}
                            onChange={(e) => handleUpdateStatus(j.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer transition-colors ${
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

                        {/* 4. Assigned Events (Clean preview with click to view/assign) */}
                        <td className="py-3.5 px-4">
                          {assignedList.length === 0 ? (
                            <span className="text-slate-400 text-xs italic">
                              No events assigned
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {assignedList.slice(0, 2).map((evt) => (
                                <span
                                  key={evt.id}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-yale-50 text-yale-700 border border-yale-200"
                                >
                                  {evt.name}
                                </span>
                              ))}
                              {assignedList.length > 2 && (
                                <button
                                  onClick={() => setAssignModalJudge(j)}
                                  className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full border border-slate-200 transition-colors"
                                >
                                  +{assignedList.length - 2} more
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 5. Actions: Assign Event, Edit, Reset Password, Delete */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Assign Event Button */}
                            <button
                              onClick={() => setAssignModalJudge(j)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-yale-800 bg-yale-50 hover:bg-yale-100 border border-yale-200 rounded-lg transition-colors cursor-pointer"
                              title="Assign Competitions"
                            >
                              <Calendar className="w-3.5 h-3.5 text-yale-700" />
                              <span>Assign</span>
                            </button>

                            {/* Edit Judge Information Button */}
                            <button
                              onClick={() => {
                                setEditModalJudge(j);
                                setEditForm({ full_name: j.full_name || '', username: j.username || '' });
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Edit Judge Information"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password Button */}
                            <button
                              onClick={() => {
                                setResetModalJudge(j);
                                setNewPassword('12345678');
                              }}
                              className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Judge Button */}
                            <button
                              onClick={() => setDeleteConfirmJudge(j)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                              title="Delete Judge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 1. ASSIGN EVENT MODAL (Floating modal displaying events list from admin/enlistment) */}
        {assignModalJudge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
              <button
                onClick={() => setAssignModalJudge(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-yale-700" />
                  <span>Assign Events to Judge</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select competitions for <strong className="text-slate-800">{assignModalJudge.full_name}</strong> (@{assignModalJudge.username})
                </p>
              </div>

              {/* Event items list */}
              <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-1 divide-y divide-slate-100">
                {events.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No competitions created in Enlistment.</p>
                ) : (
                  events.map((evt) => {
                    const isAssigned = (assignModalJudge.assignedEventIds || []).includes(Number(evt.id));
                    return (
                      <div
                        key={evt.id}
                        onClick={() => handleToggleAssignment(assignModalJudge.id, Number(evt.id), isAssigned)}
                        className={`pt-2 pb-1.5 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isAssigned ? 'bg-yale-50/70 border border-yale-200' : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{evt.name}</p>
                          <p className="text-[10px] text-slate-500">
                            Category: {evt.type} • Status: {evt.status}
                          </p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold border transition-colors shrink-0 ${
                            isAssigned
                              ? 'bg-yale-700 text-white border-yale-800'
                              : 'bg-white text-slate-300 border-slate-300'
                          }`}
                        >
                          {isAssigned && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-end pt-4 mt-2 border-t border-slate-100">
                <button
                  onClick={() => setAssignModalJudge(null)}
                  className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. EDIT JUDGE INFORMATION MODAL */}
        {editModalJudge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
              <button
                onClick={() => setEditModalJudge(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-yale-700" />
                <span>Edit Judge Information</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Update accredited legal name or login identifier
              </p>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditModalJudge(null)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. RESET PASSWORD MODAL */}
        {resetModalJudge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
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
                Set a replacement password for <strong className="text-slate-800">{resetModalJudge.full_name}</strong> (@{resetModalJudge.username}).
              </p>

              {resetSuccess && (
                <div className="mb-4 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Default temporary password is 12345678</p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalJudge(null)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    {resetting ? 'Resetting...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. DELETE CONFIRMATION MODAL */}
        {deleteConfirmJudge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative">
              <button
                onClick={() => setDeleteConfirmJudge(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-rose-600 mb-1 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                <span>Confirm Judge Deletion</span>
              </h2>
              <p className="text-xs text-slate-600 mb-4">
                Are you sure you want to remove <strong className="text-slate-900">{deleteConfirmJudge.full_name}</strong> (@{deleteConfirmJudge.username}) from the institutional roster? This will also unassign all their assigned events.
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmJudge(null)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteJudge}
                  disabled={deleting}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm"
                >
                  {deleting ? 'Deleting...' : 'Delete Judge'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
