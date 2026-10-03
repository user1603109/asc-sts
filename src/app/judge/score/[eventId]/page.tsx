'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import JudgeLayout from '@/components/JudgeLayout';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock,
  RefreshCw,
  Trophy,
  Users,
  Award,
  Sparkles,
  Minus,
  Plus,
} from 'lucide-react';
import { Candidate, Criteria, Event, EventPortion, Score } from '@/lib/types';

// Helper for safe JSON parsing that never crashes on empty/HTML responses
async function safeFetchJson<T = any>(url: string, options?: RequestInit, fallback: T = [] as any): Promise<T> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      console.warn(`Request failed for ${url}: status ${res.status}`);
      return fallback;
    }
    const text = await res.text();
    if (!text || text.trim() === '') return fallback;
    return JSON.parse(text) as T;
  } catch (e) {
    console.warn(`Failed to parse JSON for ${url}:`, e);
    return fallback;
  }
}

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

  // Initial Data Load
  useEffect(() => {
    async function loadData() {
      if (!eventId) return;
      try {
        setLoading(true);
        setErrorMessage('');

        const [meData, evtData, candData, critData, scoresData] = await Promise.all([
          safeFetchJson<any>('/api/auth/me', undefined, { authenticated: false }),
          safeFetchJson<any>(`/api/events/${eventId}`, undefined, null),
          safeFetchJson<Candidate[]>(`/api/candidates?eventId=${eventId}`, undefined, []),
          safeFetchJson<{ portions: EventPortion[]; criteria: Criteria[] }>(
            `/api/criteria?eventId=${eventId}`,
            undefined,
            { portions: [], criteria: [] }
          ),
          safeFetchJson<Score[]>(`/api/scores?eventId=${eventId}`, undefined, []),
        ]);

        if (meData.authenticated && meData.user) {
          setUser(meData.user);
        }

        if (evtData) setEvent(evtData);
        if (Array.isArray(candData)) {
          // Sort candidates by order number
          candData.sort((a, b) => (Number(a.order_number) || 0) - (Number(b.order_number) || 0));
          setCandidates(candData);
        }

        const prts = Array.isArray(critData?.portions) ? critData.portions : [];
        const crts = Array.isArray(critData?.criteria) ? critData.criteria : [];
        setPortions(prts);
        setCriteriaList(crts);

        if (prts.length > 0) {
          setActivePortionId(Number(prts[0].id));
        }

        if (Array.isArray(scoresData)) {
          setExistingScores(scoresData);
        }
      } catch (err: any) {
        console.error('Error loading score sheet:', err);
        setErrorMessage(err.message || 'Failed to load scoring sheet data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId]);

  const currentCandidate = candidates[selectedCandidateIndex] || null;

  // Active criteria calculation: if portions exist and activePortion has criteria, filter by portion.
  // If active portion has no criteria or portion_id is null in criteria, fallback to showing all event criteria!
  const activeCriteria = useMemo(() => {
    if (portions.length > 0 && activePortionId > 0) {
      const filtered = criteriaList.filter((c) => Number(c.portion_id) === Number(activePortionId));
      if (filtered.length > 0) return filtered;
    }
    return criteriaList;
  }, [criteriaList, portions, activePortionId]);

  // When candidate or portion changes, initialize scores from existing records or defaults
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
      // Default to 80% if not previously scored
      const defaultScore = Math.round(Number(crit.max_score) * 0.85 * 10) / 10;
      initial[crit.id] = match ? Number(match.score) : defaultScore;
    });

    setCurrentScores(initial);
    setSubmitSuccess(false);
    setErrorMessage('');
  }, [selectedCandidateIndex, activePortionId, existingScores, user, activeCriteria]);

  const handleScoreChange = (criteriaId: number, val: number, maxScore: number) => {
    let cleanVal = Number(val);
    if (isNaN(cleanVal)) cleanVal = 0;
    if (cleanVal < 0) cleanVal = 0;
    if (cleanVal > maxScore) cleanVal = maxScore;
    // Clean to 1 decimal place
    cleanVal = Math.round(cleanVal * 10) / 10;

    setCurrentScores((prev) => ({
      ...prev,
      [criteriaId]: cleanVal,
    }));
  };

  const handleStepScore = (criteriaId: number, delta: number, maxScore: number) => {
    const current = currentScores[criteriaId] !== undefined ? currentScores[criteriaId] : maxScore * 0.85;
    handleScoreChange(criteriaId, current + delta, maxScore);
  };

  // Submit and lock score
  const handleSubmitScores = async () => {
    if (!currentCandidate || !user) return;
    setSubmitting(true);
    setErrorMessage('');
    setSubmitSuccess(false);

    try {
      const payload = activeCriteria.map((crit) => ({
        event_id: eventId,
        candidate_id: currentCandidate.id,
        criteria_id: crit.id,
        judge_id: user.userId,
        score: currentScores[crit.id] !== undefined ? currentScores[crit.id] : Math.round(crit.max_score * 0.85),
      }));

      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errMessage = 'Failed to submit score';
        try {
          const errData = await res.json();
          errMessage = errData.error || errMessage;
        } catch {
          errMessage = `Server responded with status ${res.status}`;
        }
        throw new Error(errMessage);
      }

      setSubmitSuccess(true);

      // Refresh scores silently
      const updatedScores = await safeFetchJson<Score[]>(`/api/scores?eventId=${eventId}`, undefined, []);
      if (Array.isArray(updatedScores)) {
        setExistingScores(updatedScores);
      }

      // Auto advance to next candidate if not at the end
      setTimeout(() => {
        if (selectedCandidateIndex < candidates.length - 1) {
          setSelectedCandidateIndex((prev) => prev + 1);
        }
      }, 750);
    } catch (err: any) {
      console.error('Submission error:', err);
      setErrorMessage(err.message || 'Score submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Live total percentage calculation
  const liveTotal = useMemo(() => {
    if (activeCriteria.length === 0) return 0;
    return activeCriteria.reduce((acc, crit) => {
      const raw = currentScores[crit.id] || 0;
      const max = Number(crit.max_score) || 100;
      const pct = Number(crit.percentage) || 100;
      return acc + (max > 0 ? (raw / max) * pct : 0);
    }, 0);
  }, [activeCriteria, currentScores]);

  // Check if current candidate has been scored by this judge
  const isCurrentCandidateScored = useMemo(() => {
    if (!currentCandidate || !user || activeCriteria.length === 0) return false;
    return activeCriteria.every((crit) =>
      existingScores.some(
        (s) =>
          Number(s.candidate_id) === Number(currentCandidate.id) &&
          Number(s.criteria_id) === Number(crit.id) &&
          Number(s.judge_id) === Number(user.userId)
      )
    );
  }, [currentCandidate, user, activeCriteria, existingScores]);

  return (
    <JudgeLayout
      user={user}
      pageTitle={event?.name || 'Touch Scoring Arena'}
      pageSubtitle={`${event?.type || 'Competition'} • Official Live Touchscreen Scorecard`}
    >
      <div className="space-y-4 max-w-4xl mx-auto pb-12">
        {/* Navigation Breadcrumb & Back Bar */}
        <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-xs flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/judge/dashboard')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4 text-[#0F4C81]" />
            <span>Return to Dashboard</span>
          </button>

          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#0F4C81] bg-[#0F4C81]/10 px-2 py-0.5 rounded">
              {event?.type || 'Pageant'}
            </span>
            <div className="text-xs font-bold text-slate-700 hidden sm:block mt-0.5">
              AY {event?.academic_year || '2025-2026'}
            </div>
          </div>
        </div>

        {/* Portion / Segment Selection Tabs (if event has multiple segments) */}
        {portions.length > 0 && (
          <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-xs">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2 px-1">
              Select Evaluation Portion / Segment:
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {portions.map((portion) => {
                const isActive = Number(activePortionId) === Number(portion.id);
                return (
                  <button
                    key={portion.id}
                    onClick={() => setActivePortionId(Number(portion.id))}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#0F4C81] text-white shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>{portion.portion_name}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {portion.percentage}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Contestant Ribbon in List / Horizontal Mode (Touch Friendly) */}
        <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-2xl shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>SELECT CONTESTANT ({selectedCandidateIndex + 1} OF {candidates.length})</span>
            <span>Tap to evaluate</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
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
                  className={`flex flex-col items-center p-2 rounded-xl border min-w-[90px] sm:min-w-[110px] transition-all relative shrink-0 text-left ${
                    isSelected
                      ? 'bg-[#0F4C81]/10 border-[#0F4C81] ring-2 ring-[#0F4C81]/20 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {isScored && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white shadow-xs">
                      ✓
                    </span>
                  )}
                  <span className={`text-xs font-black ${isSelected ? 'text-[#0F4C81]' : 'text-slate-500'}`}>
                    #{cand.order_number}
                  </span>
                  <span className="text-[11px] font-bold text-slate-900 truncate w-full text-center mt-0.5">
                    {cand.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F4C81] mb-2" />
            <p className="text-xs font-bold text-slate-700">Loading scoring sheet rubrics...</p>
          </div>
        ) : !currentCandidate ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No Contestants Found for this Event</p>
            <p className="text-xs text-slate-500 mt-1">Please ensure contestants are registered in the Enlistment module.</p>
          </div>
        ) : (
          /* Active Contestant Scoring Card */
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5">
            {/* Contestant Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0F4C81] to-blue-600 text-white font-black text-xl flex items-center justify-center shadow-xs shrink-0">
                  #{currentCandidate.order_number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">{currentCandidate.name}</h2>
                    {isCurrentCandidateScored && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        <span>Scored</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentCandidate.department ? `Dept: ${currentCandidate.department} • ` : ''}
                    {currentCandidate.year_level || 'Contestant'}
                  </p>
                </div>
              </div>

              {/* Total Portion Score Badge */}
              <div className="bg-[#0F4C81]/10 border border-[#0F4C81]/20 px-4 py-2 rounded-2xl text-center self-start sm:self-auto min-w-[130px]">
                <span className="text-[10px] uppercase font-bold text-[#0F4C81]">Computed Total</span>
                <div className="text-2xl font-black text-[#0F4C81]">{liveTotal.toFixed(2)}%</div>
              </div>
            </div>

            {/* Error / Success Notifications */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-semibold">{errorMessage}</span>
              </div>
            )}

            {submitSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span className="font-bold">Score recorded and locked successfully! Loading next contestant...</span>
              </div>
            )}

            {/* Criteria List Controls */}
            {activeCriteria.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 text-xs">
                No criteria rubrics defined for this portion. Please contact the administrator.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Criteria Rubrics & Point Scoring</span>
                  <span>Max Limit</span>
                </div>

                {activeCriteria.map((crit) => {
                  const max = Number(crit.max_score) || 100;
                  const val = currentScores[crit.id] !== undefined ? currentScores[crit.id] : Math.round(max * 0.85);

                  return (
                    <div
                      key={crit.id}
                      className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 transition-colors"
                    >
                      {/* Criteria Title & Score Input */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 leading-snug">{crit.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-bold text-[#0F4C81]">Weight: {crit.percentage}%</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-slate-500">Max: {max} pts</span>
                          </div>
                        </div>

                        {/* Direct Score Controls: Minus, Input, Plus */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleStepScore(crit.id, -1, max)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all"
                            title="Decrease by 1 pt"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min="0"
                            max={max}
                            step="0.5"
                            value={val}
                            onChange={(e) => handleScoreChange(crit.id, Number(e.target.value), max)}
                            className="w-16 h-8 bg-white border border-slate-300 focus:border-[#0F4C81] text-slate-900 font-black text-center text-base rounded-lg focus:outline-none"
                          />

                          <button
                            type="button"
                            onClick={() => handleStepScore(crit.id, 1, max)}
                            className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all"
                            title="Increase by 1 pt"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <span className="text-xs font-bold text-slate-400">/ {max}</span>
                        </div>
                      </div>

                      {/* Touch Range Slider with Thumb */}
                      <input
                        type="range"
                        min="0"
                        max={max}
                        step="0.5"
                        value={val}
                        onChange={(e) => handleScoreChange(crit.id, Number(e.target.value), max)}
                        className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0F4C81]"
                      />

                      {/* Slider Scale Points */}
                      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                        <span>0 pts</span>
                        <span>{(max * 0.5).toFixed(0)} pts</span>
                        <span>{(max * 0.75).toFixed(0)} pts</span>
                        <span className="font-bold text-slate-600">{max} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Navigation & Submit Action Footer */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Contestant Prev / Next Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  disabled={selectedCandidateIndex === 0}
                  onClick={() => setSelectedCandidateIndex((prev) => Math.max(0, prev - 1))}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Prev</span>
                </button>

                <span className="text-xs font-bold text-slate-500">
                  {selectedCandidateIndex + 1} of {candidates.length}
                </span>

                <button
                  type="button"
                  disabled={selectedCandidateIndex >= candidates.length - 1}
                  onClick={() => setSelectedCandidateIndex((prev) => Math.min(candidates.length - 1, prev + 1))}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold text-xs flex items-center gap-1 transition-all"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Submit & Lock Score Button */}
              <button
                type="button"
                onClick={handleSubmitScores}
                disabled={submitting || activeCriteria.length === 0}
                className="w-full sm:w-auto px-6 py-3 bg-[#0F4C81] hover:bg-[#0A3258] text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Synchronizing to Database...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>Submit & Lock Score</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </JudgeLayout>
  );
}
