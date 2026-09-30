'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { Calendar, Plus, Trash2, Edit2, RefreshCw, Play, CheckCircle2, Clock } from 'lucide-react';
import { Event } from '@/lib/types';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Pageant',
    participation_mode: 'Individual',
    department: '',
    academic_year: '2025-2026',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    status: 'Upcoming',
  });

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      if (Array.isArray(data)) setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await fetch(`/api/events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      }
      setShowModal(false);
      setEditingEvent(null);
      loadEvents();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' });
      loadEvents();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppLayout
      pageTitle="Events Studio"
      pageSubtitle="Configure and monitor collegiate tournaments, pageant portions, and sports meets"
    >
      <div className="space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Total Registered Events:</span>
            <span className="font-mono text-xs font-extrabold text-yale-700 bg-yale-50 px-2 py-0.5 rounded border border-yale-200">
              {events.length}
            </span>
          </div>

          <button
            onClick={() => {
              setEditingEvent(null);
              setFormData({
                name: '',
                description: '',
                type: 'Pageant',
                participation_mode: 'Individual',
                department: '',
                academic_year: '2025-2026',
                start_date: new Date().toISOString().split('T')[0],
                end_date: new Date().toISOString().split('T')[0],
                status: 'Upcoming',
              });
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>

        {/* Events Table Card */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Event Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto text-yale-700 mb-2" />
                      Loading events...
                    </td>
                  </tr>
                ) : events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No events registered yet. Click &quot;Create New Event&quot; to begin.
                    </td>
                  </tr>
                ) : (
                  events.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{evt.name}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-yale-700 bg-yale-50 px-2 py-0.5 rounded border border-yale-200 text-[11px]">
                          {evt.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{evt.participation_mode}</td>
                      <td className="py-3 px-4 text-slate-400">{evt.start_date} to {evt.end_date}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            evt.status === 'Ongoing'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : evt.status === 'Completed'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : 'bg-gold-50 text-gold-700 border border-gold-200'
                          }`}
                        >
                          {evt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setEditingEvent(evt);
                            setFormData({
                              name: evt.name,
                              description: evt.description || '',
                              type: evt.type,
                              participation_mode: evt.participation_mode || 'Individual',
                              department: evt.department || '',
                              academic_year: evt.academic_year || '2025-2026',
                              start_date: evt.start_date,
                              end_date: evt.end_date,
                              status: evt.status,
                            });
                            setShowModal(true);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-yale-700 hover:bg-slate-100 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(evt.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Event Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Category</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                    >
                      <option value="Pageant">Pageant</option>
                      <option value="Cultural">Cultural</option>
                      <option value="Academic">Academic</option>
                      <option value="Sports">Sports</option>
                      <option value="Literary">Literary</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Participation Mode</label>
                    <select
                      value={formData.participation_mode}
                      onChange={(e) => setFormData({ ...formData, participation_mode: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Team">Team</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Tabulating">Tabulating</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-yale-700 hover:bg-yale-800 text-white font-bold"
                  >
                    Save Event
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
