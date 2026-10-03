'use client';

import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import {
  Sliders,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Search,
  Edit2,
  X,
  Check,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Scale,
} from 'lucide-react';
import { Criteria, Event, EventPortion } from '@/lib/types';

// Built-in Scalable Pageant Proceeding Presets
const PAGEANT_PRESETS = [
  {
    name: 'Collegiate Pageant Standard (4 Segments)',
    description: 'Production Number (15%), Swimsuit/Fitness (20%), Evening Gown (30%), Final Q&A (35%)',
    segments: [
      {
        portion_name: 'Production Number & Casual Wear',
        percentage: 15,
        order_number: 1,
        criteria: [
          { name: 'Poise, Bearing & Posture', max_score: 100, percentage: 50 },
          { name: 'Stage Presence & Grace', max_score: 100, percentage: 50 },
        ],
      },
      {
        portion_name: 'Swimwear & Fitness Competition',
        percentage: 20,
        order_number: 2,
        criteria: [
          { name: 'Physical Fitness & Tone', max_score: 100, percentage: 50 },
          { name: 'Confidence & Stage Projection', max_score: 100, percentage: 50 },
        ],
      },
      {
        portion_name: 'Evening Gown & Formal Attire',
        percentage: 30,
        order_number: 3,
        criteria: [
          { name: 'Elegance & Carriage', max_score: 100, percentage: 40 },
          { name: 'Poise & Glamour', max_score: 100, percentage: 30 },
          { name: 'Gown Fit & Overall Impact', max_score: 100, percentage: 30 },
        ],
      },
      {
        portion_name: 'Final Question & Answer (Q&A)',
        percentage: 35,
        order_number: 4,
        criteria: [
          { name: 'Wit & Content', max_score: 100, percentage: 40 },
          { name: 'Clarity, Articulation & Fluency', max_score: 100, percentage: 30 },
          { name: 'Confidence & Composure', max_score: 100, percentage: 30 },
        ],
      },
    ],
  },
  {
    name: 'Cultural Festival Pageant (4 Segments)',
    description: 'Festival Costume (25%), Talent Segment (25%), Formal Evening Attire (25%), Advocacy Interview (25%)',
    segments: [
      {
        portion_name: 'Festival & Creative Cultural Costume',
        percentage: 25,
        order_number: 1,
        criteria: [
          { name: 'Creativity & Craftsmanship', max_score: 100, percentage: 50 },
          { name: 'Cultural Relevance & Authenticity', max_score: 100, percentage: 50 },
        ],
      },
      {
        portion_name: 'Special Talent Competition',
        percentage: 25,
        order_number: 2,
        criteria: [
          { name: 'Mastery & Technical Skill', max_score: 100, percentage: 50 },
          { name: 'Stage Entertainment Value', max_score: 100, percentage: 50 },
        ],
      },
      {
        portion_name: 'Formal Evening Wear',
        percentage: 25,
        order_number: 3,
        criteria: [
          { name: 'Elegance & Bearing', max_score: 100, percentage: 50 },
          { name: 'Visual Poise & Fit', max_score: 100, percentage: 50 },
        ],
      },
      {
        portion_name: 'Advocacy & Public Speaking',
        percentage: 25,
        order_number: 4,
        criteria: [
          { name: 'Advocacy Substance & Depth', max_score: 100, percentage: 50 },
          { name: 'Delivery, Impact & Conviction', max_score: 100, percentage: 50 },
        ],
      },
    ],
  },
  {
    name: 'Mutya / Mr. & Ms. ASC Multi-Phase (5 Segments)',
    description: 'Production & Casual (15%), Swimsuit/Fitness (20%), Evening Gown (25%), Preliminary Interview (20%), Final Top 5 Q&A (20%)',
    segments: [
      {
        portion_name: 'Production Number & Casual Wear',
        percentage: 15,
        order_number: 1,
        criteria: [
          { name: 'Stage Projection & Rhythm', max_score: 100, percentage: 50 },
          { name: 'Poise & Confidence', max_score: 100, percentage: 50 },
        ],
      },
      {
        portion_name: 'Swimsuit & Athletic Fitness Wear',
        percentage: 20,
        order_number: 2,
        criteria: [
          { name: 'Body Proportion & Fitness', max_score: 100, percentage: 50 },
          { name: 'Grace, Bearing & Ramp Walk', max_score: 100, percentage: 50 },
        ],
      },
      {
        portion_name: 'Long Gown & Formal Wear',
        percentage: 25,
        order_number: 3,
        criteria: [
          { name: 'Elegance, Poise & Carriage', max_score: 100, percentage: 50 },
          { name: 'Overall Attire Appeal & Fit', max_score: 100, percentage: 50 },
        ],
      },
      {
        portion_name: 'Preliminary Closed-Door Interview',
        percentage: 20,
        order_number: 4,
        criteria: [
          { name: 'Personality & Intelligence', max_score: 100, percentage: 50 },
          { name: 'Spontaneity & Communication', max_score: 100, percentage: 50 },
        ],
      },
      {
        portion_name: 'Grand Final Top 5 Q&A Round',
        percentage: 20,
        order_number: 5,
        criteria: [
          { name: 'Substance & Relevance of Answer', max_score: 100, percentage: 60 },
          { name: 'Composure, Delivery & Wit', max_score: 100, percentage: 40 },
        ],
      },
    ],
  },
  {
    name: 'Preliminary to Top 5 Grand Finals (2 Phases)',
    description: 'Preliminary Round (60%) and Final Top 5 Deciding Round (40%)',
    segments: [
      {
        portion_name: 'Preliminary Overall Round',
        percentage: 60,
        order_number: 1,
        criteria: [
          { name: 'Preliminary Closed-Door Interview', max_score: 100, percentage: 40 },
          { name: 'Swimsuit & Casual Preliminary', max_score: 100, percentage: 30 },
          { name: 'Evening Gown Preliminary', max_score: 100, percentage: 30 },
        ],
      },
      {
        portion_name: 'Top 5 Grand Final Q&A Round',
        percentage: 40,
        order_number: 2,
        criteria: [
          { name: 'Final Question Comprehension & Response', max_score: 100, percentage: 50 },
          { name: 'Spontaneity, Eloquence & Bearing', max_score: 100, percentage: 50 },
        ],
      },
    ],
  },
  {
    name: 'Talent & Coronation Twin-Night (2 Phases)',
    description: 'Pre-Pageant Talent Night (30%) and Grand Coronation Night (70%)',
    segments: [
      {
        portion_name: 'Pre-Pageant Special Talent Night',
        percentage: 30,
        order_number: 1,
        criteria: [
          { name: 'Talent Execution & Mastery', max_score: 100, percentage: 50 },
          { name: 'Audience Engagement & Creativity', max_score: 100, percentage: 50 },
        ],
      },
      {
        portion_name: 'Grand Coronation Pageant Night',
        percentage: 70,
        order_number: 2,
        criteria: [
          { name: 'Swimwear & Casual Appearance', max_score: 100, percentage: 30 },
          { name: 'Evening Gown & Stage Carriage', max_score: 100, percentage: 35 },
          { name: 'Final Stage Q&A', max_score: 100, percentage: 35 },
        ],
      },
    ],
  },
];

