'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Sliders, Plus, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';
import { Criteria, Event, EventPortion } from '@/lib/types';

function CriteriaContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get('eventId');

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || '');
  const [portions, setPortions] = useState<EventPortion[]>([]);
  const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);
  const [loading, setLoading] = useState(false);

  const [showPortionModal, setShowPortionModal] = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);

  const [portionForm, setPortionForm] = useState({
    portion_name: '',
    percentage: 25,
    order_number: 1,
  });

  const [criteriaForm, setCriteriaForm] = useState({
    portion_id: '',
    name: '',
    max_score: 100,
    percentage: 25,
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

  const loadCriteria = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/criteria?eventId=${selectedEventId}`);
      const data = await res.json();
      setPortions(data.portions || []);
      setCriteriaList(data.criteria || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCriteria();
  }, [selectedEventId]);

  const handleAddPortion = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'portion',
          event_id: Number(selectedEventId),
          ...portionForm,
        }),
      });
      setShowPortionModal(false);
      loadCriteria();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCriteria = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'criteria',
          event_id: Number(selectedEventId),
          portion_id: criteriaForm.portion_id ? Number(criteriaForm.portion_id) : null,
          name: criteriaForm.name,
          max_score: Number(criteriaForm.max_score),
          percentage: Number(criteriaForm.percentage),
        }),
      });
      setShowCriteriaModal(false);
      loadCriteria();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePortion = async (portionId: number) => {
    if (!confirm('Are you sure you want to delete this portion segment?')) return;
    try {
      await fetch(`/api/criteria?id=${portionId}&itemType=portion`, { method: 'DELETE' });
      loadCriteria();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCriteria = async (criteriaId: number) => {
    if (!confirm('Are you sure you want to delete this criteria item?')) return;
    try {
      await fetch(`/api/criteria?id=${criteriaId}&itemType=criteria`, { method: 'DELETE' });
      loadCriteria();
    } catch (e) {
      console.error(e);
    }
  };

  const totalPortionWeight = portions.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);

  return (
    <AppLayout
      pageTitle="Criteria & Portions Weighting Studio"
      pageSubtitle="Structure competition segments, individual criteria limits, and percentage weightings"
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-600">Select Event:</span>
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
              onClick={() => setShowPortionModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-yale-700" />
              <span>Add Segment</span>
            </button>
            <button
              onClick={() => setShowCriteriaModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Criteria Item</span>
            </button>
          </div>
        </div>

        {/* Total Weight Status Pill */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            {totalPortionWeight === 100 || portions.length === 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-gold-600" />
            )}
            <div>
              <p className="text-xs font-bold text-slate-900">Total Weight: {totalPortionWeight}%</p>
              <p className="text-[11px] text-slate-500">
                {portions.length > 0 && totalPortionWeight !== 100
                  ? 'Criteria weighting segments should ideally sum to 100% for balanced tabulation.'
                  : 'Weighting distribution verified and balanced.'}
              </p>
            </div>
          </div>
        </div>

        {/* Portions & Criteria Cards */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-card">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-yale-700 mb-2" />
            Loading criteria...
          </div>
        ) : (
          <div className="space-y-5">
            {(portions.length > 0 ? portions : [{ id: 0, portion_name: 'General Criteria', percentage: 100 }]).map((portion) => {
              const portionCriteria = criteriaList.filter(
                (c) => portion.id === 0 || Number(c.portion_id) === Number(portion.id)
              );

              return (
                <div key={portion.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-card space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-yale-700" />
                      <h2 className="text-sm font-bold text-slate-900">{portion.portion_name}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-yale-700 bg-yale-50 px-2.5 py-0.5 rounded-full border border-yale-200">
                        Segment Weight: {portion.percentage}%
                      </span>
                      {portion.id > 0 && (
                        <button
                          onClick={() => handleDeletePortion(portion.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Delete Portion"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {portionCriteria.length === 0 ? (
                    <p className="text-xs text-slate-400 py-3 italic">No criteria assigned to this portion yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {portionCriteria.map((crit) => (
                        <div key={crit.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1.5 shadow-subtle relative group">
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-bold text-slate-900 text-xs">{crit.name}</h3>
                            <button
                              onClick={() => handleDeleteCriteria(crit.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors p-0.5"
                              title="Delete criteria"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex justify-between text-slate-500 text-[11px] pt-1 border-t border-slate-200/60">
                            <span>Max: <strong className="text-slate-800">{crit.max_score} pts</strong></span>
                            <span>Weight: <strong className="text-yale-700">{crit.percentage}%</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Portion */}
        {showPortionModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h2 className="text-base font-bold text-slate-900 mb-4">Add Segment / Portion</h2>
              <form onSubmit={handleAddPortion} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Portion Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Talent Competition"
                    value={portionForm.portion_name}
                    onChange={(e) => setPortionForm({ ...portionForm, portion_name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Weight Percentage (%)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={portionForm.percentage}
                    onChange={(e) => setPortionForm({ ...portionForm, percentage: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPortionModal(false)}
                    className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-yale-700 hover:bg-yale-800 text-white font-bold"
                  >
                    Save Portion
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Criteria */}
        {showCriteriaModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h2 className="text-base font-bold text-slate-900 mb-4">Add Criteria Item</h2>
              <form onSubmit={handleAddCriteria} className="space-y-3 text-xs">
                {portions.length > 0 && (
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Event Portion</label>
                    <select
                      value={criteriaForm.portion_id}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, portion_id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                    >
                      <option value="">Select Portion</option>
                      {portions.map((p) => (
                        <option key={p.id} value={p.id}>{p.portion_name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Criteria Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Poise & Deportment"
                    value={criteriaForm.name}
                    onChange={(e) => setCriteriaForm({ ...criteriaForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Max Score</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={criteriaForm.max_score}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, max_score: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Weight (%)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={criteriaForm.percentage}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, percentage: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-900 focus:bg-white focus:border-yale-600 focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCriteriaModal(false)}
                    className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-yale-700 hover:bg-yale-800 text-white font-bold"
                  >
                    Save Criteria
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

export default function AdminCriteriaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="text-center text-slate-400">
            <div className="w-8 h-8 border-2 border-yale-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs">Loading Criteria Studio...</p>
          </div>
        </div>
      }
    >
      <CriteriaContent />
    </Suspense>
  );
}
