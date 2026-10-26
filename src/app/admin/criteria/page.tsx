'use client';

import { Suspense, useEffect, useState, useMemo, type FormEvent } from 'react';
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
  Copy,
  Printer,
  Radio,
  Lock,
  Clock,
  HelpCircle,
  FileText,
  Percent,
  CheckCheck,
} from 'lucide-react';
import { Criteria, Event, EventPortion } from '@/lib/types';

// Built-in Scalable Pageant & Competition Proceeding Presets
const COMPETITION_PRESETS = [
  {
    name: 'Collegiate Mutya / Mr. & Ms. ASC Comprehensive (5 Segments)',
    category: 'Pageantry',
    badge: 'Collegiate Master',
    description: 'Production & Casual (15%), Swimwear & Fitness (20%), Evening Gown (25%), Preliminary Interview (20%), Final Top 5 Q&A (20%)',
    segments: [
      {
        portion_name: 'Production Number & Casual Wear',
        percentage: 15,
        order_number: 1,
        description: 'Opening choreography, stage rhythm, and collegiate casual presentation',
        criteria: [
          { name: 'Stage Projection & Rhythm', max_score: 100, percentage: 50, description: 'Choreographic mastery, timing, and dynamic audience engagement' },
          { name: 'Poise, Bearing & Confidence', max_score: 100, percentage: 50, description: 'Grace, composure, and vibrant stage personality' },
        ],
      },
      {
        portion_name: 'Swimwear & Athletic Fitness Competition',
        percentage: 20,
        order_number: 2,
        description: 'Physical tone, posture, body symmetry, and confident runway walk',
        criteria: [
          { name: 'Physical Fitness & Body Tone', max_score: 100, percentage: 50, description: 'Healthy physique, muscle definition, and body proportion' },
          { name: 'Grace, Bearing & Ramp Walk', max_score: 100, percentage: 50, description: 'Pacing, turns, posture, and natural elegance on stage' },
        ],
      },
      {
        portion_name: 'Long Gown & Formal Attire Competition',
        percentage: 25,
        order_number: 3,
        description: 'Elegance, couture carriage, poise, and gown fit on the runway',
        criteria: [
          { name: 'Elegance, Carriage & Poise', max_score: 100, percentage: 50, description: 'Regal demeanor, smoothness of stride, and graceful posture' },
          { name: 'Gown Fit, Appeal & Stage Impact', max_score: 100, percentage: 50, description: 'Complement of attire, styling, and unforgettable stage visual' },
        ],
      },
      {
        portion_name: 'Preliminary Closed-Door Advocacy Interview',
        percentage: 20,
        order_number: 4,
        description: 'Intellectual depth, personal advocacy, and communication skills',
        criteria: [
          { name: 'Substance, Advocacy & Intelligence', max_score: 100, percentage: 50, description: 'Relevance of perspective, social awareness, and clarity of thought' },
          { name: 'Spontaneity, Diction & Composure', max_score: 100, percentage: 50, description: 'Articulation, vocal modulation, and confidence under pressure' },
        ],
      },
      {
        portion_name: 'Grand Final Top 5 Deciding Q&A Round',
        percentage: 20,
        order_number: 5,
        description: 'Final impromptu question round to determine the titleholder',
        criteria: [
          { name: 'Wit, Content & Relevance of Answer', max_score: 100, percentage: 60, description: 'Direct answer to question, intellectual insight, and substance' },
          { name: 'Delivery, Composure & Stage Eloquence', max_score: 100, percentage: 40, description: 'Poise under the spotlight, eloquence, and stage impact' },
        ],
      },
    ],
  },
  {
    name: 'National Pageant Standard (Binibining / Miss Universe 4 Rounds)',
    category: 'Pageantry',
    badge: 'National Standard',
    description: 'Preliminary Round (25%), Swimsuit Finals (25%), Evening Gown Finals (25%), Final Speech & Q&A (25%)',
    segments: [
      {
        portion_name: 'Preliminary Round & Closed-Door Panel',
        percentage: 25,
        order_number: 1,
        description: 'Comprehensive preliminary panel review and advocacy defense',
        criteria: [
          { name: 'Advocacy Presentation & Depth', max_score: 100, percentage: 50, description: 'Commitment to community advocacy and clear mission' },
          { name: 'Preliminary Runway & Stage Bearing', max_score: 100, percentage: 50, description: 'Overall runway impact, posture, and presence' },
        ],
      },
      {
        portion_name: 'Swimsuit Final Round',
        percentage: 25,
        order_number: 2,
        description: 'Fitness presentation and vibrant runway confidence',
        criteria: [
          { name: 'Physical Fitness & Tone', max_score: 100, percentage: 50, description: 'Body tone, symmetry, and overall vitality' },
          { name: 'Runway Projection & Charisma', max_score: 100, percentage: 50, description: 'Energy, pace, turns, and camera projection' },
        ],
      },
      {
        portion_name: 'Evening Gown Final Round',
        percentage: 25,
        order_number: 3,
        description: 'Sophistication, formal elegance, and stage glamour',
        criteria: [
          { name: 'Glamour, Bearing & Poise', max_score: 100, percentage: 50, description: 'Regal bearing, poise, and dignified demeanor' },
          { name: 'Gown Fit & Overall Visual Impact', max_score: 100, percentage: 50, description: 'Attire styling, silhouette, and artistic appeal' },
        ],
      },
      {
        portion_name: 'Final Impromptu Q&A & Speech',
        percentage: 25,
        order_number: 4,
        description: 'Crucial impromptu interview to crown the queen',
        criteria: [
          { name: 'Thought Leadership & Content', max_score: 100, percentage: 60, description: 'Substantive answer, clarity of vision, and authentic wisdom' },
          { name: 'Eloquence & Poise Under Pressure', max_score: 100, percentage: 40, description: 'Smooth delivery, calm demeanor, and inspiring voice' },
        ],
      },
    ],
  },
  {
    name: 'Cultural Festival Queen Pageant (4 Segments)',
    category: 'Cultural Pageantry',
    badge: 'Cultural Royalty',
    description: 'Festival Streetdance & Costume (30%), Talent (25%), Filipiniana Gown (20%), Cultural Advocacy Q&A (25%)',
    segments: [
      {
        portion_name: 'Festival Streetdance & Creative Costume',
        percentage: 30,
        order_number: 1,
        description: 'Traditional and creative costume highlighting local heritage',
        criteria: [
          { name: 'Authenticity & Cultural Relevance', max_score: 100, percentage: 50, description: 'Faithful representation of local traditions and mythology' },
          { name: 'Visual Craftsmanship & Stage Bearing', max_score: 100, percentage: 50, description: 'Costume artistry, creativity, and rhythm during presentation' },
        ],
      },
      {
        portion_name: 'Special Talent Competition',
        percentage: 25,
        order_number: 2,
        description: 'Showcase of exceptional creative, musical, or theatrical ability',
        criteria: [
          { name: 'Mastery & Technical Skill', max_score: 100, percentage: 50, description: 'Difficulty, technical precision, and execution of talent' },
          { name: 'Stage Presence & Entertainment', max_score: 100, percentage: 50, description: 'Showmanship, charisma, and emotional audience connection' },
        ],
      },
      {
        portion_name: 'Formal Filipiniana / Indigenous Wear',
        percentage: 20,
        order_number: 3,
        description: 'Elegance in traditional formal attire',
        criteria: [
          { name: 'Poise, Grace & Cultural Carriage', max_score: 100, percentage: 50, description: 'Regal carriage honoring indigenous aesthetics' },
          { name: 'Attire Fitting & Visual Elegance', max_score: 100, percentage: 50, description: 'Fit, craftsmanship, and aesthetic balance' },
        ],
      },
      {
        portion_name: 'Cultural Advocacy & Impromptu Q&A',
        percentage: 25,
        order_number: 4,
        description: 'Articulating community values, tourism, and heritage',
        criteria: [
          { name: 'Substance & Heritage Advocacy', max_score: 100, percentage: 50, description: 'Depth of answer regarding cultural preservation and community' },
          { name: 'Articulation, Delivery & Conviction', max_score: 100, percentage: 50, description: 'Clarity of speech, persuasiveness, and passion' },
        ],
      },
    ],
  },
  {
    name: 'Two-Phase Elimination Pageant (Prelims 60% -> Finals 40%)',
    category: 'Tournament Pageantry',
    badge: 'Multi-Phase Cut',
    description: 'Phase 1: Overall Preliminary (60%) -> Phase 2: Top 5 Clean-Slate Grand Finals (40%)',
    segments: [
      {
        portion_name: 'Preliminary Overall Round (Decides Top 5 Cut)',
        percentage: 60,
        order_number: 1,
        description: 'Aggregated preliminary round scores to determine the finalists',
        criteria: [
          { name: 'Preliminary Closed-Door Interview', max_score: 100, percentage: 40, description: 'Personality, intelligence, and communication skills' },
          { name: 'Preliminary Swimwear Competition', max_score: 100, percentage: 30, description: 'Fitness, tone, and confidence on stage' },
          { name: 'Preliminary Evening Gown Competition', max_score: 100, percentage: 30, description: 'Elegance, glamour, and couture fit' },
        ],
      },
      {
        portion_name: 'Top 5 Grand Final Q&A Deciding Round',
        percentage: 40,
        order_number: 2,
        description: 'Final decider stage for the Top 5 finalists',
        criteria: [
          { name: 'Final Question Comprehension & Response', max_score: 100, percentage: 60, description: 'Wit, intellectual insight, and relevance of answer' },
          { name: 'Spontaneity, Eloquence & Royal Bearing', max_score: 100, percentage: 40, description: 'Presence of mind, composure, and stage grace' },
        ],
      },
    ],
  },
  {
    name: 'Pre-Pageant Talent Night + Grand Coronation (30% / 70%)',
    category: 'Twin-Night Pageantry',
    badge: 'Twin-Night System',
    description: 'Night 1: Pre-Pageant Talent Exhibition (30%) + Night 2: Coronation Night (70%)',
    segments: [
      {
        portion_name: 'Pre-Pageant Special Talent Night',
        percentage: 30,
        order_number: 1,
        description: 'Independent evening event dedicated to talent judging',
        criteria: [
          { name: 'Execution & Technical Mastery', max_score: 100, percentage: 50, description: 'Expertise, difficulty, and accuracy of performance' },
          { name: 'Stage Entertainment & Creativity', max_score: 100, percentage: 50, description: 'Originality, audience rapport, and dynamic impact' },
        ],
      },
      {
        portion_name: 'Grand Coronation Pageant Night',
        percentage: 70,
        order_number: 2,
        description: 'Main pageant proceedings on coronation night',
        criteria: [
          { name: 'Swimwear & Casual Appearance', max_score: 100, percentage: 30, description: 'Physical fitness, posture, and stage rhythm' },
          { name: 'Evening Gown & Stage Carriage', max_score: 100, percentage: 35, description: 'Elegance, poise, and gown visual appeal' },
          { name: 'Final Stage Question & Answer', max_score: 100, percentage: 35, description: 'Substance, clarity, and articulation under spotlight' },
        ],
      },
    ],
  },
  {
    name: 'Academic Debate & Oratorical Symposium (3 Segments)',
    category: 'Academic Competition',
    badge: 'Debate / Speech',
    description: 'Constructive Speech (40%), Cross-Examination & Rebuttal (35%), Delivery & Poise (25%)',
    segments: [
      {
        portion_name: 'Constructive Speech & Argumentation',
        percentage: 40,
        order_number: 1,
        description: 'Substantive case building and evidence delivery',
        criteria: [
          { name: 'Evidence, Logic & Factual Accuracy', max_score: 100, percentage: 50, description: 'Depth of research and soundness of reasoning' },
          { name: 'Structural Organization & Thesis Clarity', max_score: 100, percentage: 50, description: 'Flow of arguments and clarity of resolution points' },
        ],
      },
      {
        portion_name: 'Cross-Examination & Rebuttal Segment',
        percentage: 35,
        order_number: 2,
        description: 'Interpellation, cross-questioning, and strategic response',
        criteria: [
          { name: 'Wit, Spontaneity & Direct Refutation', max_score: 100, percentage: 50, description: 'Quick thinking and dismantling of opposing claims' },
          { name: 'Composure & Professional Demeanor', max_score: 100, percentage: 50, description: 'Ethical conduct, respect, and calm under fire' },
        ],
      },
      {
        portion_name: 'Oratorical Delivery & Rhetoric',
        percentage: 25,
        order_number: 3,
        description: 'Mastery of speech delivery and persuasive impact',
        criteria: [
          { name: 'Diction, Vocal Modulation & Pace', max_score: 100, percentage: 50, description: 'Enunciation, tone dynamics, and audibility' },
          { name: 'Stage Presence, Eye Contact & Persuasion', max_score: 100, percentage: 50, description: 'Audience connection and overall rhetorical power' },
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
  const [criteriaSearch, setCriteriaSearch] = useState('');
  const [portions, setPortions] = useState<EventPortion[]>([]);
  const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Segmentation Mode override (for non-pageant events that want proceedings, or vice versa)
  const [forceMultiSegment, setForceMultiSegment] = useState<boolean | null>(null);

  // Modals
  const [showPortionModal, setShowPortionModal] = useState(false);
  const [editingPortion, setEditingPortion] = useState<EventPortion | null>(null);

  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [criteriaTargetPortionId, setCriteriaTargetPortionId] = useState<number | null>(null);
  const [editingCriteria, setEditingCriteria] = useState<Criteria | null>(null);

  const [showPresetModal, setShowPresetModal] = useState(false);
  const [presetOverwrite, setPresetOverwrite] = useState(true);
  const [applyingPreset, setApplyingPreset] = useState(false);

  const [showPrintModal, setShowPrintModal] = useState(false);

  // Forms
  const [portionForm, setPortionForm] = useState({
    portion_name: '',
    percentage: 25,
    order_number: 1,
    status: 'Upcoming' as const,
    description: '',
  });

  const [criteriaForm, setCriteriaForm] = useState({
    portion_id: '',
    name: '',
    max_score: 100,
    percentage: 25,
    description: '',
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
    setForceMultiSegment(null); // Reset manual override on event switch
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => String(e.id) === String(selectedEventId));
  const isInherentlyPageant = (selectedEvent?.type || '').toLowerCase().includes('pageant');
  // If user explicitly toggles segmentation or if portions already exist, enable multi-segment mode
  const isMultiSegment = forceMultiSegment !== null ? forceMultiSegment : (isInherentlyPageant || portions.length > 0);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // CRUD OPERATIONS FOR SEGMENTS (PORTIONS)
  // ---------------------------------------------------------------------------
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
        showFeedback('Pageant segment updated successfully');
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
        showFeedback('New pageant segment created');
      }
      setShowPortionModal(false);
      setEditingPortion(null);
      loadCriteria();
    } catch (e) {
      console.error(e);
      showFeedback('Failed to save segment', 'error');
    }
  };

  const handleDuplicatePortion = async (portionId: number) => {
    try {
      const res = await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'duplicate_portion',
          portion_id: portionId,
        }),
      });
      if (res.ok) {
        showFeedback('Segment & its criteria rubrics duplicated successfully');
        loadCriteria();
      } else {
        showFeedback('Failed to duplicate segment', 'error');
      }
    } catch (e) {
      console.error(e);
      showFeedback('Error duplicating segment', 'error');
    }
  };

  const handleDeletePortion = async (portionId: number) => {
    if (!confirm('Are you sure you want to delete this segment? All criteria rubrics inside this segment will also be deleted.')) return;
    try {
      await fetch(`/api/criteria?id=${portionId}&itemType=portion`, { method: 'DELETE' });
      showFeedback('Segment and associated criteria deleted');
      loadCriteria();
    } catch (e) {
      console.error(e);
      showFeedback('Failed to delete segment', 'error');
    }
  };

  const handleQuickStatusChange = async (portion: EventPortion, newStatus: 'Upcoming' | 'Ongoing' | 'Completed') => {
    try {
      await fetch('/api/criteria', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'portion',
          id: portion.id,
          status: newStatus,
        }),
      });
      showFeedback(`Segment #${portion.order_number} marked as ${newStatus}`);
      loadCriteria();
    } catch (e) {
      console.error(e);
    }
  };

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

  // Auto Balance / Distribute All Segments Evenly to 100%
  const handleBalanceAllSegments = async () => {
    if (portions.length === 0) return;
    if (!confirm(`Distribute weights evenly across all ${portions.length} pageant segments? Total will sum to exactly 100%.`)) return;

    try {
      const res = await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'balance_portions',
          event_id: Number(selectedEventId),
        }),
      });
      if (res.ok) {
        showFeedback('All segments balanced evenly to 100%');
        loadCriteria();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------------------------------------------------------------
  // CRUD OPERATIONS FOR CRITERIA
  // ---------------------------------------------------------------------------
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
            description: criteriaForm.description,
          }),
        });
        showFeedback('Criteria item updated');
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
            description: criteriaForm.description,
          }),
        });
        showFeedback('New criteria rubric added');
      }
      setShowCriteriaModal(false);
      setEditingCriteria(null);
      loadCriteria();
    } catch (e) {
      console.error(e);
      showFeedback('Failed to save criteria', 'error');
    }
  };

  const handleDuplicateCriteria = async (criteriaId: number) => {
    try {
      const res = await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'duplicate_criteria',
          criteria_id: criteriaId,
        }),
      });
      if (res.ok) {
        showFeedback('Criteria rubric duplicated');
        loadCriteria();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCriteria = async (criteriaId: number) => {
    if (!confirm('Are you sure you want to delete this criteria item?')) return;
    try {
      await fetch(`/api/criteria?id=${criteriaId}&itemType=criteria`, { method: 'DELETE' });
      showFeedback('Criteria item deleted');
      loadCriteria();
    } catch (e) {
      console.error(e);
      showFeedback('Failed to delete criteria', 'error');
    }
  };

  const handleBalanceSegmentCriteria = async (portionId: number) => {
    try {
      const res = await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'balance_criteria',
          portion_id: portionId,
        }),
      });
      if (res.ok) {
        showFeedback('Segment criteria weights balanced to 100%');
        loadCriteria();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------------------------------------------------------------
  // PRESET APPLICATION & RESET
  // ---------------------------------------------------------------------------
  const handleApplyPreset = async (preset: typeof COMPETITION_PRESETS[0]) => {
    const confirmText = presetOverwrite
      ? `Replace existing criteria with "${preset.name}"? Current rubrics for this event will be replaced.`
      : `Append "${preset.name}" to this event?`;
    if (!confirm(confirmText)) return;

    setApplyingPreset(true);
    try {
      const res = await fetch('/api/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'preset',
          event_id: Number(selectedEventId),
          segments: preset.segments,
          overwrite: presetOverwrite,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        alert(data.error || 'Failed to apply preset');
      } else {
        setShowPresetModal(false);
        showFeedback(`Preset "${preset.name}" applied successfully`);
        loadCriteria();
      }
    } catch (e) {
      console.error('Error applying preset:', e);
      alert('Error applying template');
    } finally {
      setApplyingPreset(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to clear ALL segments and criteria for this event? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/criteria?itemType=clear_all&eventId=${selectedEventId}`, { method: 'DELETE' });
      if (res.ok) {
        showFeedback('All segments and criteria cleared for this event');
        loadCriteria();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ---------------------------------------------------------------------------
  // COMPUTED VALUES
  // ---------------------------------------------------------------------------
  const totalPortionWeight = portions.reduce((acc, p) => acc + (Number(p.percentage) || 0), 0);
  const totalFlatCriteriaWeight = criteriaList.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);

  const filteredEvents = events.filter((evt) =>
    evt.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
    (evt.type && evt.type.toLowerCase().includes(eventSearch.toLowerCase()))
  );

  const filteredPortions = portions.filter((p) =>
    p.portion_name.toLowerCase().includes(criteriaSearch.toLowerCase()) ||
    criteriaList.some(
      (c) => Number(c.portion_id) === Number(p.id) && c.name.toLowerCase().includes(criteriaSearch.toLowerCase())
    )
  );

  const filteredFlatCriteria = criteriaList.filter((c) =>
    c.name.toLowerCase().includes(criteriaSearch.toLowerCase())
  );

  return (
    <AppLayout
      pageTitle="Criteria & Weighting Studio"
      pageSubtitle={
        isMultiSegment
          ? 'Pageantry multi-segment proceedings, phase percentages, and criteria rubrics'
          : 'Standard competition criteria, point limits, and percentage weightings'
      }
    >
      <div className="space-y-6">
        {/* Notification Toast */}
        {actionMessage && (
          <div
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold transition-all animate-in fade-in slide-in-from-top-2 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            <CheckCheck className="w-4 h-4 shrink-0" />
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Top Controls Toolbar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-card flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Search Input Filter */}
            <div className="relative w-full sm:w-56 shrink-0">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Find event..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white"
              />
            </div>

            {/* Event Dropdown */}
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Event:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 rounded-lg px-3 py-1.5 focus:outline-none focus:border-yale-600 focus:bg-white truncate"
              >
                {filteredEvents.map((evt) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.name} [{evt.type || 'Competition'}]
                  </option>
                ))}
              </select>
            </div>

            {/* In-Page Criteria Search */}
            <div className="relative w-full sm:w-48 shrink-0">
              <input
                type="text"
                value={criteriaSearch}
                onChange={(e) => setCriteriaSearch(e.target.value)}
                placeholder="Filter rubrics / segments..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white"
              />
              {criteriaSearch && (
                <button
                  onClick={() => setCriteriaSearch('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Presets Button */}
            <button
              onClick={() => setShowPresetModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200/80 transition-colors cursor-pointer shadow-xs"
              title="Browse pre-built institutional pageant and competition rubrics"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Pageant Presets</span>
            </button>

            {/* Printable Official Rubric */}
            <button
              onClick={() => setShowPrintModal(true)}
              disabled={isMultiSegment ? portions.length === 0 : criteriaList.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer disabled:opacity-40"
              title="Print official criteria sheet for judges and tabulators"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Official Sheet</span>
            </button>

            {/* Architecture Mode Toggle (Multi-Segment vs Flat Criteria) */}
            <button
              onClick={() => setForceMultiSegment(!isMultiSegment)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title={isMultiSegment ? 'Switch to Single-Stage Criteria' : 'Switch to Multi-Segment Proceedings Architecture'}
            >
              <Layers className="w-3.5 h-3.5 text-yale-600" />
              <span className="hidden md:inline">Mode:</span>
              <span className="font-bold text-slate-800">
                {isMultiSegment ? 'Multi-Segment' : 'Single-Stage'}
              </span>
            </button>

            {/* Add Segment or Add Criteria */}
            {isMultiSegment ? (
              <button
                onClick={() => {
                  setEditingPortion(null);
                  setPortionForm({
                    portion_name: '',
                    percentage: portions.length === 0 ? 100 : Math.max(5, Math.floor(100 / (portions.length + 1))),
                    order_number: portions.length + 1,
                    status: 'Upcoming',
                    description: '',
                  });
                  setShowPortionModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Segment</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditingCriteria(null);
                  setCriteriaTargetPortionId(null);
                  setCriteriaForm({ portion_id: '', name: '', max_score: 100, percentage: 25, description: '' });
                  setShowCriteriaModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Criteria Item</span>
              </button>
            )}

            {/* Refresh */}
            <button
              onClick={loadCriteria}
              disabled={loading}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs transition-colors cursor-pointer"
              title="Refresh Criteria"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: MULTI-SEGMENT PROCEEDINGS ARCHITECTURE (PAGEANTRY / MULTI-PHASE) */}
        {/* ========================================================================= */}
        {isMultiSegment ? (
          <div className="space-y-6">
            {/* Pageant Grand Executive Status Banner */}
            <div className="bg-gradient-to-r from-[#071E3D] via-[#0F4C81] to-[#1E3A8A] text-white rounded-3xl p-6 shadow-card border border-white/10">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-400 text-navy-950">
                      Pageantry Multi-Segment Proceedings Architecture
                    </span>
                    <span className="text-[10px] text-blue-200">
                      {selectedEvent?.academic_year ? `AY ${selectedEvent.academic_year}` : 'Active Event'}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black mt-2 tracking-tight">
                    {selectedEvent?.name}
                  </h2>
                  <p className="text-xs text-blue-100 mt-1 max-w-xl">
                    Configure competition segments, order of proceedings, score weight distributions, and judge scoring rubrics.
                  </p>
                </div>

                {/* Live Segment Weight Balancer Meter */}
                <div className="bg-white/10 backdrop-blur-xs border border-white/20 rounded-2xl p-4 text-right shrink-0 min-w-[210px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] uppercase font-bold text-blue-200 block">Total Proceedings Weight</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        totalPortionWeight === 100
                          ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      }`}
                    >
                      {totalPortionWeight === 100 ? '100% Balanced' : `${totalPortionWeight}% of 100%`}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1.5 justify-end mt-1">
                    <span className="text-3xl font-black text-amber-400">{totalPortionWeight}%</span>
                    <span className="text-xs text-blue-200">/ 100%</span>
                  </div>

                  <div className="mt-2 flex items-center justify-end gap-2">
                    {totalPortionWeight !== 100 && portions.length > 0 && (
                      <button
                        onClick={handleBalanceAllSegments}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg border border-white/20 transition-all cursor-pointer"
                        title="Evenly balance all segment weights to sum 100%"
                      >
                        <Scale className="w-3 h-3 text-amber-400" />
                        <span>Auto-Balance to 100%</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Visual Segment Distribution Progress Bar */}
              {portions.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] text-blue-200 mb-1.5">
                    <span className="font-semibold">Proceedings Timeline &amp; Weight Distribution ({portions.length} Segments):</span>
                    <span className="text-[10px]">Tap or hover on segment blocks for details</span>
                  </div>
                  <div className="w-full h-3.5 bg-white/15 rounded-full overflow-hidden flex shadow-inner">
                    {portions.map((p, idx) => {
                      const colors = ['bg-amber-400', 'bg-sky-400', 'bg-emerald-400', 'bg-rose-400', 'bg-purple-400', 'bg-cyan-400'];
                      const color = colors[idx % colors.length];
                      return (
                        <div
                          key={p.id}
                          style={{ width: `${Math.min(100, Number(p.percentage))}%` }}
                          className={`${color} h-full transition-all relative group cursor-pointer hover:opacity-90`}
                          title={`#${p.order_number} ${p.portion_name}: ${p.percentage}% weight`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px]">
                    {portions.map((p, idx) => {
                      const dotColors = ['bg-amber-400', 'bg-sky-400', 'bg-emerald-400', 'bg-rose-400', 'bg-purple-400', 'bg-cyan-400'];
                      return (
                        <span key={p.id} className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
                          <span className={`w-2 h-2 rounded-full ${dotColors[idx % dotColors.length]}`} />
                          <span className="font-bold text-white">#{p.order_number} {p.portion_name}</span>
                          <span className="text-amber-300 font-mono font-bold">({p.percentage}%)</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* List of Pageant Segments */}
            {loading ? (
              <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-card">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-yale-700 mb-2" />
                <p className="font-semibold text-xs text-slate-600">Loading pageant proceedings...</p>
              </div>
            ) : filteredPortions.length === 0 ? (
              <div className="p-14 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-card space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
                  <Layers className="w-7 h-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No Pageant Segments Defined</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pageantry competitions require structured proceedings (e.g. Swimwear, Evening Gown, Q&A).
                    Apply an institutional template or add custom proceedings.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setShowPresetModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-navy-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-sm cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4 text-navy-950" />
                    <span>Load Collegiate Preset</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingPortion(null);
                      setPortionForm({ portion_name: '', percentage: 25, order_number: 1, status: 'Upcoming', description: '' });
                      setShowPortionModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-xl shadow-sm cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Custom Segment</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredPortions.map((portion) => {
                  const portionCriteria = criteriaList.filter(
                    (c) => Number(c.portion_id) === Number(portion.id)
                  );
                  const criteriaWeightSum = portionCriteria.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);

                  return (
                    <div
                      key={portion.id}
                      className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card space-y-4 hover:border-slate-300 transition-all"
                    >
                      {/* Segment Card Header */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="w-9 h-9 rounded-xl bg-yale-50 text-yale-800 flex items-center justify-center font-black text-sm border border-yale-200 shrink-0">
                            #{portion.order_number}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                                {portion.portion_name}
                              </h3>
                              {/* Status Controller Badge */}
                              <select
                                value={portion.status || 'Upcoming'}
                                onChange={(e) => handleQuickStatusChange(portion, e.target.value as any)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none transition-colors ${
                                  portion.status === 'Ongoing'
                                    ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                                    : portion.status === 'Completed'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                                title="Click to update segment proceeding status"
                              >
                                <option value="Upcoming">⏳ Upcoming</option>
                                <option value="Ongoing">🔴 Live / Judging Active</option>
                                <option value="Completed">🔒 Completed / Locked</option>
                              </select>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                              <span>Segment Weight: <strong className="text-yale-700 font-bold">{portion.percentage}%</strong> of Grand Total</span>
                              {portion.description && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-slate-500 italic max-w-md truncate">{portion.description}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Segment Controls */}
                        <div className="flex flex-wrap items-center gap-1.5 self-start lg:self-auto">
                          {/* Segment Balance Tag */}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              criteriaWeightSum === 100
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {criteriaWeightSum === 100 ? 'Rubric: 100% Balanced' : `Rubric: ${criteriaWeightSum}% / 100%`}
                          </span>

                          {/* Reordering Controls */}
                          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                            <button
                              onClick={() => handleMoveSegment(portion, 'up')}
                              disabled={portions.findIndex((p) => p.id === portion.id) === 0}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded transition-colors cursor-pointer"
                              title="Move earlier in stage proceedings"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveSegment(portion, 'down')}
                              disabled={portions.findIndex((p) => p.id === portion.id) === portions.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded transition-colors cursor-pointer"
                              title="Move later in stage proceedings"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Distribute Criteria Evenly Button */}
                          {portionCriteria.length > 1 && criteriaWeightSum !== 100 && (
                            <button
                              onClick={() => handleBalanceSegmentCriteria(portion.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                              title="Distribute rubrics evenly so internal sum is 100%"
                            >
                              <Scale className="w-3 h-3 text-amber-600" />
                              <span>Balance (100%)</span>
                            </button>
                          )}

                          {/* Add Criteria Item to This Segment */}
                          <button
                            onClick={() => {
                              setEditingCriteria(null);
                              setCriteriaTargetPortionId(portion.id);
                              setCriteriaForm({
                                portion_id: String(portion.id),
                                name: '',
                                max_score: 100,
                                percentage: portionCriteria.length === 0 ? 100 : Math.max(10, Math.floor(100 / (portionCriteria.length + 1))),
                                description: '',
                              });
                              setShowCriteriaModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-yale-800 bg-yale-50 hover:bg-yale-100 border border-yale-200 rounded-lg transition-colors cursor-pointer"
                            title="Add a scoring criterion to this pageant segment"
                          >
                            <Plus className="w-3 h-3 text-yale-700" />
                            <span>Add Rubric</span>
                          </button>

                          {/* Duplicate Segment */}
                          <button
                            onClick={() => handleDuplicatePortion(portion.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Duplicate this segment and its criteria rubrics"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Segment */}
                          <button
                            onClick={() => {
                              setEditingPortion(portion);
                              setPortionForm({
                                portion_name: portion.portion_name,
                                percentage: Number(portion.percentage),
                                order_number: Number(portion.order_number),
                                status: (portion.status as any) || 'Upcoming',
                                description: portion.description || '',
                              });
                              setShowPortionModal(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Edit Segment Configuration"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Segment */}
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
                        <div className="p-5 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200 space-y-1">
                          <p className="text-xs font-semibold text-slate-500">
                            No criteria rubrics defined for this segment yet.
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Click <strong className="text-yale-700">"Add Rubric"</strong> to configure judge evaluation standards.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1">
                            <span>Sub-Criteria Evaluation Rubrics ({portionCriteria.length}):</span>
                            <span>Internal Weight Sum: <strong className="text-slate-800">{criteriaWeightSum}%</strong></span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {portionCriteria.map((crit) => (
                              <div
                                key={crit.id}
                                className="bg-slate-50/90 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 p-3.5 rounded-xl text-xs space-y-2 relative shadow-subtle group transition-all"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <div>
                                    <h4 className="font-bold text-slate-900 text-xs leading-snug">
                                      {crit.name}
                                    </h4>
                                    {crit.description && (
                                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                        {crit.description}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button
                                      onClick={() => handleDuplicateCriteria(crit.id)}
                                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                      title="Duplicate Criteria"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingCriteria(crit);
                                        setCriteriaTargetPortionId(portion.id);
                                        setCriteriaForm({
                                          portion_id: String(portion.id),
                                          name: crit.name,
                                          max_score: Number(crit.max_score),
                                          percentage: Number(crit.percentage),
                                          description: crit.description || '',
                                        });
                                        setShowCriteriaModal(true);
                                      }}
                                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                                      title="Edit Criteria"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteCriteria(crit.id)}
                                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                      title="Delete Criteria"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-slate-500 text-[11px] pt-2 border-t border-slate-200">
                                  <span>Max Score: <strong className="text-slate-800 font-mono font-bold">{crit.max_score} pts</strong></span>
                                  <span>Weight: <strong className="text-yale-700 font-mono font-bold">{crit.percentage}%</strong></span>
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
          /* VIEW 2: STANDARD DIRECT CRITERIA (SINGLE-STAGE / NON-PAGEANT) */
          /* ========================================================================= */
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-yale-50 text-yale-700 flex items-center justify-center font-bold border border-yale-200 shrink-0">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Standard Single-Stage Criteria Evaluation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Category: <strong className="text-slate-800">{selectedEvent?.type || 'General Competition'}</strong> • Direct rubric evaluation toward final aggregate score.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-right self-start sm:self-auto min-w-[170px]">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Criteria Weight</span>
                <span className={`text-xl font-black font-mono ${totalFlatCriteriaWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {totalFlatCriteriaWeight}% / 100%
                </span>
              </div>
            </div>

            {loading ? (
              <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-card">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-yale-700 mb-2" />
                <p className="font-semibold text-xs text-slate-600">Loading criteria rubrics...</p>
              </div>
            ) : filteredFlatCriteria.length === 0 ? (
              <div className="p-14 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 shadow-card space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <Sliders className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Criteria Added Yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click "Add Criteria Item" to define scoring rubrics and point limits for this competition.
                </p>
                <button
                  onClick={() => {
                    setEditingCriteria(null);
                    setCriteriaTargetPortionId(null);
                    setCriteriaForm({ portion_id: '', name: '', max_score: 100, percentage: 25, description: '' });
                    setShowCriteriaModal(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-xl shadow-xs"
                >
                  Add Criteria Item
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredFlatCriteria.map((crit) => (
                  <div
                    key={crit.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 shadow-card space-y-2.5 relative group hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{crit.name}</h3>
                        {crit.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                            {crit.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => handleDuplicateCriteria(crit.id)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded"
                          title="Duplicate Criteria"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingCriteria(crit);
                            setCriteriaTargetPortionId(null);
                            setCriteriaForm({
                              portion_id: '',
                              name: crit.name,
                              max_score: Number(crit.max_score),
                              percentage: Number(crit.percentage),
                              description: crit.description || '',
                            });
                            setShowCriteriaModal(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded"
                          title="Edit Criteria"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCriteria(crit.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Delete Criteria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-slate-500 text-xs pt-2.5 border-t border-slate-100">
                      <span>Max Points: <strong className="text-slate-800 font-mono font-bold">{crit.max_score} pts</strong></span>
                      <span>Weight: <strong className="text-yale-700 font-mono font-bold">{crit.percentage}%</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: PAGEANT PROCEEDINGS PRESETS STUDIO */}
        {/* ========================================================================= */}
        {showPresetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
              <button
                onClick={() => setShowPresetModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Pageantry Proceedings &amp; Rubrics Library
                    </h2>
                    <p className="text-xs text-slate-500">
                      Institutional templates customized for collegiate pageants, cultural queens, and multi-round formats.
                    </p>
                  </div>
                </div>

                {/* Overwrite or Append Toggle */}
                <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-600">
                  <span>Application Mode:</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="presetMode"
                      checked={presetOverwrite}
                      onChange={() => setPresetOverwrite(true)}
                      className="accent-yale-700"
                    />
                    <span>Replace Existing</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="presetMode"
                      checked={!presetOverwrite}
                      onChange={() => setPresetOverwrite(false)}
                      className="accent-yale-700"
                    />
                    <span>Append to Current</span>
                  </label>
                </div>
              </div>

              {/* Presets List */}
              <div className="space-y-3 overflow-y-auto py-4 flex-1 pr-1">
                {COMPETITION_PRESETS.map((preset, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-slate-200 rounded-2xl hover:border-yale-600 hover:bg-slate-50/70 transition-all cursor-pointer group"
                    onClick={() => handleApplyPreset(preset)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {preset.badge}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-yale-700 transition-colors">
                          {preset.name}
                        </h4>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-yale-700 transition-colors" />
                    </div>

                    <p className="text-[11px] text-slate-500 mt-1">{preset.description}</p>

                    {/* Segments Preview */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {preset.segments.map((s, sIdx) => (
                        <span key={sIdx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                          #{s.order_number} {s.portion_name} <strong className="text-yale-700">({s.percentage}%)</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {applyingPreset && (
                <div className="p-3 bg-yale-50 border border-yale-200 rounded-xl text-xs font-semibold text-yale-800 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-yale-700" />
                  <span>Applying template proceedings and criteria rubrics to database...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: ADD / EDIT PAGEANT SEGMENT */}
        {/* ========================================================================= */}
        {showPortionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setShowPortionModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Layers className="w-4 h-4 text-yale-700" />
                <span>{editingPortion ? 'Edit Pageant Segment' : 'Add Pageant Segment'}</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Define the proceeding title, sequence order, weight percentage, and scope notes.
              </p>

              <form onSubmit={handleSavePortion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Segment Name / Proceeding Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Swimwear Competition, Evening Gown, Final Q&A"
                    value={portionForm.portion_name}
                    onChange={(e) => setPortionForm({ ...portionForm, portion_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description / Evaluation Scope (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Evaluates runway poise, physical tone, and confidence"
                    value={portionForm.description}
                    onChange={(e) => setPortionForm({ ...portionForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
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
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-mono font-bold"
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
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Segment Status</label>
                  <select
                    value={portionForm.status}
                    onChange={(e) => setPortionForm({ ...portionForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  >
                    <option value="Upcoming">⏳ Upcoming</option>
                    <option value="Ongoing">🔴 Ongoing / Live Judging</option>
                    <option value="Completed">🔒 Completed / Locked</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPortionModal(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-xl shadow-xs"
                  >
                    {editingPortion ? 'Save Changes' : 'Create Segment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: ADD / EDIT CRITERIA RUBRIC ITEM */}
        {/* ========================================================================= */}
        {showCriteriaModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
              <button
                onClick={() => setShowCriteriaModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-yale-700" />
                <span>{editingCriteria ? 'Edit Criteria Item' : 'Add Scoring Criteria Rubric'}</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Define the rubric title, evaluation instructions, maximum raw points, and weight percentage.
              </p>

              <form onSubmit={handleSaveCriteria} className="space-y-4">
                {isMultiSegment && portions.length > 0 && (
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
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-semibold"
                    >
                      {portions.map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.order_number} {p.portion_name} ({p.percentage}%)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Criteria Name / Rubric Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Poise & Bearing, Intelligence & Wit, Choreography"
                    value={criteriaForm.name}
                    onChange={(e) => setCriteriaForm({ ...criteriaForm, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Evaluation Guidelines / Rubric Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Evaluate carriage, confidence, rhythm, and eye contact on stage"
                    value={criteriaForm.description}
                    onChange={(e) => setCriteriaForm({ ...criteriaForm, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Max Raw Points
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={1000}
                      value={criteriaForm.max_score}
                      onChange={(e) => setCriteriaForm({ ...criteriaForm, max_score: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-mono font-bold"
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
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCriteriaModal(false)}
                    className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-xl shadow-xs"
                  >
                    {editingCriteria ? 'Save Changes' : 'Add Rubric'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: PRINTABLE OFFICIAL CRITERIA RUBRICS SHEET */}
        {/* ========================================================================= */}
        {showPrintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl w-full max-w-3xl p-6 sm:p-8 shadow-2xl relative max-h-[92vh] overflow-y-auto">
              <button
                onClick={() => setShowPrintModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Printable Header */}
              <div className="text-center pb-4 border-b border-slate-200 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Apayao State College • Tabulation &amp; Scoring System
                </span>
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                  Official Criteria &amp; Scoring Rubrics Sheet
                </h1>
                <p className="text-xs font-bold text-yale-700">
                  {selectedEvent?.name} [{selectedEvent?.type || 'Competition'}] • AY {selectedEvent?.academic_year || '2025-2026'}
                </p>
              </div>

              {/* Printable Body */}
              <div className="py-5 space-y-5">
                {isMultiSegment ? (
                  portions.map((portion) => {
                    const portionCriteria = criteriaList.filter(
                      (c) => Number(c.portion_id) === Number(portion.id)
                    );
                    return (
                      <div key={portion.id} className="border border-slate-200 rounded-xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg">
                          <div>
                            <span className="text-xs font-black text-slate-900">
                              Segment #{portion.order_number}: {portion.portion_name}
                            </span>
                            {portion.description && (
                              <p className="text-[11px] text-slate-500">{portion.description}</p>
                            )}
                          </div>
                          <span className="text-xs font-black text-yale-800 bg-yale-50 px-2.5 py-1 rounded-md border border-yale-200">
                            Weight: {portion.percentage}% of Grand Total
                          </span>
                        </div>

                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                              <th className="py-1.5">Rubric Title &amp; Guidelines</th>
                              <th className="py-1.5 text-center">Max Score</th>
                              <th className="py-1.5 text-right">Internal Weight</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {portionCriteria.map((c) => (
                              <tr key={c.id}>
                                <td className="py-2 pr-3">
                                  <strong className="text-slate-900">{c.name}</strong>
                                  {c.description && (
                                    <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>
                                  )}
                                </td>
                                <td className="py-2 text-center font-mono font-bold text-slate-700">{c.max_score} pts</td>
                                <td className="py-2 text-right font-mono font-bold text-yale-700">{c.percentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })
                ) : (
                  <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold">
                      <tr>
                        <th className="p-3">Rubric Title &amp; Guidelines</th>
                        <th className="p-3 text-center">Max Points</th>
                        <th className="p-3 text-right">Percentage Weight</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {criteriaList.map((c) => (
                        <tr key={c.id}>
                          <td className="p-3">
                            <strong className="text-slate-900">{c.name}</strong>
                            {c.description && <p className="text-[11px] text-slate-500 mt-0.5">{c.description}</p>}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-700">{c.max_score} pts</td>
                          <td className="p-3 text-right font-mono font-bold text-yale-700">{c.percentage}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {/* Signatory Footers */}
                <div className="grid grid-cols-3 gap-6 pt-8 mt-6 border-t border-slate-200 text-center text-xs">
                  <div>
                    <div className="border-b border-slate-400 pb-8 mb-1"></div>
                    <span className="font-bold text-slate-800 block">Event Organizer</span>
                    <span className="text-[10px] text-slate-500">Prepared by</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-8 mb-1"></div>
                    <span className="font-bold text-slate-800 block">Board of Tabulators</span>
                    <span className="text-[10px] text-slate-500">Audited &amp; Verified</span>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 pb-8 mb-1"></div>
                    <span className="font-bold text-slate-800 block">Chief Judge / Chairman</span>
                    <span className="text-[10px] text-slate-500">Official Approval</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-xl shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
              </div>
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
