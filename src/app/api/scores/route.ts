import { NextRequest, NextResponse } from 'next/server';
import { appendSheetRow, getSheetRows, updateSheetRow } from '@/lib/googleSheets';
import { Score } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get('eventId');
    const judgeId = searchParams.get('judgeId');
    const candidateId = searchParams.get('candidateId');

    const scores = await getSheetRows<Score>('scores');

    let filtered = scores;
    if (eventId) {
      filtered = filtered.filter((s) => Number(s.event_id) === Number(eventId));
    }
    if (judgeId) {
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
    // Body can be a single score or an array of scores (batch submission)
    const scoreItems: {
      event_id: number;
      candidate_id: number;
      criteria_id: number;
      score: number;
      judge_id?: number;
    }[] = Array.isArray(body) ? body : [body];

    const effectiveJudgeId = user.role === 'admin' && body.judge_id ? Number(body.judge_id) : user.userId;
    const existingScores = await getSheetRows<Score>('scores');

    for (const item of scoreItems) {
      const { event_id, candidate_id, criteria_id, score } = item;

      // Check if score already exists for (event, judge, candidate, criteria)
      const existing = existingScores.find(
        (s) =>
          Number(s.event_id) === Number(event_id) &&
          Number(s.judge_id) === Number(effectiveJudgeId) &&
          Number(s.candidate_id) === Number(candidate_id) &&
          Number(s.criteria_id) === Number(criteria_id)
      );

      if (existing) {
        await updateSheetRow<Score>('scores', Number(existing.id), {
          score: Number(score),
        });
      } else {
        await appendSheetRow<Score>('scores', {
          event_id: Number(event_id),
          judge_id: Number(effectiveJudgeId),
          candidate_id: Number(candidate_id),
          criteria_id: Number(criteria_id),
          score: Number(score),
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Scores submitted successfully' });
  } catch (error: any) {
    console.error('Submit score error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit score' }, { status: 500 });
  }
}
