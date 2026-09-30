'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { Sparkles, CheckCircle2, AlertCircle, RefreshCw, Trophy, Users, ShieldCheck, ArrowRight } from 'lucide-react';

export default function AdminSampleDataPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handlePopulate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/populate-sample', { method: 'POST' });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      setResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout
      pageTitle="Sample Data Seeder & Demo Generator"
      pageSubtitle="Quickly initialize realistic collegiate competitions, candidates, accredited judges, and live scores"
    >
      <div className="space-y-6 max-w-4xl">
        {/* Main Action Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-slate-900">
                1-Click Collegiate Sample Data Generator
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Generates a complete institutional tournament dataset matching collegiate standards: <strong>16 competitions across 5 categories</strong> (Pageant, Cultural, Academic, Literary, Sports), <strong>24 registered student participants</strong> with portraits and courses, 4 accredited judges, and live audit scores!
              </p>

              <div className="mt-5 flex items-center gap-3">
                <button
                  onClick={handlePopulate}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-yale-700 hover:bg-yale-800 transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>{loading ? 'Populating Full Dataset...' : 'Generate 16 Events & 24 Participants'}</span>
                </button>
              </div>

              {result && (
                <div
                  className={`mt-4 p-4 rounded-xl border text-xs flex items-start gap-3 ${
                    result.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold">{result.message || result.error}</p>
                    {result.details && (
                      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-semibold text-emerald-900 bg-white/80 p-2.5 rounded-lg border border-emerald-200">
                        <div>📅 {result.details.eventsCount} Events Created</div>
                        <div>👥 {result.details.participantsCount} Participants</div>
                        <div>⚖️ {result.details.judgesCount} Judges Ready</div>
                        <div>📊 {result.details.scoresCount} Scores Recorded</div>
                      </div>
                    )}
                    {result.success && (
                      <div className="mt-3 flex flex-wrap gap-3">
                        <Link
                          href="/admin/enlistment?tab=events"
                          className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <span>View 16 Events in Enlistment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href="/admin/enlistment?tab=participants"
                          className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <span>View 24 Participants</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href="/admin/tabulation?eventId=1"
                          className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Open Live Tabulation</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <Link
                          href="/admin/rankings?eventId=1"
                          className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Official Rankings</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* What gets created breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4">
            Institutional Dataset Summary
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>16 Events (5 Categories)</span>
              </p>
              <p className="text-[11px] text-slate-500">Pageant (3), Cultural (4), Academic (3), Literary (3), and Sports (3).</p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <Users className="w-4 h-4 text-yale-700" />
                <span>24 Student Participants</span>
              </p>
              <p className="text-[11px] text-slate-500">Roster populated with portrait photos, collegiate degrees, and year levels.</p>
            </div>
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
              <p className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>4 Judges & Live Tabulation</span>
              </p>
              <p className="text-[11px] text-slate-500">Accredited judges (judge1 to judge4 / pass: judge123) with weighted scores.</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
