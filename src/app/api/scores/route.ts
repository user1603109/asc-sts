import { NextRequest, NextResponse } from 'next/server';
import { getSheetRows, upsertScoresBatch } from '@/lib/googleSheets';
import { Score } from '@/lib/types';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    const fallbackJudgeId = user.userId;
    const itemsToUpsert = scoreItems.map((item) => ({
      event_id: Number(item.event_id),
      judge_id: (user.role === 'admin' && item.judge_id) ? Number(item.judge_id) : Number(fallbackJudgeId),
      candidate_id: Number(item.candidate_id),
      criteria_id: Number(item.criteria_id),
      score: Number(item.score),
    }));

    await upsertScoresBatch(itemsToUpsert);

    return NextResponse.json({ success: true, message: 'Scores submitted successfully', count: itemsToUpsert.length });
  } catch (error: any) {
    console.error('Submit score error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit score' }, { status: 500 });
  }
}

