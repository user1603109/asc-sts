import { NextRequest, NextResponse } from 'next/server';
import { getSheetRows, upsertScoresBatch } from '@/lib/googleSheets';
import { Score, EventJudge, Criteria } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const judgeId = searchParams.get('judgeId');
    const candidateId = searchParams.get('candidateId');

    const scores = await getSheetRows<Score>('scores');

    let filtered = scores;
    if (eventId) {
      filtered = filtered.filter((s) => Number(s.event_id) === Number(eventId));
    }

    // Security: Non-admin judges may only view their own submitted scores
    if (user && user.role === 'judge') {
      filtered = filtered.filter((s) => Number(s.judge_id) === Number(user.userId));
    } else if (judgeId) {
      filtered = filtered.filter((s) => Number(s.judge_id) === Number(judgeId));
    }

    if (candidateId) {
      filtered = filtered.filter((s) => Number(s.candidate_id) === Number(candidateId));
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    console.error('Fetch scores error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch scores' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const body = await req.json();
    const scoreItems: {
      event_id: number;
      candidate_id: number;
      criteria_id: number;
      score: number;
      judge_id?: number;
    }[] = Array.isArray(body) ? body : [body];

    if (scoreItems.length === 0) {
      return NextResponse.json({ error: 'No score records provided' }, { status: 400 });
    }

    const targetEventId = Number(scoreItems[0].event_id);

    // If caller is a judge, enforce assignment verification
    if (user.role !== 'admin') {
      const assignments = await getSheetRows<EventJudge>('event_judges');
      const isAssigned = assignments.some(
        (ej) => Number(ej.event_id) === targetEventId && Number(ej.user_id) === Number(user.userId)
      );

      if (!isAssigned) {
        return NextResponse.json(
          { error: 'Forbidden: You are not an assigned evaluator for this competition' },
          { status: 403 }
        );
      }
    }

    // Validate score values against criteria bounds
    const criteriaList = await getSheetRows<Criteria>('criteria');
    const critMap = new Map(criteriaList.map((c) => [Number(c.id), c]));

    const fallbackJudgeId = user.userId;
    const itemsToUpsert = [];

    for (const item of scoreItems) {
      const eventId = Number(item.event_id);
      const candId = Number(item.candidate_id);
      const critId = Number(item.criteria_id);
      const rawScore = Number(item.score);

      if (!eventId || !candId || !critId || isNaN(rawScore)) {
        return NextResponse.json(
          { error: 'Invalid score item: event_id, candidate_id, criteria_id, and numeric score are required' },
          { status: 400 }
        );
      }

      const crit = critMap.get(critId);
      const maxScore = crit ? Number(crit.max_score) || 100 : 100;

      if (rawScore < 0 || rawScore > maxScore) {
        return NextResponse.json(
          { error: `Score ${rawScore} is out of allowable range (0 - ${maxScore})` },
          { status: 400 }
        );
      }

      itemsToUpsert.push({
        event_id: eventId,
        judge_id: (user.role === 'admin' && item.judge_id) ? Number(item.judge_id) : Number(fallbackJudgeId),
        candidate_id: candId,
        criteria_id: critId,
        score: Math.round(rawScore * 100) / 100, // round to 2 decimal places
      });
    }

    await upsertScoresBatch(itemsToUpsert);

    return NextResponse.json({ success: true, message: 'Scores submitted successfully', count: itemsToUpsert.length });
  } catch (error: any) {
    console.error('Submit score error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit score' }, { status: 500 });
  }
}