function CriteriaContent() {
  const searchParams = useSearchParams();
  const initialEventId = searchParams.get('eventId');

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || '');
  const [eventSearch, setEventSearch] = useState('');
  const [portions, setPortions] = useState<EventPortion[]>([]);
  const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [editingPortion, setEditingPortion] = useState<EventPortion | null>(null);

  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [criteriaTargetPortionId, setCriteriaTargetPortionId] = useState<number | null>(null);
  const [editingCriteria, setEditingCriteria] = useState<Criteria | null>(null);

  const [showPresetModal, setShowPresetModal] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState(false);

  // Forms
  const [portionForm, setPortionForm] = useState({
    portion_name: '',
    percentage: 25,
    order_number: 1,
    status: 'Upcoming' as const,
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

  const selectedEvent = events.find((e) => String(e.id) === String(selectedEventId));
  const isPageant = (selectedEvent?.type || '').toLowerCase().includes('pageant');

  const handleSavePortion = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingPortion) {
        await fetch('/api/criteria', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: 'portion',
            id: editingPortion.id,
            ...portionForm,
          }),
        });
      } else {
        await fetch('/api/criteria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: 'portion',
            event_id: Number(selectedEventId),
            ...portionForm,
          }),
        });
      }
      setShowPortionModal(false);
      setEditingPortion(null);
      loadCriteria();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCriteria = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const portionId = criteriaTargetPortionId !== null ? criteriaTargetPortionId : (criteriaForm.portion_id ? Number(criteriaForm.portion_id) : null);
      if (editingCriteria) {
        await fetch('/api/criteria', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: 'criteria',
            id: editingCriteria.id,
            name: criteriaForm.name,
            max_score: Number(criteriaForm.max_score),
            percentage: Number(criteriaForm.percentage),
            portion_id: portionId,
          }),
        });
      } else {
        await fetch('/api/criteria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: 'criteria',
            event_id: Number(selectedEventId),
            portion_id: portionId,
            name: criteriaForm.name,
            max_score: Number(criteriaForm.max_score),
            percentage: Number(criteriaForm.percentage),
          }),
        });
      }
      setShowCriteriaModal(false);
      setEditingCriteria(null);
      loadCriteria();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePortion = async (portionId: number) => {
    if (!confirm('Are you sure you want to delete this pageant segment? Associated criteria will be unlinked.')) return;
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

  // Apply Pageant Preset Template
  const handleApplyPreset = async (preset: typeof PAGEANT_PRESETS[0]) => {
    if (!confirm(`Apply "${preset.name}" to this pageant? This will append the defined segments and standard criteria.`)) return;
    setApplyingPreset(true);
    try {
      for (const seg of preset.segments) {
        const segRes = await fetch('/api/criteria', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: 'portion',
            event_id: Number(selectedEventId),
            portion_name: seg.portion_name,
            percentage: seg.percentage,
            order_number: seg.order_number,
            status: 'Upcoming',
          }),
        });
        const segData = await segRes.json();
        const portionId = segData.item?.id;

        if (portionId && seg.criteria) {
          for (const crit of seg.criteria) {
            await fetch('/api/criteria', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemType: 'criteria',
                event_id: Number(selectedEventId),
                portion_id: portionId,
                name: crit.name,
                max_score: crit.max_score,
                percentage: crit.percentage,
              }),
            });
          }
        }
      }
      setShowPresetModal(false);
      loadCriteria();
    } catch (e) {
      console.error('Error applying preset:', e);
    } finally {
      setApplyingPreset(false);
    }
  };

  // Move Segment Up or Down in Pageant Proceedings Order
  const handleMoveSegment = async (portion: EventPortion, direction: 'up' | 'down') => {
    const currentIndex = portions.findIndex((p) => p.id === portion.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= portions.length) return;

    const targetPortion = portions[targetIndex];

    try {
      await Promise.all([
        fetch('/api/criteria', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: 'portion',
            id: portion.id,
            order_number: targetPortion.order_number,
          }),
        }),
        fetch('/api/criteria', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: 'portion',
            id: targetPortion.id,
            order_number: portion.order_number,
          }),
        }),
      ]);
      loadCriteria();
    } catch (e) {
      console.error('Failed to reorder segments:', e);
    }
  };

  // Evenly Distribute Pageant Segment Weights to Total 100%
  const handleDistributeEvenly = async () => {
    if (portions.length === 0) return;
    if (!confirm(`Distribute weights evenly across all ${portions.length} pageant segments? Total will sum to 100%.`)) return;

    try {
      const count = portions.length;
      const baseWeight = Math.floor(100 / count);
      const remainder = 100 - (baseWeight * count);

      for (let i = 0; i < count; i++) {
        const p = portions[i];
        const newWeight = i === 0 ? baseWeight + remainder : baseWeight;
        await fetch('/api/criteria', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemType: 'portion',
            id: p.id,
            percentage: newWeight,
          }),
        });
      }
      loadCriteria();
    } catch (e) {
      console.error('Failed to distribute weights:', e);
    }
  };

  const totalPortionWeight = portions.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
  const totalFlatCriteriaWeight = criteriaList.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);

  const filteredEvents = events.filter((evt) =>
    evt.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
    (evt.type && evt.type.toLowerCase().includes(eventSearch.toLowerCase()))
  );

  return (
    <AppLayout
      pageTitle="Criteria & Weighting Studio"
      pageSubtitle={
        isPageant
          ? 'Pageant multi-segment proceedings, phase percentages, and criteria breakdowns'
          : 'Standard competition criteria, point limits, and percentage weightings'
      }
    >
      <div className="space-y-6">
        {/* Top Controls Toolbar */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-card flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
            {/* Search Input Filter */}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Search event..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white"
              />
            </div>

            {/* Event Dropdown */}
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs font-semibold text-slate-600 shrink-0">Event:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-yale-600 focus:bg-white truncate"
              >
                {filteredEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} [{evt.type || 'Competition'}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* ONLY PAGEANT EVENTS GET THE DEDICATED ADD SEGMENT AND PRESET MANAGEMENT */}
            {isPageant && (
              <>
                <button
                  onClick={() => setShowPresetModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pageant Presets</span>
                </button>
                {portions.length > 0 && (
                  <button
                    onClick={handleDistributeEvenly}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                    title="Automatically balance segment percentages evenly to sum 100%"
                  >
                    <Scale className="w-3.5 h-3.5 text-yale-700" />
                    <span>Distribute Evenly</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditingPortion(null);
                    setPortionForm({
                      portion_name: '',
                      percentage: 25,
                      order_number: portions.length + 1,
                      status: 'Upcoming',
                    });
                    setShowPortionModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-yale-50 hover:bg-yale-100 text-yale-800 font-bold text-xs rounded-lg border border-yale-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-yale-700" />
                  <span>Add Pageant Segment</span>
                </button>
              </>
            )}

            {/* General Add Criteria (for non-pageants or unlinked criteria) */}
            {!isPageant && (
              <button
                onClick={() => {
                  setEditingCriteria(null);
                  setCriteriaTargetPortionId(null);
                  setCriteriaForm({ portion_id: '', name: '', max_score: 100, percentage: 25 });
                  setShowCriteriaModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Criteria Item</span>
              </button>
            )}

            <button
              onClick={loadCriteria}
              disabled={loading}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CASE A: PAGEANT EVENT VIEW - MULTI-SEGMENT PROCEEDINGS ARCHITECTURE */}
        {/* ========================================================================= */}
        {isPageant ? (
          <div className="space-y-6">
            {/* Pageant Banner with Progress Weight Balancer */}
            <div className="bg-gradient-to-r from-[#0A192F] to-[#1E3A8A] text-white rounded-2xl p-5 shadow-card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400 text-navy-950">
                    Pageant Multi-Segment Judging Architecture
                  </span>
                  <h2 className="text-base sm:text-lg font-black mt-2">
                    {selectedEvent?.name}
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Configure customizable competition segments, proceedings order, and round-by-round criteria
                  </p>
                </div>

                <div className="bg-white/10 border border-white/20 rounded-xl p-3 text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Total Segments Weight</span>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <span className="text-2xl font-black text-amber-400">{totalPortionWeight}%</span>
                    <span className="text-xs text-slate-300">/ 100%</span>
                  </div>
                  <span className={`text-[10px] font-bold ${totalPortionWeight === 100 ? 'text-emerald-400' : 'text-amber-300'}`}>
                    {totalPortionWeight === 100 ? 'Balanced at 100%' : `${100 - totalPortionWeight}% needed to balance`}
                  </span>
                </div>
              </div>

              {/* Visual Segment Progress Meter */}
              {portions.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden flex">
                    {portions.map((p, idx) => {
                      const colors = ['bg-amber-400', 'bg-blue-400', 'bg-emerald-400', 'bg-rose-400', 'bg-purple-400', 'bg-cyan-400'];
                      const color = colors[idx % colors.length];
                      return (
                        <div
                          key={p.id}
                          style={{ width: `${Math.min(100, Number(p.percentage))}%` }}
                          className={`${color} h-full transition-all`}
                          title={`${p.portion_name}: ${p.percentage}%`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] text-slate-300">
                    {portions.map((p, idx) => {
                      const dotColors = ['bg-amber-400', 'bg-blue-400', 'bg-emerald-400', 'bg-rose-400', 'bg-purple-400', 'bg-cyan-400'];
                      return (
                        <span key={p.id} className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${dotColors[idx % dotColors.length]}`} />
                          <span className="font-semibold text-white">{p.portion_name}</span> ({p.percentage}%)
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* List of Pageant Segments */}
            {loading ? (
              <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-card">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-yale-700 mb-2" />
                Loading pageant segments...
              </div>
            ) : portions.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-card space-y-3">
                <Layers className="w-10 h-10 mx-auto text-slate-300" />
                <h3 className="text-sm font-bold text-slate-800">No Pageant Segments Added Yet</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Pageants require defined proceedings (e.g. Swimwear, Evening Gown, Q&A). You can apply a pre-built collegiate preset or create custom segments.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => setShowPresetModal(true)}
                    className="px-4 py-2 text-xs font-bold text-slate-800 bg-amber-400 hover:bg-amber-500 rounded-lg shadow-sm"
                  >
                    Load Pageant Preset
                  </button>
                  <button
                    onClick={() => {
                      setEditingPortion(null);
                      setPortionForm({ portion_name: '', percentage: 25, order_number: 1, status: 'Upcoming' });
                      setShowPortionModal(true);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    Add Custom Segment
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {portions.map((portion) => {
                  const portionCriteria = criteriaList.filter(
                    (c) => Number(c.portion_id) === Number(portion.id)
                  );
                  const criteriaWeightSum = portionCriteria.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);

                  return (
                    <div
                      key={portion.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-4 transition-all"
                    >
                      {/* Segment Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-yale-50 text-yale-800 flex items-center justify-center font-bold text-xs border border-yale-200">
                            #{portion.order_number}
                          </span>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <span>{portion.portion_name}</span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {portion.status || 'Upcoming'}
                              </span>
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Segment Weight: <strong className="text-yale-700">{portion.percentage}%</strong> of Final Grand Total
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Segment Balance Tag */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              criteriaWeightSum === 100
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {criteriaWeightSum === 100 ? '100% Balanced' : `${criteriaWeightSum}%/100%`}
                          </span>

                          {/* Reordering Up/Down */}
                          <button
                            onClick={() => handleMoveSegment(portion, 'up')}
                            disabled={portions.findIndex((p) => p.id === portion.id) === 0}
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Move segment earlier in proceedings"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveSegment(portion, 'down')}
                            disabled={portions.findIndex((p) => p.id === portion.id) === portions.length - 1}
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Move segment later in proceedings"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              setEditingCriteria(null);
                              setCriteriaTargetPortionId(portion.id);
                              setCriteriaForm({ portion_id: String(portion.id), name: '', max_score: 100, percentage: 50 });
                              setShowCriteriaModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-yale-800 bg-yale-50 hover:bg-yale-100 border border-yale-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-yale-700" />
                            <span>Add Criteria</span>
                          </button>

                          <button
                            onClick={() => {
                              setEditingPortion(portion);
                              setPortionForm({
                                portion_name: portion.portion_name,
                                percentage: Number(portion.percentage),
                                order_number: Number(portion.order_number),
                                status: (portion.status as any) || 'Upcoming',
                              });
                              setShowPortionModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Edit Segment"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeletePortion(portion.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                            title="Delete Segment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Criteria Items inside this Segment */}
                      {portionCriteria.length === 0 ? (
                        <div className="p-4 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
                          <p className="text-xs text-slate-400">
                            No criteria defined for this segment yet. Click "Add Criteria" to set score rubrics.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mb-2">
                            <span>Sub-Criteria Evaluation Rubrics ({portionCriteria.length}):</span>
                            <span>Internal Weight: {criteriaWeightSum}%</span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {portionCriteria.map((crit) => (
                              <div
                                key={crit.id}
                                className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-2 relative shadow-subtle group hover:border-slate-300 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-1">
                                  <h4 className="font-bold text-slate-900 text-xs">{crit.name}</h4>
                                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => {
                                        setEditingCriteria(crit);
                                        setCriteriaTargetPortionId(portion.id);
                                        setCriteriaForm({
                                          portion_id: String(portion.id),
                                          name: crit.name,
                                          max_score: Number(crit.max_score),
                                          percentage: Number(crit.percentage),
                                        });
                                        setShowCriteriaModal(true);
                                      }}
                                      className="p-0.5 text-slate-400 hover:text-slate-700"
                                      title="Edit Criteria"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCriteria(crit.id)}
                                      className="p-0.5 text-slate-400 hover:text-rose-600"
                                      title="Delete Criteria"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex justify-between text-slate-500 text-[11px] pt-1.5 border-t border-slate-200">
                                  <span>Max: <strong className="text-slate-800">{crit.max_score} pts</strong></span>
                                  <span>Weight: <strong className="text-yale-700">{crit.percentage}%</strong></span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE B: STANDARD COMPETITION EVENT (NON-PAGEANT) */
          /* ========================================================================= */
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yale-50 text-yale-700 flex items-center justify-center font-bold border border-yale-200">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Standard Single-Stage Criteria Evaluation
                  </h2>
                  <p className="text-xs text-slate-500">
                    Category: <strong className="text-slate-700">{selectedEvent?.type || 'General'}</strong> • All criteria evaluate directly toward the final aggregate score.
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Criteria Weight</span>
                <span className={`text-base font-black ${totalFlatCriteriaWeight === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {totalFlatCriteriaWeight}% / 100%
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200 shadow-card">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-yale-700 mb-2" />
                Loading criteria...
              </div>
            ) : criteriaList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200 shadow-card space-y-2">
                <Sliders className="w-8 h-8 mx-auto text-slate-300" />
                <h3 className="text-sm font-bold text-slate-800">No Criteria Added Yet</h3>
                <p className="text-xs text-slate-400">
                  Click "Add Criteria Item" above to define scoring rubrics for this event.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {criteriaList.map((crit) => (
                  <div
                    key={crit.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-card space-y-2.5 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-slate-900 text-xs">{crit.name}</h3>
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingCriteria(crit);
                            setCriteriaTargetPortionId(null);
                            setCriteriaForm({
                              portion_id: '',
                              name: crit.name,
                              max_score: Number(crit.max_score),
                              percentage: Number(crit.percentage),
                            });
                            setShowCriteriaModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Edit Criteria"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCriteria(crit.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                          title="Delete Criteria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-slate-500 text-xs pt-2 border-t border-slate-100">
                      <span>Max Points: <strong className="text-slate-800">{crit.max_score} pts</strong></span>
                      <span>Weight: <strong className="text-yale-700">{crit.percentage}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: PAGEANT PROCEEDINGS PRESETS */}
        {/* ========================================================================= */}
        {showPresetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowPresetModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Pageant Proceedings Templates</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Select an institutional template to auto-generate segments and weighted criteria
              </p>

              <div className="space-y-3">
                {PAGEANT_PRESETS.map((preset, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-slate-200 rounded-xl hover:border-yale-600 hover:bg-slate-50/50 transition-all cursor-pointer"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900">{preset.name}</h4>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{preset.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {preset.segments.map((s, sIdx) => (
                        <span key={sIdx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {s.portion_name} ({s.percentage}%)
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {applyingPreset && (
                <div className="mt-4 p-3 bg-yale-50 border border-yale-200 rounded-lg text-xs font-semibold text-yale-800 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-yale-700" />
                  <span>Applying pageant proceeding segments &amp; rubrics...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: ADD / EDIT PAGEANT SEGMENT */}
        {/* ========================================================================= */}
        {showPortionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setShowPortionModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-yale-700" />
                <span>{editingPortion ? 'Edit Pageant Segment' : 'Add Pageant Segment'}</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Define the proceeding title, sequence order, and weight contribution to final score
              </p>

              <form onSubmit={handleSavePortion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Segment Name / Proceeding Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Swimwear Competition, Evening Gown, Q&A"
                    value={portionForm.portion_name}
                    onChange={(e) => setPortionForm({ ...portionForm, portion_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Weight Percentage (%)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={portionForm.percentage}
                      onChange={(e) => setPortionForm({ ...portionForm, percentage: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Proceeding Sequence #
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={portionForm.order_number}
                      onChange={(e) => setPortionForm({ ...portionForm, order_number: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Segment Status</label>
                  <select
                    value={portionForm.status}
                    onChange={(e) => setPortionForm({ ...portionForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing / Live</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPortionModal(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    {editingPortion ? 'Save Changes' : 'Create Segment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: ADD / EDIT CRITERIA ITEM */}
        {/* ========================================================================= */}
        {showCriteriaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setShowCriteriaModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-yale-700" />
                <span>{editingCriteria ? 'Edit Criteria Item' : 'Add Scoring Criteria Item'}</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Define the rubric name, maximum possible points, and percentage weight
              </p>

              <form onSubmit={handleSaveCriteria} className="space-y-4">
                {isPageant && portions.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assigned Pageant Segment
                    </label>
                    <select
                      value={criteriaTargetPortionId !== null ? criteriaTargetPortionId : criteriaForm.portion_id}
                      onChange={(e) => {
                        setCriteriaTargetPortionId(Number(e.target.value));
                        setCriteriaForm({ ...criteriaForm, portion_id: e.target.value });
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                    >
                      {portions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.portion_name} ({p.percentage}%)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Criteria Name / Description
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Poise & Bearing, Articulation, Mastery"
                    value={criteriaForm.name}
                    onChange={(e) => setCriteriaForm({ ...criteriaForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Maximum Raw Points
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={1000}
                      value={criteriaForm.max_score}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, max_score: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Weight Percentage (%)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      value={criteriaForm.percentage}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, percentage: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCriteriaModal(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    {editingCriteria ? 'Save Changes' : 'Add Criteria'}
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Criteria Studio...</div>}>
      <CriteriaContent />
    </Suspense>
  );
}
