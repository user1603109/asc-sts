'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import {
  Calendar,
  Users,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Search,
  Upload,
  UserCheck,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FolderPlus,
  Building,
  GraduationCap,
  Sparkles,
  Layers,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { Event, Candidate, Course, Department, EventType, Organizer, EventPortion, ParticipantRegistry } from '@/lib/types';

function EnlistmentContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'events';

  // Active Tab: 'events' or 'participants'
  const [activeTab, setActiveTab] = useState<'events' | 'participants'>(initialTab as any);

  // Data states
  const [events, setEvents] = useState<Event[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [registry, setRegistry] = useState<ParticipantRegistry[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [judgesList, setJudgesList] = useState<any[]>([]);

  // Search & selection states
  const [eventSearch, setEventSearch] = useState('');
  const [registrySearch, setRegistrySearch] = useState('');
  const [selectedRegistryIds, setSelectedRegistryIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [candidateTargetEventId, setCandidateTargetEventId] = useState<number | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);

  const [showRosterSyncModal, setShowRosterSyncModal] = useState(false);
  const [syncEventId, setSyncEventId] = useState<number | null>(null);
  const [syncSelectedIds, setSyncSelectedIds] = useState<number[]>([]);

  const [showPortionsModal, setShowPortionsModal] = useState(false);
  const [portionEventId, setPortionEventId] = useState<number | null>(null);
  const [portionsList, setPortionsList] = useState<EventPortion[]>([]);

  const [showAssignJudgesModal, setShowAssignJudgesModal] = useState(false);
  const [assignEventId, setAssignEventId] = useState<number | null>(null);
  const [assignedJudgeIds, setAssignedJudgeIds] = useState<number[]>([]);

  const [showParticipantModal, setShowParticipantModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<ParticipantRegistry | null>(null);

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');

  const [showMetaModal, setShowMetaModal] = useState<'types' | 'departments' | 'courses' | 'organizers' | null>(null);

  // Form states
  const [eventForm, setEventForm] = useState({
    name: '',
    description: '',
    type: 'Pageant',
    participation_mode: 'Individual',
    department: '',
    organizer: '',
    academic_year: '2025-2026',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    status: 'Upcoming',
    setup_pageant_preset: true,
  });

  const [candidateForm, setCandidateForm] = useState({
    name: '',
    course_id: '',
    year_level: '1st Year',
    order_number: 1,
    image_path: '',
  });

  const [participantForm, setParticipantForm] = useState({
    name: '',
    course_id: '',
    year_level: '1st Year',
    image_path: '',
  });

  const [portionForm, setPortionForm] = useState({
    portion_name: '',
    percentage: 25,
    order_number: 1,
    status: 'Upcoming',
  });

  // Fetch all initial data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [evRes, candRes, regRes, crsRes, deptRes, typeRes, orgRes, judRes] = await Promise.all([
        fetch('/api/events').then((r) => r.json()),
        fetch('/api/candidates').then((r) => r.json()),
        fetch('/api/participants').then((r) => r.json()),
        fetch('/api/courses').then((r) => r.json()),
        fetch('/api/departments').then((r) => r.json()),
        fetch('/api/event-types').then((r) => r.json()),
        fetch('/api/organizers').then((r) => r.json()),
        fetch('/api/judges').then((r) => r.json()),
      ]);

      if (Array.isArray(evRes)) setEvents(evRes);
      if (Array.isArray(candRes)) setCandidates(candRes);
      if (Array.isArray(regRes)) setRegistry(regRes);
      if (Array.isArray(crsRes)) setCourses(crsRes);
      if (Array.isArray(deptRes)) setDepartments(deptRes);
      if (Array.isArray(typeRes)) setEventTypes(typeRes);
      if (Array.isArray(orgRes)) setOrganizers(orgRes);
      if (Array.isArray(judRes)) setJudgesList(judRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // --- EVENT HANDLERS ---
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await fetch('/api/events', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingEvent.id, ...eventForm }),
        });
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventForm),
        });
        const created = await res.json();

        // If pageant preset checked, auto-create the 4 standard portions
        if (eventForm.setup_pageant_preset && created.event?.id) {
          const presets = [
            { portion_name: 'Personal Interview', percentage: 25, order_number: 1 },
            { portion_name: 'Swimsuit / Fitness Attire', percentage: 25, order_number: 2 },
            { portion_name: 'Evening Gown / Formal Wear', percentage: 25, order_number: 3 },
            { portion_name: 'Final Question & Answer', percentage: 25, order_number: 4 },
          ];
          for (const p of presets) {
            await fetch('/api/event-portions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event_id: created.event.id, ...p }),
            });
          }
        }
      }
      setShowEventModal(false);
      setEditingEvent(null);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Are you sure you want to delete this competition? All scores and candidate assignments will be removed.')) return;
    try {
      await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- CANDIDATE & ROSTER SYNC HANDLERS ---
  const handleOpenRosterSync = (eventId: number) => {
    setSyncEventId(eventId);
    const existingCands = candidates.filter((c) => Number(c.event_id) === Number(eventId));
    const currentRegIds = existingCands.map((c) => Number(c.registry_id)).filter(Boolean);
    setSyncSelectedIds(currentRegIds);
    setShowRosterSyncModal(true);
  };

  const handleSaveRosterSync = async () => {
    if (!syncEventId) return;
    try {
      await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_roster',
          event_id: syncEventId,
          registry_ids: syncSelectedIds,
        }),
      });
      setShowRosterSyncModal(false);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateTargetEventId) return;
    try {
      if (editingCandidate) {
        await fetch('/api/candidates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCandidate.id, ...candidateForm }),
        });
      } else {
        await fetch('/api/candidates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event_id: candidateTargetEventId, ...candidateForm }),
        });
      }
      setShowCandidateModal(false);
      setEditingCandidate(null);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCandidate = async (id: number) => {
    if (!confirm('Remove this candidate from the event?')) return;
    try {
      await fetch(`/api/candidates?id=${id}`, { method: 'DELETE' });
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- PORTIONS HANDLERS ---
  const handleOpenPortions = async (eventId: number) => {
    setPortionEventId(eventId);
    const res = await fetch(`/api/event-portions?eventId=${eventId}`);
    const data = await res.json();
    if (Array.isArray(data)) setPortionsList(data);
    setShowPortionsModal(true);
  };

  const handleAddPortion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portionEventId) return;
    try {
      await fetch('/api/event-portions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: portionEventId, ...portionForm }),
      });
      setPortionForm({ portion_name: '', percentage: 25, order_number: portionsList.length + 2, status: 'Upcoming' });
      const res = await fetch(`/api/event-portions?eventId=${portionEventId}`);
      const data = await res.json();
      if (Array.isArray(data)) setPortionsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePortion = async (id: number) => {
    try {
      await fetch(`/api/event-portions?id=${id}`, { method: 'DELETE' });
      if (portionEventId) {
        const res = await fetch(`/api/event-portions?eventId=${portionEventId}`);
        const data = await res.json();
        if (Array.isArray(data)) setPortionsList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // --- ASSIGN JUDGES HANDLERS ---
  const handleOpenAssignJudges = async (eventId: number) => {
    setAssignEventId(eventId);
    const res = await fetch(`/api/event-judges?eventId=${eventId}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      setAssignedJudgeIds(data.map((ej) => Number(ej.user_id)));
    }
    setShowAssignJudgesModal(true);
  };

  const handleSaveAssignedJudges = async () => {
    if (!assignEventId) return;
    try {
      await fetch('/api/event-judges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: assignEventId, judge_ids: assignedJudgeIds }),
      });
      setShowAssignJudgesModal(false);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  // --- PARTICIPANTS REGISTRY HANDLERS ---
  const handleSaveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingParticipant) {
        await fetch('/api/participants', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingParticipant.id, ...participantForm }),
        });
      } else {
        await fetch('/api/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(participantForm),
        });
      }
      setShowParticipantModal(false);
      setEditingParticipant(null);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteParticipant = async (id: number) => {
    if (!confirm('Delete participant from registry?')) return;
    try {
      await fetch(`/api/participants?id=${id}`, { method: 'DELETE' });
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBulkDeleteParticipants = async () => {
    if (selectedRegistryIds.length === 0) return;
    if (!confirm(`Permanently delete ${selectedRegistryIds.length} selected participant(s)?`)) return;
    try {
      await fetch(`/api/participants?ids=${selectedRegistryIds.join(',')}`, { method: 'DELETE' });
      setSelectedRegistryIds([]);
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportCsv = async () => {
    if (!csvText.trim()) return;
    try {
      const lines = csvText.trim().split('\n');
      const rowsToInsert = [];
      for (const line of lines) {
        const parts = line.split(',').map((p) => p.trim());
        if (parts[0]) {
          const matchedCourse = courses.find((c) => c.course_name.toLowerCase().includes(parts[1]?.toLowerCase() || ''));
          rowsToInsert.push({
            name: parts[0],
            course_id: matchedCourse ? matchedCourse.id : null,
            year_level: parts[2] || '1st Year',
            image_path: parts[3] || '',
          });
        }
      }

      await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rowsToInsert),
      });

      setShowCsvModal(false);
      setCsvText('');
      loadAllData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppLayout
      pageTitle="Enlistment Studio & Institutional Registry"
      pageSubtitle="Complete competition management: event definitions, portions, judge assignments, and student roster"
    >
      <div className="space-y-6">
        {/* TABS NAVIGATION MATCHING ASTS/admin/enlistment.php */}
        <div className="flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('events')}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'events'
                  ? 'border-yale-700 text-yale-800 bg-yale-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Events Management ({events.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('participants')}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'participants'
                  ? 'border-yale-700 text-yale-800 bg-yale-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Participants Registry ({registry.length})</span>
            </button>
          </div>

          {/* Quick Meta Configuration Dropdowns */}
          <div className="hidden md:flex items-center gap-2 pb-2">
            <button
              onClick={() => setShowMetaModal('departments')}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Departments
            </button>
            <button
              onClick={() => setShowMetaModal('courses')}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Courses
            </button>
            <button
              onClick={() => setShowMetaModal('types')}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Event Types
            </button>
            <button
              onClick={() => setShowMetaModal('organizers')}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
            >
              Organizers
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: EVENTS PANE (MATCHING ASTS #events_pane) */}
        {/* ========================================================================= */}
        {activeTab === 'events' && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={eventSearch}
                  onChange={(e) => setEventSearch(e.target.value)}
                  placeholder="Search events by title, department, or type..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadAllData}
                  disabled={loading}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Reload data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => {
                    setEditingEvent(null);
                    setEventForm({
                      name: '',
                      description: '',
                      type: eventTypes[0]?.type_name || 'Pageant',
                      participation_mode: 'Individual',
                      department: departments[0]?.department_name || '',
                      organizer: organizers[0]?.organizer_name || '',
                      academic_year: '2025-2026',
                      start_date: new Date().toISOString().split('T')[0],
                      end_date: new Date().toISOString().split('T')[0],
                      status: 'Upcoming',
                      setup_pageant_preset: true,
                    });
                    setShowEventModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Event</span>
                </button>
              </div>
            </div>

            {/* Events Table Card */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading events...</div>
              ) : events.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">No events created yet. Click "Create New Event" above to get started.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Event Details</th>
                        <th className="py-3 px-4">Type & Mode</th>
                        <th className="py-3 px-4">Schedule</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Enrolled Contenders</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {events
                        .filter(
                          (ev) =>
                            ev.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
                            (ev.type && ev.type.toLowerCase().includes(eventSearch.toLowerCase())) ||
                            (ev.department && ev.department.toLowerCase().includes(eventSearch.toLowerCase()))
                        )
                        .map((ev) => {
                          const candCount = candidates.filter((c) => Number(c.event_id) === Number(ev.id)).length;
                          return (
                            <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4">
                                <p className="font-bold text-slate-900">{ev.name}</p>
                                <p className="text-[11px] text-slate-400">{ev.department || 'All Departments'} • {ev.academic_year || '2025-2026'}</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                  {ev.type || 'Standard'}
                                </span>
                                <p className="text-[10px] text-slate-400 mt-0.5">{ev.participation_mode || 'Individual'}</p>
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                                {ev.start_date} {ev.end_date && ev.end_date !== ev.start_date ? `to ${ev.end_date}` : ''}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                    ev.status === 'Ongoing'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : ev.status === 'Tabulating'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : ev.status === 'Completed'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {ev.status || 'Upcoming'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-slate-800">{candCount}</span>
                                <span className="text-slate-400 text-[11px]"> contestants</span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  {/* Roster Sync Button */}
                                  <button
                                    onClick={() => handleOpenRosterSync(ev.id)}
                                    className="p-1.5 rounded-md text-yale-700 hover:bg-yale-50 transition-colors cursor-pointer"
                                    title="Sync Roster from Master Registry"
                                  >
                                    <Users className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Manage Portions Button */}
                                  <button
                                    onClick={() => handleOpenPortions(ev.id)}
                                    className="p-1.5 rounded-md text-gold-700 hover:bg-gold-50 transition-colors cursor-pointer"
                                    title="Manage Portions & Segments"
                                  >
                                    <Sliders className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Assign Judges Button */}
                                  <button
                                    onClick={() => handleOpenAssignJudges(ev.id)}
                                    className="p-1.5 rounded-md text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
                                    title="Assign Judges"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Edit Event Button */}
                                  <button
                                    onClick={() => {
                                      setEditingEvent(ev);
                                      setEventForm({
                                        name: ev.name,
                                        description: ev.description || '',
                                        type: ev.type || 'Pageant',
                                        participation_mode: ev.participation_mode || 'Individual',
                                        department: ev.department || '',
                                        organizer: ev.organizer || '',
                                        academic_year: ev.academic_year || '2025-2026',
                                        start_date: ev.start_date || '',
                                        end_date: ev.end_date || '',
                                        status: ev.status || 'Upcoming',
                                        setup_pageant_preset: false,
                                      });
                                      setShowEventModal(true);
                                    }}
                                    className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Edit Event Settings"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Delete Event Button */}
                                  <button
                                    onClick={() => handleDeleteEvent(ev.id)}
                                    className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Delete Event"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PARTICIPANTS REGISTRY (MATCHING ASTS #participants_pane) */}
        {/* ========================================================================= */}
        {activeTab === 'participants' && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={registrySearch}
                  onChange={(e) => setRegistrySearch(e.target.value)}
                  placeholder="Search registered students by name or course..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2">
                {selectedRegistryIds.length > 0 && (
                  <button
                    onClick={handleBulkDeleteParticipants}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedRegistryIds.length})</span>
                  </button>
                )}

                <button
                  onClick={() => setShowCsvModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Import CSV</span>
                </button>

                <button
                  onClick={() => {
                    setEditingParticipant(null);
                    setParticipantForm({
                      name: '',
                      course_id: courses[0]?.id ? String(courses[0].id) : '',
                      year_level: '1st Year',
                      image_path: '',
                    });
                    setShowParticipantModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Participant</span>
                </button>
              </div>
            </div>

            {/* Registry Table Card */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
              {loading ? (
                <div className="p-12 text-center text-xs text-slate-400">Loading master registry...</div>
              ) : registry.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No students in the registry. Use "+ Add Participant" or "Import CSV" to upload candidates.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedRegistryIds.length === registry.length && registry.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedRegistryIds(registry.map((r) => r.id));
                              else setSelectedRegistryIds([]);
                            }}
                            className="rounded border-slate-300 text-yale-700 focus:ring-yale-600"
                          />
                        </th>
                        <th className="py-3 px-4">Student Contender</th>
                        <th className="py-3 px-4">Course Program</th>
                        <th className="py-3 px-4">Year Level</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {registry
                        .filter(
                          (p) =>
                            p.name.toLowerCase().includes(registrySearch.toLowerCase()) ||
                            (p.course_name && p.course_name.toLowerCase().includes(registrySearch.toLowerCase()))
                        )
                        .map((p) => {
                          const isSelected = selectedRegistryIds.includes(p.id);
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedRegistryIds([...selectedRegistryIds, p.id]);
                                    } else {
                                      setSelectedRegistryIds(selectedRegistryIds.filter((id) => id !== p.id));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-yale-700 focus:ring-yale-600"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs shrink-0">
                                    {p.image_path ? (
                                      <img src={p.image_path} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                      p.name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <span className="font-bold text-slate-900">{p.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-700 font-medium">
                                {p.course_name || 'General Program'}
                              </td>
                              <td className="py-3 px-4 text-slate-500">
                                {p.year_level || '1st Year'}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingParticipant(p);
                                      setParticipantForm({
                                        name: p.name,
                                        course_id: p.course_id ? String(p.course_id) : '',
                                        year_level: p.year_level || '1st Year',
                                        image_path: p.image_path || '',
                                      });
                                      setShowParticipantModal(true);
                                    }}
                                    className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                                    title="Edit Student"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteParticipant(p.id)}
                                    className="p-1.5 rounded-md text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Delete Student"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: ADD / EDIT EVENT */}
        {/* ========================================================================= */}
        {showEventModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowEventModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                {editingEvent ? 'Edit Event Details' : 'Create New Competition'}
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Define the institutional event properties, schedule, and participation mode
              </p>

              <form onSubmit={handleSaveEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Competition Name</label>
                  <input
                    type="text"
                    required
                    value={eventForm.name}
                    onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                    placeholder="e.g. Mr. & Ms. ASC 2026"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
                    <select
                      value={eventForm.type}
                      onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                    >
                      {eventTypes.map((t) => (
                        <option key={t.id} value={t.type_name}>{t.type_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Participation Mode</label>
                    <select
                      value={eventForm.participation_mode}
                      onChange={(e) => setEventForm({ ...eventForm, participation_mode: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                    >
                      <option value="Individual">Individual</option>
                      <option value="Group / Team">Group / Team</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                    <select
                      value={eventForm.department}
                      onChange={(e) => setEventForm({ ...eventForm, department: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                    >
                      <option value="">General / All Campus</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.department_name}>{d.department_name} ({d.department_code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
                    <input
                      type="text"
                      value={eventForm.academic_year}
                      onChange={(e) => setEventForm({ ...eventForm, academic_year: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={eventForm.start_date}
                      onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={eventForm.end_date}
                      onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={eventForm.status}
                    onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Tabulating">Tabulating</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {!editingEvent && (
                  <div className="p-3 bg-yale-50/60 border border-yale-200 rounded-xl flex items-center gap-2 text-xs text-yale-900">
                    <input
                      type="checkbox"
                      id="presetCheck"
                      checked={eventForm.setup_pageant_preset}
                      onChange={(e) => setEventForm({ ...eventForm, setup_pageant_preset: e.target.checked })}
                      className="rounded border-yale-300 text-yale-700"
                    />
                    <label htmlFor="presetCheck" className="cursor-pointer font-medium">
                      Auto-seed standard 4 Pageant Portions (Interview, Swimsuit, Gown, Q&A)
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    {editingEvent ? 'Save Changes' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: ROSTER SYNC FROM MASTER REGISTRY */}
        {/* ========================================================================= */}
        {showRosterSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl relative max-h-[90vh] flex flex-col">
              <button
                onClick={() => setShowRosterSyncModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Sync Event Contenders from Registry
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Select registered students to enroll as official contestants for this competition.
              </p>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                {registry.map((p) => {
                  const checked = syncSelectedIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        checked ? 'bg-yale-50 border-yale-200 text-yale-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setSyncSelectedIds([...syncSelectedIds, p.id]);
                          else setSyncSelectedIds(syncSelectedIds.filter((id) => id !== p.id));
                        }}
                        className="rounded border-slate-300 text-yale-700 focus:ring-yale-600"
                      />
                      <span className="flex-1">{p.name}</span>
                      <span className="text-[11px] text-slate-400 font-normal">{p.course_name}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  {syncSelectedIds.length} candidate(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRosterSyncModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRosterSync}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    Sync Selected Roster
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: EVENT PORTIONS / SEGMENTS */}
        {/* ========================================================================= */}
        {showPortionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowPortionsModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Event Portions & Segment Weights
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Define the competition rounds, their percentage weights, and display sequence
              </p>

              {/* Existing Portions List */}
              <div className="space-y-2 mb-5">
                {portionsList.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No custom portions added yet.</p>
                ) : (
                  portionsList.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{p.portion_name}</span>
                        <span className="text-[11px] text-slate-400 ml-2">Order #{p.order_number}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold font-mono text-yale-700">{p.percentage}%</span>
                        <button
                          onClick={() => handleDeletePortion(p.id)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Portion Form */}
              <form onSubmit={handleAddPortion} className="pt-3 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Add New Portion</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Talent Portion"
                      value={portionForm.portion_name}
                      onChange={(e) => setPortionForm({ ...portionForm, portion_name: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      required
                      placeholder="Weight %"
                      value={portionForm.percentage}
                      onChange={(e) => setPortionForm({ ...portionForm, percentage: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm"
                >
                  Add Portion Round
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: ASSIGN JUDGES */}
        {/* ========================================================================= */}
        {showAssignJudgesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative max-h-[90vh] flex flex-col">
              <button
                onClick={() => setShowAssignJudgesModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Assign Accredited Judges
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Select accredited judges authorized to evaluate this competition
              </p>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                {judgesList.map((j) => {
                  const checked = assignedJudgeIds.includes(j.id);
                  return (
                    <label
                      key={j.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        checked ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold' : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setAssignedJudgeIds([...assignedJudgeIds, j.id]);
                          else setAssignedJudgeIds(assignedJudgeIds.filter((id) => id !== j.id));
                        }}
                        className="rounded border-slate-300 text-indigo-700 focus:ring-indigo-600"
                      />
                      <span className="flex-1">{j.full_name || j.username}</span>
                      <span className="text-[10px] text-slate-400">@{j.username}</span>
                    </label>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  {assignedJudgeIds.length} judge(s) assigned
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowAssignJudgesModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssignedJudges}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm"
                  >
                    Save Assignments
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 5: ADD / EDIT PARTICIPANT IN REGISTRY */}
        {/* ========================================================================= */}
        {showParticipantModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative">
              <button
                onClick={() => setShowParticipantModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                {editingParticipant ? 'Edit Registered Student' : 'Add Student to Registry'}
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Record student details into the institutional master registry
              </p>

              <form onSubmit={handleSaveParticipant} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={participantForm.name}
                    onChange={(e) => setParticipantForm({ ...participantForm, name: e.target.value })}
                    placeholder="e.g. Maria Santos"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Program</label>
                  <select
                    value={participantForm.course_id}
                    onChange={(e) => setParticipantForm({ ...participantForm, course_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.course_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Year Level</label>
                  <select
                    value={participantForm.year_level}
                    onChange={(e) => setParticipantForm({ ...participantForm, year_level: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Photo Image URL</label>
                  <input
                    type="text"
                    value={participantForm.image_path}
                    onChange={(e) => setParticipantForm({ ...participantForm, image_path: e.target.value })}
                    placeholder="https://... or Google Drive URL"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowParticipantModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    Save Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 6: CSV IMPORTER */}
        {/* ========================================================================= */}
        {showCsvModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-xl relative">
              <button
                onClick={() => setShowCsvModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Import Contestants from CSV
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Paste comma-separated rows. Format: <span className="font-mono text-slate-700">Full Name, Course Name, Year Level, Image URL</span>
              </p>

              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Juan Dela Cruz, Bachelor in Information Technology, 3rd Year, https://...&#10;Maria Santos, Bachelor of Secondary Education, 2nd Year, https://..."
                className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-yale-600 focus:bg-white"
              />

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCsvModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportCsv}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
                >
                  Upload & Parse CSV
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function AdminEnlistmentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading Enlistment Studio...</div>}>
      <EnlistmentContent />
    </Suspense>
  );
}
