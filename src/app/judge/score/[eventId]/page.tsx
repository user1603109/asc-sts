'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import {
  ChevronLeft,
  CheckCircle2,
  Lock,
  RefreshCw,
  AlertCircle,
  Save,
  Trophy,
  Sliders,
} from 'lucide-react';
import { Candidate, Criteria, Event, EventPortion, Score } from '@/lib/types';

export default function JudgeScoringSheetPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params.eventId);

  const [event, setEvent] = useState<Event | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [portions, setPortions] = useState<EventPortion[]>([]);
  const [criteriaList, setCriteriaList] = useState<Criteria[]>([]);
  const [existingScores, setExistingScores] = useState<Score[]>([]);
  const [user, setUser] = useState<any>(null);

  const [activePortionId, setActivePortionId] = useState<number>(0);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState<number>(0);
  const [currentScores, setCurrentScores] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [meRes, evtRes, candRes, critRes, scoresRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch(`/api/events/${eventId}`),
          fetch(`/api/candidates?eventId=${eventId}`),
          fetch(`/api/criteria?eventId=${eventId}`),
          fetch(`/api/scores?eventId=${eventId}`),
        ]);

        const me = await meRes.json();
        if (me.authenticated) setUser(me.user);

        const evt = await evtRes.json();
        setEvent(evt);

        const cands = await candRes.json();
        setCandidates(cands);

        const crit = await critRes.json();
        setPortions(crit.portions || []);
        setCriteriaList(crit.criteria || []);

        if (crit.portions && crit.portions.length > 0) {
          setActivePortionId(crit.portions[0].id);
        }

        const scs = await scoresRes.json();
        setExistingScores(scs);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load scoring sheet');
      } finally {
        setLoading(false);
      }
    }

    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const currentCandidate = candidates[selectedCandidateIndex] || null;

  const activeCriteria = criteriaList.filter(
    (c) => activePortionId === 0 || Number(c.portion_id) === Number(activePortionId)
  );

  useEffect(() => {
    if (!currentCandidate || !user) return;

    const initial: Record<number, number> = {};
    activeCriteria.forEach((crit) => {
      const match = existingScores.find(
        (s) =>
          Number(s.candidate_id) === Number(currentCandidate.id) &&
          Number(s.criteria_id) === Number(crit.id) &&
          Number(s.judge_id) === Number(user.userId)
      );
      initial[crit.id] = match ? Number(match.score) : Number(crit.max_score) * 0.8;
    });

    setCurrentScores(initial);
    setSubmitSuccess(false);
  }, [selectedCandidateIndex, activePortionId, existingScores, user]);

  const handleScoreChange = (criteriaId: number, val: number, maxScore: number) => {
    let cleanVal = Number(val);
    if (isNaN(cleanVal)) cleanVal = 0;
    if (cleanVal < 0) cleanVal = 0;
    if (cleanVal > maxScore) cleanVal = maxScore;

    setCurrentScores((prev) => ({
      ...prev,
      [criteriaId]: cleanVal,
    }));
  };

  const handleSubmitScores = async () => {
    if (!currentCandidate) return;
    setSubmitting(true);
    setErrorMessage('');
    setSubmitSuccess(false);

    try {
      const payload = activeCriteria.map((crit) => ({
        event_id: eventId,
        candidate_id: currentCandidate.id,
        criteria_id: crit.id,
        score: currentScores[crit.id] !== undefined ? currentScores[crit.id] : crit.max_score * 0.8,
      }));

      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit score');

      setSubmitSuccess(true);

      const scsRes = await fetch(`/api/scores?eventId=${eventId}`);
      const updatedScores = await scsRes.json();
      setExistingScores(updatedScores);

      setTimeout(() => {
        if (selectedCandidateIndex < candidates.length - 1) {
          setSelectedCandidateIndex(selectedCandidateIndex + 1);
        }
      }, 700);
    } catch (err: any) {
      setErrorMessage(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const liveTotal = activeCriteria.reduce((acc, crit) => {
    const raw = currentScores[crit.id] || 0;
    const max = Number(crit.max_score) || 100;
    const pct = Number(crit.percentage) || 100;
    return acc + (max > 0 ? (raw / max) * pct : 0);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans">
        <Navbar user={user} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-yale-700 mb-2" />
            <p className="text-xs font-semibold text-slate-500">Loading digital score sheet...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans pb-16">
      <Navbar user={user} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-5">
        {/* Top Breadcrumb Bar */}
        <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <button
            onClick={() => router.push('/judge/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-yale-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Events</span>
          </button>
          <div className="text-right">
            <h1 className="text-sm font-bold text-slate-900">{event?.name}</h1>
            <p className="text-[10px] text-yale-700 uppercase font-bold">{event?.type} • Touch Scoring</p>
          </div>
        </div>

        {/* Portion Selector Tabs */}
        {portions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {portions.map((portion) => (
              <button
                key={portion.id}
                onClick={() => setActivePortionId(portion.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  activePortionId === portion.id
                    ? 'bg-yale-700 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span>{portion.portion_name}</span>
                <span className="ml-1.5 opacity-80 text-[10px]">({portion.percentage}%)</span>
              </button>
            ))}
          </div>
        )}

        {/* Contestant Ribbon */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Select Contestant ({selectedCandidateIndex + 1} of {candidates.length})
          </p>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-2">
            {candidates.map((cand, idx) => {
              const isSelected = idx === selectedCandidateIndex;
              const isScored = activeCriteria.every((crit) =>
                existingScores.some(
                  (s) =>
                    Number(s.candidate_id) === Number(cand.id) &&
                    Number(s.criteria_id) === Number(crit.id) &&
                    Number(s.judge_id) === Number(user?.userId)
                )
              );

              return (
                <button
                  key={cand.id}
                  onClick={() => setSelectedCandidateIndex(idx)}
                  className={`flex flex-col items-center p-2.5 rounded-lg border min-w-[85px] transition-all relative ${
                    isSelected
                      ? 'bg-yale-50 border-yale-600 text-slate-900 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {isScored && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center text-[9px] text-white">
                      ✓
                    </span>
                  )}
                  <span className="text-xs font-black text-yale-700">#{cand.order_number}</span>
                  <span className="text-[11px] font-bold mt-0.5 text-center line-clamp-1">{cand.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Focus Candidate Scoring Sheet */}
        {currentCandidate && (
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-card space-y-5">
            {/* Candidate Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-14 h-14 rounded-xl bg-yale-700 text-white font-black text-xl flex items-center justify-center shadow-sm shrink-0">
                  #{currentCandidate.order_number}
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">{currentCandidate.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{currentCandidate.year_level || 'General Contestant'}</p>
                </div>
              </div>

              {/* Total score box */}
              <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400">Portion Total</span>
                <p className="text-xl font-black text-yale-700">{liveTotal.toFixed(2)}%</p>
              </div>
            </div>

            {/* Error / Success alert */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Score submitted & locked! Loading next contestant...</span>
              </div>
            )}

            {/* Criteria Sliders */}
            <div className="space-y-4">
              {activeCriteria.map((crit) => {
                const val = currentScores[crit.id] !== undefined ? currentScores[crit.id] : crit.max_score * 0.8;
                const max = Number(crit.max_score) || 100;

                return (
                  <div key={crit.id} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-xs text-slate-900">{crit.name}</h3>
                        <span className="text-[11px] text-yale-700 font-semibold">
                          Weight: {crit.percentage}% • Max: {max} pts
                        </span>
                      </div>

                      {/* Numeric input */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          max={max}
                          step="0.5"
                          value={val}
                          onChange={(e) => handleScoreChange(crit.id, Number(e.target.value), max)}
                          className="w-16 bg-white border border-slate-300 focus:border-yale-600 text-slate-900 font-black text-center text-base rounded-lg py-1 focus:outline-none"
                        />
                        <span className="text-xs text-slate-400">/ {max}</span>
                      </div>
                    </div>

                    {/* Touch Range Slider */}
                    <input
                      type="range"
                      min="0"
                      max={max}
                      step="0.5"
                      value={val}
                      onChange={(e) => handleScoreChange(crit.id, Number(e.target.value), max)}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F4C81]"
                    />

                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>0 pts</span>
                      <span>{(max / 2).toFixed(0)} pts</span>
                      <span>{max} pts</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Submit & Lock Button */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Lock className="w-3.5 h-3.5 text-yale-700" />
                <span>Scores are recorded securely to Google Sheets database.</span>
              </div>

              <button
                onClick={handleSubmitScores}
                disabled={submitting || activeCriteria.length === 0}
                className="w-full sm:w-auto px-5 py-2.5 bg-yale-700 hover:bg-yale-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Submit & Lock Score</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
