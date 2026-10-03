'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import {
  Printer,
  Download,
  RefreshCw,
  Trophy,
  Award,
  ShieldCheck,
  CheckCircle2,
  Settings,
  Building,
  Layers,
  Calendar,
  Users,
  UserCheck,
  Search,
  X,
} from 'lucide-react';
import { Event, Department, Course, ParticipantRegistry } from '@/lib/types';
import { TabulationResult } from '@/lib/tabulation';

export default function AdminReportsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [eventSearch, setEventSearch] = useState('');
  const [activeReportTab, setActiveReportTab] = useState<'enlistment' | 'registry' | 'rankings' | 'engagement'>('rankings');

  // Data collections
  const [participants, setParticipants] = useState<ParticipantRegistry[]>([]);
  const [judges, setJudges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);

  const [tabData, setTabData] = useState<{
    event: Event;
    portions: any[];
    criteria: any[];
    judges: any[];
    tabulations: TabulationResult[];
  } | null>(null);

  const [loading, setLoading] = useState(false);

  // Customize Signatories Modal state
  const [showSignatoriesModal, setShowSignatoriesModal] = useState(false);
  const [signatories, setSignatories] = useState({
    tabulatorName: 'ENGR. JOHN DOE, MIT',
    tabulatorTitle: 'Chief Institutional Tabulator',
    chairmanName: 'DR. JANE SMITH, EdD',
    chairmanTitle: 'Chairman, Board of Judges',
    coordinatorName: 'MR. DON JOHN FRONDA',
    coordinatorTitle: 'Socio-Cultural Coordinator',
    showNoted: true,
    presidentName: 'DR. EMMANUEL P. PATTAGUAN',
    presidentTitle: 'College President',
  });

  // Initial load of reference datasets
  useEffect(() => {
    Promise.all([
      fetch('/api/events').then((r) => r.json()),
      fetch('/api/participants').then((r) => r.json()),
      fetch('/api/judges').then((r) => r.json()),
      fetch('/api/departments').then((r) => r.json()),
      fetch('/api/courses').then((r) => r.json()),
      fetch('/api/candidates').then((r) => r.json()),
    ]).then(([eventsData, partsData, judgesData, deptsData, coursesData, candsData]) => {
      if (Array.isArray(eventsData) && eventsData.length > 0) {
        setEvents(eventsData);
        setSelectedEventId(String(eventsData[0].id));
      }
      if (Array.isArray(partsData)) setParticipants(partsData);
      if (Array.isArray(judgesData)) setJudges(judgesData);
      if (Array.isArray(deptsData)) setDepartments(deptsData);
      if (Array.isArray(coursesData)) setCourses(coursesData);
      if (Array.isArray(candsData)) setCandidates(candsData);
    });
  }, []);

  const loadTabData = async () => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tabulation?eventId=${selectedEventId}`);
      const data = await res.json();
      setTabData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData();
  }, [selectedEventId]);

  // Export current active report to CSV
  const handleExportCsv = () => {
    let rows: string[][] = [];
    let filename = `ASC_STS_Report_${activeReportTab}_${new Date().toISOString().split('T')[0]}`;

    if (activeReportTab === 'enlistment') {
      rows.push(['Event ID', 'Competition Name', 'Category', 'Mode', 'Department', 'Academic Year', 'Schedule', 'Contenders', 'Status']);
      events.forEach((e) => {
        const count = candidates.filter((c) => Number(c.event_id) === Number(e.id)).length;
        rows.push([
          String(e.id),
          e.name,
          e.type || 'General',
          e.participation_mode || 'Individual',
          e.department || 'N/A',
          e.academic_year || '2025-2026',
          `${e.start_date || ''} - ${e.end_date || ''}`,
          String(count),
          e.status || 'Upcoming',
        ]);
      });
    } else if (activeReportTab === 'registry') {
      rows.push(['Record Type', 'ID', 'Name / Legal Name', 'Course / Program', 'Year Level / Username', 'Account / Enlistment Status']);
      participants.forEach((p) => {
        rows.push(['Participant', String(p.id), p.name, p.course_name || '', p.year_level || '', 'Registered']);
      });
      judges.forEach((j) => {
        rows.push(['Judge', String(j.id), j.full_name, 'Official Judge', `@${j.username}`, j.approval_status || 'approved']);
      });
    } else if (activeReportTab === 'rankings') {
      rows.push(['Rank', 'Contender No.', 'Contender Name', 'Course Program', 'Total Score']);
      (tabData?.tabulations || []).forEach((t) => {
        rows.push([
          String(t.rank),
          `#${t.candidate.order_number}`,
          t.candidate.name,
          t.candidate.course_name || '',
          t.totalScore.toFixed(2),
        ]);
      });
    } else if (activeReportTab === 'engagement') {
      rows.push(['Department Name', 'Code', 'Total Events', 'Completed Events', 'Total Candidates Fielded']);
      departments.forEach((d) => {
        const deptEvents = events.filter((e) => e.department?.toLowerCase() === d.department_name.toLowerCase());
        const deptCandidates = candidates.filter((c) => {
          const course = courses.find((co) => Number(co.id) === Number(c.course_id));
          return course && course.course_name.toLowerCase().includes((d.department_code || '').toLowerCase());
        });
        rows.push([
          d.department_name,
          d.department_code || '',
          String(deptEvents.length),
          String(deptEvents.filter((e) => e.status === 'Completed').length),
          String(deptCandidates.length),
        ]);
      });
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredEvents = events.filter((evt) =>
    evt.name.toLowerCase().includes(eventSearch.toLowerCase()) ||
    (evt.type && evt.type.toLowerCase().includes(eventSearch.toLowerCase()))
  );

  return (
    <AppLayout
      pageTitle="Certified Tabulation Certificates & Reports"
      pageSubtitle="Official institutional certified tabulation sheets, enlistment summaries, master registries, and department engagement reports"
    >
      <div className="space-y-6">
        {/* Controls Card */}
        <div className="no-print flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            {activeReportTab === 'rankings' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Event:</span>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-yale-600 focus:bg-white max-w-[280px] truncate"
                >
                  {filteredEvents.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.name} ({evt.status || 'Upcoming'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => setShowSignatoriesModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span>Signatories</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              title="Download CSV report"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Report</span>
            </button>
          </div>
        </div>

        {/* 4 INSTITUTIONAL REPORT TABS */}
        <div className="no-print flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveReportTab('enlistment')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeReportTab === 'enlistment'
                ? 'bg-yale-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>1. Event Enlistment Report</span>
          </button>
          <button
            onClick={() => setActiveReportTab('registry')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeReportTab === 'registry'
                ? 'bg-yale-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. Registry Report (Participants &amp; Judges)</span>
          </button>
          <button
            onClick={() => setActiveReportTab('rankings')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeReportTab === 'rankings'
                ? 'bg-yale-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>3. Ranking Reports</span>
          </button>
          <button
            onClick={() => setActiveReportTab('engagement')}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeReportTab === 'engagement'
                ? 'bg-yale-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>4. Department Engagement Report</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* PRINTABLE INSTITUTIONAL REPORT CANVAS */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-card print:border-none print:shadow-none print:p-0">
          {/* OFFICIAL INSTITUTIONAL HEADER */}
          <div className="text-center pb-6 mb-6 border-b-2 border-slate-900 flex flex-col items-center">
            <div className="flex items-center justify-center gap-4 mb-2">
              <img
                src="/api/logo"
                alt="ASC Logo"
                className="w-16 h-16 object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/assets/img/astslogo.png';
                }}
              />
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  Republic of the Philippines
                </p>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                  APAYAO STATE COLLEGE
                </h1>
                <p className="text-[11px] text-slate-600 font-medium">
                  Conner &amp; Luna Campuses • Cordillera Administrative Region
                </p>
                <p className="text-[10px] font-bold text-yale-700 uppercase tracking-widest mt-0.5">
                  Automated Scoring &amp; Tabulation System (ASC-STS)
                </p>
              </div>
            </div>

            <div className="mt-3 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 inline-block">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                {activeReportTab === 'enlistment' && 'Official Event Enlistment Report'}
                {activeReportTab === 'registry' && 'Official Institutional Registry Report (Participants & Judges)'}
                {activeReportTab === 'rankings' && 'Official Certified Competition Rankings'}
                {activeReportTab === 'engagement' && 'Official Department Engagement & Execution Report'}
              </span>
              {activeReportTab === 'rankings' && tabData?.event && (
                <span className="text-slate-500 text-xs ml-2 font-mono">
                  • {tabData.event.name}
                </span>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* REPORT 1: EVENT ENLISTMENT REPORT */}
          {/* ========================================================================= */}
          {activeReportTab === 'enlistment' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 border border-slate-700 w-12 text-center">#</th>
                      <th className="py-2.5 px-3 border border-slate-700">Competition Name</th>
                      <th className="py-2.5 px-3 border border-slate-700">Category</th>
                      <th className="py-2.5 px-3 border border-slate-700">Participation Mode</th>
                      <th className="py-2.5 px-3 border border-slate-700">Department / Unit</th>
                      <th className="py-2.5 px-3 border border-slate-700">Academic Year</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-center">Contenders</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {events.map((evt, idx) => {
                      const candCount = candidates.filter((c) => Number(c.event_id) === Number(evt.id)).length;
                      return (
                        <tr key={evt.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 font-bold text-slate-900">
                            {evt.name}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-slate-600">
                            {evt.type || 'General'}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-slate-600">
                            {evt.participation_mode || 'Individual'}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-slate-600">
                            {evt.department || 'All Departments'}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-slate-600 font-mono">
                            {evt.academic_year || '2025-2026'}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-bold text-slate-800">
                            {candCount}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center">
                            <span className="font-semibold text-[11px] text-slate-700">
                              {evt.status || 'Upcoming'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 2: REGISTRY REPORT (PARTICIPANTS & JUDGES) */}
          {/* ========================================================================= */}
          {activeReportTab === 'registry' && (
            <div className="space-y-8">
              {/* Section A: Participants Registry */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-yale-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Section A: Institutional Student Participants Registry ({participants.length} Registered)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2 px-3 border border-slate-700 w-16 text-center">Ref ID</th>
                        <th className="py-2 px-3 border border-slate-700">Participant Full Name</th>
                        <th className="py-2 px-3 border border-slate-700">Course / Degree Program</th>
                        <th className="py-2 px-3 border border-slate-700 w-28 text-center">Year Level</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {participants.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 border border-slate-200 text-center font-mono text-slate-400">
                            #{p.id}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 font-bold text-slate-900">
                            {p.name}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-slate-700">
                            {p.course_name || 'General Program'}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-center text-slate-600">
                            {p.year_level || '1st Year'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section B: Accredited Judges Roster */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck className="w-4 h-4 text-yale-700" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Section B: Board of Accredited Institutional Judges ({judges.length} Accredited)
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                      <tr>
                        <th className="py-2 px-3 border border-slate-700 w-16 text-center">Judge ID</th>
                        <th className="py-2 px-3 border border-slate-700">Official Judge Legal Name</th>
                        <th className="py-2 px-3 border border-slate-700">System Username</th>
                        <th className="py-2 px-3 border border-slate-700 text-center">Account Status</th>
                        <th className="py-2 px-3 border border-slate-700 text-center">Assigned Competitions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {judges.map((j) => (
                        <tr key={j.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 border border-slate-200 text-center font-mono text-slate-400">
                            #{j.id}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 font-bold text-slate-900">
                            {j.full_name}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 font-mono text-slate-600">
                            @{j.username}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-center font-semibold text-slate-700 capitalize">
                            {j.approval_status || 'Approved'}
                          </td>
                          <td className="py-2 px-3 border border-slate-200 text-center font-mono font-bold text-slate-800">
                            {(j.assignedEventIds || []).length} Event(s)
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 3: OFFICIAL RANKING REPORTS */}
          {/* ========================================================================= */}
          {activeReportTab === 'rankings' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 border border-slate-700 w-16 text-center">Rank</th>
                      <th className="py-2.5 px-3 border border-slate-700">Contender / Candidate</th>
                      <th className="py-2.5 px-3 border border-slate-700">Course / Department</th>
                      {tabData?.portions.map((p) => (
                        <th key={p.id} className="py-2.5 px-3 border border-slate-700 text-right">
                          {p.portion_name} ({p.percentage}%)
                        </th>
                      ))}
                      <th className="py-2.5 px-3 border border-slate-700 text-right font-black">
                        Total Score
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(tabData?.tabulations || []).map((res) => (
                      <tr key={res.candidate.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 border border-slate-200 text-center font-black">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              res.rank === 1
                                ? 'bg-amber-400 text-navy-950 shadow-xs'
                                : res.rank === 2
                                ? 'bg-slate-200 text-slate-800'
                                : res.rank === 3
                                ? 'bg-amber-800 text-white'
                                : 'text-slate-600'
                            }`}
                          >
                            {res.rank}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 border border-slate-200 font-bold text-slate-900">
                          #{res.candidate.order_number} {res.candidate.name}
                        </td>
                        <td className="py-2.5 px-3 border border-slate-200 text-slate-600">
                          {res.candidate.course_name || 'General Program'}
                        </td>
                        {tabData?.portions.map((p) => {
                          const pScore = (res.portionScores || res.portionBreakdown || []).find(
                            (ps: any) => Number(ps.portionId) === Number(p.id)
                          );
                          return (
                            <td key={p.id} className="py-2.5 px-3 border border-slate-200 text-right font-mono text-slate-700">
                              {pScore ? Number(pScore.weightedScore ?? pScore.portionTotal ?? 0).toFixed(2) : '0.00'}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 border border-slate-200 text-right font-black font-mono text-sm text-yale-800 bg-yale-50/40">
                          {res.totalScore.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* REPORT 4: DEPARTMENT ENGAGEMENT REPORT */}
          {/* ========================================================================= */}
          {activeReportTab === 'engagement' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 border border-slate-700 w-14 text-center">Rank</th>
                      <th className="py-2.5 px-3 border border-slate-700">Academic Department</th>
                      <th className="py-2.5 px-3 border border-slate-700 w-24 text-center">Code</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-center">Events Organized</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-center">Completed Events</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-center">Contenders Fielded</th>
                      <th className="py-2.5 px-3 border border-slate-700 text-right font-black">Engagement Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {departments.map((dept, idx) => {
                      const deptEvents = events.filter(
                        (e) => (e.department || '').toLowerCase() === dept.department_name.toLowerCase()
                      );
                      const completedCount = deptEvents.filter((e) => e.status === 'Completed').length;
                      const deptCandidates = candidates.filter((c) => {
                        const course = courses.find((co) => Number(co.id) === Number(c.course_id));
                        return (
                          course &&
                          dept.department_code &&
                          course.course_name.toLowerCase().includes(dept.department_code.toLowerCase())
                        );
                      });

                      return (
                        <tr key={dept.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 font-bold text-slate-900">
                            {dept.department_name}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-semibold text-slate-600">
                            {dept.department_code || 'DEPT'}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-bold text-slate-800">
                            {deptEvents.length}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono text-emerald-700 font-bold">
                            {completedCount}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-center font-mono font-bold text-yale-800">
                            {deptCandidates.length}
                          </td>
                          <td className="py-2.5 px-3 border border-slate-200 text-right">
                            <span className="font-semibold text-[11px] text-slate-700">
                              {deptEvents.length > 0 || deptCandidates.length > 0 ? 'Active Engaged' : 'Registered'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* OFFICIAL CERTIFICATION SIGNATORIES */}
          <div className="mt-12 pt-8 border-t border-slate-300">
            <p className="text-center text-[11px] text-slate-400 uppercase tracking-widest font-semibold mb-8">
              Certified Official &amp; Authenticated by the Board of Tabulators
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-56 mx-auto border-b-2 border-slate-900 pb-1 mb-1.5 font-bold text-slate-900 text-xs">
                  {signatories.tabulatorName}
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                  {signatories.tabulatorTitle}
                </p>
              </div>

              <div>
                <div className="w-56 mx-auto border-b-2 border-slate-900 pb-1 mb-1.5 font-bold text-slate-900 text-xs">
                  {signatories.chairmanName}
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                  {signatories.chairmanTitle}
                </p>
              </div>

              <div>
                <div className="w-56 mx-auto border-b-2 border-slate-900 pb-1 mb-1.5 font-bold text-slate-900 text-xs">
                  {signatories.coordinatorName}
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                  {signatories.coordinatorTitle}
                </p>
              </div>
            </div>

            {signatories.showNoted && (
              <div className="mt-8 text-center">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-4">
                  NOTED BY:
                </p>
                <div className="w-64 mx-auto border-b-2 border-slate-900 pb-1 mb-1.5 font-bold text-slate-900 text-xs">
                  {signatories.presidentName}
                </div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wider">
                  {signatories.presidentTitle}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CUSTOMIZE SIGNATORIES MODAL */}
        {showSignatoriesModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-xl relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setShowSignatoriesModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Settings className="w-4 h-4 text-yale-700" />
                <span>Customize Report Signatories</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Update the official certifying officers displayed on institutional reports
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Chief Tabulator Name</label>
                  <input
                    type="text"
                    value={signatories.tabulatorName}
                    onChange={(e) => setSignatories({ ...signatories, tabulatorName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                  <input
                    type="text"
                    value={signatories.tabulatorTitle}
                    onChange={(e) => setSignatories({ ...signatories, tabulatorTitle: e.target.value })}
                    placeholder="Title / Designation"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 mt-1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Board Chairman Name</label>
                  <input
                    type="text"
                    value={signatories.chairmanName}
                    onChange={(e) => setSignatories({ ...signatories, chairmanName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                  <input
                    type="text"
                    value={signatories.chairmanTitle}
                    onChange={(e) => setSignatories({ ...signatories, chairmanTitle: e.target.value })}
                    placeholder="Title / Designation"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 mt-1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Socio-Cultural Coordinator Name</label>
                  <input
                    type="text"
                    value={signatories.coordinatorName}
                    onChange={(e) => setSignatories({ ...signatories, coordinatorName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                  <input
                    type="text"
                    value={signatories.coordinatorTitle}
                    onChange={(e) => setSignatories({ ...signatories, coordinatorTitle: e.target.value })}
                    placeholder="Title / Designation"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 mt-1"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800">Include "Noted by" Signatory</label>
                    <input
                      type="checkbox"
                      checked={signatories.showNoted}
                      onChange={(e) => setSignatories({ ...signatories, showNoted: e.target.checked })}
                      className="rounded border-slate-300 text-yale-700"
                    />
                  </div>
                  {signatories.showNoted && (
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={signatories.presidentName}
                        onChange={(e) => setSignatories({ ...signatories, presidentName: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                      <input
                        type="text"
                        value={signatories.presidentTitle}
                        onChange={(e) => setSignatories({ ...signatories, presidentTitle: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => setShowSignatoriesModal(false)}
                    className="px-4 py-2 text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 rounded-lg shadow-sm"
                  >
                    Apply Signatories
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
