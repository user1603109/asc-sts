'use client';

import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import {
  BookOpen,
  Sliders,
  Scale,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ChevronRight,
  Search,
  Trophy,
  Users,
  Shield,
  FileText,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  Info,
  Calendar,
  Lock,
  Flame,
  Check,
  Percent,
  Copy,
} from 'lucide-react';

export default function AdminGuidePage() {
  const [activeSection, setActiveSection] = useState<'criteria' | 'workflow' | 'enlistment' | 'judges' | 'tabulation' | 'troubleshooting'>('criteria');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedFormula, setCopiedFormula] = useState(false);

  const handleCopyFormula = () => {
    navigator.clipboard.writeText('Final Score = Σ (Judge Criteria Raw Score / Max Points × Criteria Weight %) × Segment Weight %');
    setCopiedFormula(true);
    setTimeout(() => setCopiedFormula(false), 2000);
  };

  const navSections = [
    { id: 'criteria', label: 'Criteria Studio & Weights', icon: Sliders, badge: 'Primary' },
    { id: 'workflow', label: '5-Step Tabulation Cycle', icon: Trophy, badge: null },
    { id: 'enlistment', label: 'Enlistment & Registry', icon: Calendar, badge: null },
    { id: 'judges', label: 'Judges Roster & Scoring', icon: Users, badge: null },
    { id: 'tabulation', label: 'Tabulation & Rankings', icon: Scale, badge: null },
    { id: 'troubleshooting', label: 'Rules & Best Practices', icon: Shield, badge: null },
  ] as const;

  return (
    <AppLayout
      pageTitle="System Operations Manual & Guide"
      pageSubtitle="Comprehensive technical guidelines, workflows, and criteria management documentation for administrators and chief tabulators"
    >
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* TOP HERO BANNER */}
        <div className="bg-gradient-to-r from-[#060D17] via-[#0A192F] to-[#0F4C81] text-white rounded-3xl p-6 sm:p-8 shadow-card border border-white/10 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Official Institutional Handbook • ASTS 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              System Operations Manual: Tabulation &amp; Scoring Suite
            </h1>
            <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
              Step-by-step operational handbook for university tabulators, event chairpersons, and administrators. 
              Master competition proceedings, weighted scoring formulas, candidate enlistment, and judge console operations with zero error.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href="/admin/criteria"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-navy-950 font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                <Sliders className="w-4 h-4 text-navy-950" />
                <span>Open Criteria Studio</span>
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-300" />
                <span>Print Guide Binder</span>
              </button>
            </div>
          </div>

          <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none hidden md:block">
            <BookOpen className="w-80 h-80 text-white" />
          </div>
        </div>

        {/* NAVIGATION TABS & SEARCH */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-card flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
            {navSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSection(sec.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-yale-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                  <span>{sec.label}</span>
                  {sec.badge && (
                    <span className="text-[10px] bg-amber-400 text-navy-950 px-1.5 py-0.2 rounded-md font-black">
                      {sec.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-64 shrink-0">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search instructions..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-yale-600 focus:bg-white"
            />
          </div>
        </div>

        {/* SECTION 1: CRITERIA STUDIO & WEIGHTS (PRIMARY USER REQUEST FOCUS) */}
        {activeSection === 'criteria' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header Alert Box */}
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 text-amber-900 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 border border-amber-300/60 text-amber-700">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs">
                <h3 className="text-sm font-extrabold text-amber-950">
                  Criteria Management: Two Architectural Modes
                </h3>
                <p className="text-amber-800 leading-relaxed">
                  The ASTS Tabulation Engine automatically tailors criteria handling based on your competition type. 
                  Pageants receive a <strong>Dedicated Multi-Segment Proceedings Architecture</strong> (e.g., Swimwear, Evening Gown, Q&A rounds), 
                  while academic, athletic, and cultural competitions operate on a <strong>Direct Single-Stage Rubric</strong> with zero unnecessary segment clutter.
                </p>
              </div>
            </div>

            {/* Architecture Mode Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Card A: Pageantry Multi-Segment Proceedings */}
              <div className="bg-white border-2 border-yale-600/30 rounded-2xl p-6 shadow-card space-y-4 relative">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-yale-50 text-yale-700 flex items-center justify-center font-bold">
                      <Layers className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Dedicated Pageantry Mode</h4>
                      <p className="text-[11px] text-slate-400">Multi-Segment Proceedings Architecture</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-yale-50 text-yale-800 border border-yale-200">
                    Pageantry Only
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Designed for Miss ASC, Mr. &amp; Ms. Collegiate, and Cultural Queen pageants where proceedings happen in distinct physical phases on stage.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-yale-700 font-mono">1.</span>
                    <div>
                      <strong className="text-slate-800">Sequential Proceedings:</strong>
                      <span className="text-slate-500 block">Each segment has an order number (e.g., #1 Casual, #2 Swimwear, #3 Evening Gown, #4 Advocacy Q&amp;A).</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-yale-700 font-mono">2.</span>
                    <div>
                      <strong className="text-slate-800">Phase Weight Allocation:</strong>
                      <span className="text-slate-500 block">Each segment contributes a percentage of the Grand Total (e.g. 15% + 20% + 25% + 20% + 20% = 100%).</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-yale-700 font-mono">3.</span>
                    <div>
                      <strong className="text-slate-800">Phase Status Controller:</strong>
                      <span className="text-slate-500 block">Mark segments as <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">Upcoming</code>, <code className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded text-[10px]">Live Judging</code>, or <code className="bg-emerald-100 text-emerald-800 px-1 py-0.5 rounded text-[10px]">Locked</code> to control judge screen progression.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card B: Single-Stage Direct Rubric */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                      <Sliders className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Direct Single-Stage Mode</h4>
                      <p className="text-[11px] text-slate-400">Standard Collegiate Competition</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Standard Contests
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Engineered for cultural dance, singing contests, battle of the bands, speech tournaments, debates, and academic colloquiums.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-emerald-700 font-mono">1.</span>
                    <div>
                      <strong className="text-slate-800">Direct Rubric Evaluation:</strong>
                      <span className="text-slate-500 block">Criteria items apply directly to the final aggregate score without nested segment layers.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-emerald-700 font-mono">2.</span>
                    <div>
                      <strong className="text-slate-800">Transparent 100% Weight Sum:</strong>
                      <span className="text-slate-500 block">Criteria percentage weights directly total 100% (e.g. Choreography 35%, Execution 35%, Musicality 15%, Costume 15%).</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-bold text-emerald-700 font-mono">3.</span>
                    <div>
                      <strong className="text-slate-800">Clean Judge Console:</strong>
                      <span className="text-slate-500 block">Judges see all evaluation sliders at a single glance on their tablets or laptops.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* STEP-BY-STEP DETAILED INSTRUCTIONS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-6">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-yale-700 text-white flex items-center justify-center text-xs">
                  #
                </span>
                <span>Step-by-Step Instructions: Configuring Competition Rubrics</span>
              </h3>

              <div className="space-y-5">
                {/* Step 1 */}
                <div className="border border-slate-200 rounded-xl p-4.5 space-y-2 bg-slate-50/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-yale-700 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Select Target Competition from the Top Toolbar
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                    Navigate to <strong>Criteria &amp; Portions</strong> (<code className="bg-slate-200/80 px-1 py-0.5 rounded text-[11px]">/admin/criteria</code>). 
                    Use the event dropdown in the top toolbar to choose the competition you wish to configure. The system immediately loads existing criteria and detects whether the event is classified as a Pageant or Standard Competition.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="border border-slate-200 rounded-xl p-4.5 space-y-2 bg-slate-50/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-yale-700 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Option A: Apply an Institutional Preset (Fastest &amp; Recommended)
                    </h4>
                  </div>
                  <div className="pl-8 text-xs text-slate-600 space-y-2.5 leading-relaxed">
                    <p>
                      Click the <strong className="text-amber-800 bg-amber-100/70 px-1.5 py-0.5 rounded">Rubrics Presets</strong> button. 
                      ASTS includes pre-calibrated institutional rubrics adhering to national and university guidelines:
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-medium text-slate-700 pt-1">
                      <li className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>Vocal Solo / Singing:</strong> 40% Vocal, 20% Timing, 20% Diction, 20% Poise</span>
                      </li>
                      <li className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>Street Dance / Hip-Hop:</strong> 35% Choreography, 35% Sync, 15% Theme, 15% Energy</span>
                      </li>
                      <li className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>Cultural Folk Dance:</strong> 35% Authenticity, 35% Mastery, 15% Rhythm, 15% Costume</span>
                      </li>
                      <li className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>Extemporaneous Speech:</strong> 40% Substance, 30% Delivery, 20% Logic, 10% Poise</span>
                      </li>
                      <li className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span><strong>Academic Research:</strong> 40% Technical, 30% Methodology, 20% Defense, 10% Slides</span>
                      </li>
                      <li className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span><strong>Mutya / Mr. &amp; Ms. ASC:</strong> 5-Segment Master Pageantry Proceeding</span>
                      </li>
                    </ul>
                    <p className="text-[11px] text-slate-500 italic">
                      Choose <strong>"Replace Existing"</strong> to wipe any initial blank entries, or <strong>"Append"</strong> if combining rounds.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="border border-slate-200 rounded-xl p-4.5 space-y-2 bg-slate-50/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-yale-700 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Option B: Creating Custom Criteria &amp; Segments Manually
                    </h4>
                  </div>
                  <div className="pl-8 text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>If authoring custom rubrics from an institutional memo or event guidelines:</p>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                      <li>For <strong>Pageants</strong>: Click <strong>"Add Segment"</strong> to establish proceedings (e.g. Swimwear, 25%, Sequence #1). Once created, click <strong>"Add Rubric"</strong> inside that segment card.</li>
                      <li>For <strong>Standard Competitions</strong>: Click <strong>"Add Criteria Item"</strong> directly.</li>
                      <li>Input <strong>Criteria Name</strong> (e.g. <em>Vocal Quality &amp; Intonation</em>).</li>
                      <li>Set <strong>Max Raw Points</strong> (e.g. <code>100</code>). This defines the slider ceiling on judge devices.</li>
                      <li>Set <strong>Weight Percentage (%)</strong> (e.g. <code>40</code>).</li>
                      <li>Optionally add <strong>Evaluation Scope Notes</strong> to guide judges on specific deductions or focus points.</li>
                    </ol>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="border border-slate-200 rounded-xl p-4.5 space-y-2 bg-slate-50/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-yale-700 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      4
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      The 100% Balancing Rule &amp; Auto-Balance Tool
                    </h4>
                  </div>
                  <div className="pl-8 text-xs text-slate-600 space-y-2 leading-relaxed">
                    <p>
                      The ASTS Tabulation Engine mathematically enforces that all criteria weights must sum to exactly <strong>100%</strong>. 
                      If your criteria sum to 95% or 105%, the live meter displays an amber warning badge.
                    </p>
                    <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200">
                      <Scale className="w-4 h-4 text-yale-700 shrink-0" />
                      <span className="text-slate-800">
                        <strong>Instant Auto-Balance:</strong> Click the <strong>"Auto-Balance to 100%"</strong> button to mathematically distribute weights evenly among all items with zero rounding errors.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="border border-slate-200 rounded-xl p-4.5 space-y-2 bg-slate-50/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-yale-700 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      5
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Print Official Criteria Sheets for Pre-Event Sign-Off
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 pl-8 leading-relaxed">
                    Before judges take their seats, click <strong>"Official Sheet"</strong> in the top toolbar. 
                    This generates a standardized institutional criteria document featuring the college header, full rubric definitions, max point ceilings, percentage weights, and pre-formatted signatory blocks for the <em>Event Organizer</em>, <em>Board of Tabulators</em>, and <em>Chief Judge</em>.
                  </p>
                </div>
              </div>
            </div>

            {/* TABULATION MATHEMATICS EXPLANATION */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-amber-400">
                    <Percent className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white">Mathematical Scoring Formula</h4>
                    <p className="text-[11px] text-slate-400">How judge raw scores translate into official aggregate percentages</p>
                  </div>
                </div>
                <button
                  onClick={handleCopyFormula}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {copiedFormula ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
                  <span>{copiedFormula ? 'Formula Copied' : 'Copy Formula'}</span>
                </button>
              </div>

              <div className="bg-black/40 p-4 rounded-xl font-mono text-xs text-amber-300 border border-white/10 overflow-x-auto">
                Candidate Final Score = Σ [ (Judge Raw Score / Max Points) × Criteria Weight % ] × Segment Phase Weight %
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300 pt-1">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <strong className="text-white block mb-0.5">1. Raw Score Normalization</strong>
                  Raw points are normalized against the rubric maximum to prevent scaling bias across judges.
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <strong className="text-white block mb-0.5">2. Internal Criteria Weighting</strong>
                  Each rubric contributes proportionally to the segment or event total based on its defined percentage.
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <strong className="text-white block mb-0.5">3. Multi-Judge Aggregation</strong>
                  Final aggregate scores are averaged across all submitted accredited judges, rounded to 2 decimal places.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: 5-STEP TABULATION CYCLE */}
        {activeSection === 'workflow' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  The Complete 5-Stage Tournament Workflow
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Follow this chronological lifecycle to administer collegiate competitions seamlessly from creation to awarding.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* Stage 1 */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="w-7 h-7 rounded-lg bg-yale-700 text-white flex items-center justify-center font-bold text-xs">
                      1
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Event Enlistment</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Register competition title, date, venue, category (e.g. Pageant, Cultural Dance, Debate), and academic year.
                    </p>
                  </div>
                  <Link
                    href="/admin/enlistment"
                    className="text-[11px] font-bold text-yale-700 hover:text-yale-800 flex items-center gap-1 pt-2 border-t border-slate-200"
                  >
                    <span>Enlistment Console</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Stage 2 */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="w-7 h-7 rounded-lg bg-yale-700 text-white flex items-center justify-center font-bold text-xs">
                      2
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Roster &amp; Candidates</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Assign official candidate numbers, student profiles, colleges/departments, and headshots from the institutional registry.
                    </p>
                  </div>
                  <Link
                    href="/admin/enlistment?tab=events"
                    className="text-[11px] font-bold text-yale-700 hover:text-yale-800 flex items-center gap-1 pt-2 border-t border-slate-200"
                  >
                    <span>Manage Roster</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Stage 3 */}
                <div className="border border-amber-300 bg-amber-50/50 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-xs">
                  <div className="space-y-2">
                    <span className="w-7 h-7 rounded-lg bg-amber-500 text-navy-950 flex items-center justify-center font-black text-xs">
                      3
                    </span>
                    <h4 className="font-bold text-xs text-amber-950">Criteria &amp; Weights</h4>
                    <p className="text-[11px] text-amber-900 leading-relaxed">
                      Configure rubrics, point limits, and percentage distributions totaling 100%. Print official signed criteria sheets.
                    </p>
                  </div>
                  <Link
                    href="/admin/criteria"
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 pt-2 border-t border-amber-200"
                  >
                    <span>Criteria Studio</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Stage 4 */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="w-7 h-7 rounded-lg bg-yale-700 text-white flex items-center justify-center font-bold text-xs">
                      4
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Judges Accreditation</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Create judge user accounts, assign them to specific events, generate access PIN codes, and deliver credentials.
                    </p>
                  </div>
                  <Link
                    href="/admin/judges"
                    className="text-[11px] font-bold text-yale-700 hover:text-yale-800 flex items-center gap-1 pt-2 border-t border-slate-200"
                  >
                    <span>Judges Console</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {/* Stage 5 */}
                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <span className="w-7 h-7 rounded-lg bg-yale-700 text-white flex items-center justify-center font-bold text-xs">
                      5
                    </span>
                    <h4 className="font-bold text-xs text-slate-900">Live Tabulation &amp; Reports</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Monitor live scorecard submissions, verify matrix computations, break ties, and export certified ranking reports.
                    </p>
                  </div>
                  <Link
                    href="/admin/tabulation"
                    className="text-[11px] font-bold text-yale-700 hover:text-yale-800 flex items-center gap-1 pt-2 border-t border-slate-200"
                  >
                    <span>Tabulation Matrix</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: ENLISTMENT & REGISTRY */}
        {activeSection === 'enlistment' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-yale-700" />
                <span>Enlistment, Participant Registry &amp; Roster Management</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ASTS features a centralized <strong>Institutional Registry</strong>. 
                Instead of typing candidate details repeatedly across different events, candidates are registered once and can be quickly synced into any competition.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">Institutional Registry Tab</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Store master records including Student ID, Full Name, Department / College (e.g. College of Computing, College of Education), and High-Resolution Profile Headshots.
                  </p>
                </div>
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">1-Click Roster Sync</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Click <strong>"Sync Roster"</strong> on any competition card to select participants from the master registry and assign their official runway or stage numbers.
                  </p>
                </div>
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/70 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900">CSV Bulk Import</h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Import hundreds of participants from Excel or university registration spreadsheets using the built-in CSV parser format (<code className="text-[10px] bg-slate-200 px-1 py-0.5 rounded">ID, Name, Dept</code>).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: JUDGES ROSTER & SCORING PROTOCOL */}
        {activeSection === 'judges' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-yale-700" />
                <span>Judges Accreditation, Access Credentials &amp; Console</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                ASTS provides a touch-friendly, real-time tablet interface for judges. Judges sign in via <code className="bg-slate-200 px-1.5 py-0.5 rounded text-[11px]">/login</code> with an assigned username and password.
              </p>

              <div className="space-y-3 text-xs">
                <div className="border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-yale-50 text-yale-700 flex items-center justify-center font-bold shrink-0">
                    A
                  </span>
                  <div>
                    <strong className="text-slate-900 block mb-0.5">Accreditation &amp; Assignment</strong>
                    Judges only see the specific competitions they have been assigned to by the administrator in <code className="bg-slate-100 px-1 py-0.5 rounded">/admin/judges</code>.
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-yale-50 text-yale-700 flex items-center justify-center font-bold shrink-0">
                    B
                  </span>
                  <div>
                    <strong className="text-slate-900 block mb-0.5">Real-Time Scoring Keypad</strong>
                    The judge console offers responsive increment buttons and interactive sliders ranging from 0 to the maximum points defined in your Criteria Studio.
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-lg bg-yale-50 text-yale-700 flex items-center justify-center font-bold shrink-0">
                    C
                  </span>
                  <div>
                    <strong className="text-slate-900 block mb-0.5">Submission Lock &amp; Audit Trail</strong>
                    Once a judge submits a scorecard, it is locked to prevent accidental alteration. All score transactions are timestamped and logged in the System Audit Trail (<code className="bg-slate-100 px-1 py-0.5 rounded">/admin/logs</code>).
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: TABULATION & RANKINGS */}
        {activeSection === 'tabulation' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <span>Tabulation Matrix, Tie-Breaking Engine &amp; Official Reports</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                The ASTS Tabulation Engine dynamically computes scores across all judges, applies criteria percentage weightings, and ranks candidates in real time.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Real-Time Matrix Grid</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    View candidate-by-candidate breakdowns across all judges. Missing scores are flagged with a pulse indicator until all judges complete scoring.
                  </p>
                </div>

                <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-yale-700" />
                    <span>Automatic Tie-Breaking Protocol</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    In the event of an exact aggregate score tie, ASTS applies collegiate tie-breaking rules (higher weighted primary rubric score or head-to-head judge rank sum).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: RULES & BEST PRACTICES */}
        {activeSection === 'troubleshooting' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-5">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                <span>Administrator Best Practices &amp; Operational Checklist</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Lock Criteria Before Judging Begins:</strong>
                    <p className="text-slate-600 mt-0.5">
                      Never modify criteria point limits or percentage weights while a live round is active. Modifying weights mid-competition recalculates historical scores.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Verify 100% Weight Balance Before Starting:</strong>
                    <p className="text-slate-600 mt-0.5">
                      Ensure the green <strong>"100% Balanced"</strong> badge is visible in Criteria Studio. Use the <em>Auto-Balance</em> button if there are fractional discrepancies.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Test Dry Run on Local WiFi / Cellular:</strong>
                    <p className="text-slate-600 mt-0.5">
                      Have judges submit 1 test score during rehearsal to verify venue tablet connectivity before live proceedings commence.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-slate-900">Signatory Protocol:</strong>
                    <p className="text-slate-600 mt-0.5">
                      Print official scorecards and summary certificates immediately following competition conclusion. Have the Chief Judge and Tabulation Committee physically sign hardcopies for official institutional archives.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

