'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Users, Plus, Trash2, Edit2, RefreshCw, Image as ImageIcon } from 'lucide-react';
import { Candidate, Event } from '@/lib/types';

function EnlistmentContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get('eventId');

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || '');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCand, setEditingCand] = useState<Candidate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    order_number: 1,
    year_level: '',
    image_path: '',
  });

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

  const loadCandidates = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates?eventId=${selectedEventId}`);
      const data = await res.json();
      if (Array.isArray(data)) setCandidates(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [selectedEventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCand) {
        await fetch(`/api/candidates/${editingCand.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
      } else {
        await fetch('/api/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_id: Number(selectedEventId),
            ...formData,
          }),
        });
      }
      setShowModal(false);
      setEditingCand(null);
      loadCandidates();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this contestant from event?')) return;
    try {
      await fetch(`/api/candidates/${id}`, { method: 'DELETE' });
      loadCandidates();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppLayout
      pageTitle="Contestant Enlistment Roster"
      pageSubtitle="Register participants, assign candidate order numbers, and manage portraits"
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Active Event:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-yale-600 focus:bg-white"
            >
              {events.map((evt) => (
                <option key={evt.id} value={evt.id}>
                  {evt.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setEditingCand(null);
              setFormData({
                name: '',
                order_number: candidates.length + 1,
                year_level: '',
                image_path: '',
              });
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Contestant</span>
          </button>
        </div>

        {/* Contestants Grid */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-yale-700 mb-2" />
              Loading contestants...
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800">No Contestants Enlisted</p>
              <p className="text-xs text-slate-400 mt-1">
                Click &quot;Add Contestant&quot; to enlist participants for this competition.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-yale-400 transition-all shadow-subtle"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="w-7 h-7 rounded-lg bg-yale-50 text-yale-700 border border-yale-200 font-black text-xs flex items-center justify-center">
                      #{cand.order_number}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingCand(cand);
                          setFormData({
                            name: cand.name,
                            order_number: cand.order_number,
                            year_level: cand.year_level || '',
                            image_path: cand.image_path || '',
                          });
                          setShowModal(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-yale-700 hover:bg-white"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(cand.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-white"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <h3 className="font-bold text-sm text-slate-900">{cand.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{cand.year_level || 'General Contestant'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h2 className="text-base font-bold text-slate-900 mb-4">
                {editingCand ? 'Edit Contestant' : 'Enlist New Contestant'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contestant Name</label>
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
                    <label className="block text-slate-700 font-semibold mb-1">Order #</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.order_number}
                      onChange={(e) => setFormData({ ...formData, order_number: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Year Level</label>
                    <input
                      type="text"
                      placeholder="e.g. 3rd Year"
                      value={formData.year_level}
                      onChange={(e) => setFormData({ ...formData, year_level: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Photo URL (Google Drive / Web)</label>
                  <input
                    type="text"
                    placeholder="https://drive.google.com/..."
                    value={formData.image_path}
                    onChange={(e) => setFormData({ ...formData, image_path: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                  />
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
                    Save Contestant
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

export default function AdminEnlistmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-yale-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading Contestant Enlistment...</p>
          </div>
        </div>
      }
    >
      <EnlistmentContent />
    </Suspense>
  );
}
