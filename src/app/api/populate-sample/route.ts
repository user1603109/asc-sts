import { NextResponse } from 'next/server';
import { appendSheetRow, getSheetRows } from '@/lib/googleSheets';
import { hashPassword } from '@/lib/auth';
import { Event, Candidate, Criteria, EventPortion, User, Score } from '@/lib/types';

export async function POST() {
  try {
    // 1. Create or retrieve the competition event
    const existingEvents = await getSheetRows<Event>('events');
    let event = existingEvents.find((e) => e.name.includes('Mr. & Ms. ASC'));

    if (!event) {
      event = await appendSheetRow<Event>('events', {
        name: 'Mr. & Ms. Apayao State College 2026',
        description: 'Official collegiate pageant celebrating leadership, cultural talent, and academic excellence.',
        type: 'Pageant',
        participation_mode: 'Individual',
        department: 'Bachelor in Information Technology',
        organizer: 'ASC Supreme Student Council',
        academic_year: '2025-2026',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        status: 'Ongoing',
      });
    }

    const eventId = Number(event.id);

    // 2. Add the 4 Portions
    const portionsDef = [
      { name: 'Personal Interview', pct: 25, order: 1 },
      { name: 'Swimsuit / Fitness Attire', pct: 25, order: 2 },
      { name: 'Evening Gown / Formal Wear', pct: 25, order: 3 },
      { name: 'Final Question & Answer', pct: 25, order: 4 },
    ];

    const existingPortions = await getSheetRows<EventPortion>('event_portions');
    const eventPortions: EventPortion[] = [];

    for (const p of portionsDef) {
      let portion = existingPortions.find((ep) => Number(ep.event_id) === eventId && ep.portion_name === p.name);
      if (!portion) {
        portion = await appendSheetRow<EventPortion>('event_portions', {
          event_id: eventId,
          portion_name: p.name,
          percentage: p.pct,
          order_number: p.order,
          status: 'Ongoing',
        });
      }
      eventPortions.push(portion);
    }

    // 3. Add Criteria for each portion
    const existingCriteria = await getSheetRows<Criteria>('criteria');
    const allCriteria: Criteria[] = [];

    for (const p of eventPortions) {
      const critName = `${p.portion_name} Evaluation`;
      let crit = existingCriteria.find((c) => Number(c.event_id) === eventId && Number(c.portion_id) === Number(p.id));
      if (!crit) {
        crit = await appendSheetRow<Criteria>('criteria', {
          event_id: eventId,
          portion_id: Number(p.id),
          name: critName,
          max_score: 100,
          percentage: 100,
        });
      }
      allCriteria.push(crit);
    }

    // 4. Add 4 Contestants
    const sampleCandidates = [
      { name: 'Christian Jay Alcantara', course_id: 3, year: '3rd Year', order: 1, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300' },
      { name: 'Princess Bea Valenzuela', course_id: 1, year: '2nd Year', order: 2, img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300' },
      { name: 'Mark Anthony Ramos', course_id: 6, year: '4th Year', order: 3, img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300' },
      { name: 'Alyssa Mae Fernandez', course_id: 10, year: '1st Year', order: 4, img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300' },
    ];

    const existingCandidates = await getSheetRows<Candidate>('candidates');
    const createdCandidates: Candidate[] = [];

    for (const sc of sampleCandidates) {
      let cand = existingCandidates.find((c) => Number(c.event_id) === eventId && c.name === sc.name);
      if (!cand) {
        cand = await appendSheetRow<Candidate>('candidates', {
          event_id: eventId,
          name: sc.name,
          course_id: sc.course_id,
          year_level: sc.year,
          order_number: sc.order,
          image_path: sc.img,
        });
      }
      createdCandidates.push(cand);
    }

    // 5. Add 3 Accredited Judges
    const sampleJudges = [
      { user: 'judge_1', name: 'Hon. Maria Elena Cortez' },
      { user: 'judge_2', name: 'Prof. David K. Mendoza' },
      { user: 'judge_3', name: 'Atty. Rochelle G. Santos' },
    ];

    const existingUsers = await getSheetRows<User>('users');
    const judges: User[] = [];
    const defaultPassword = await hashPassword('password123');

    for (const sj of sampleJudges) {
      let judge = existingUsers.find((u) => u.username === sj.user);
      if (!judge) {
        judge = await appendSheetRow<User>('users', {
          username: sj.user,
          full_name: sj.name,
          password: defaultPassword,
          role: 'judge',
          approval_status: 'approved',
        });
      }
      judges.push(judge);
    }

    // 6. Assign judges to this event
    const existingAssignments = await getSheetRows<any>('event_judges');
    for (const j of judges) {
      const assigned = existingAssignments.some((a) => Number(a.event_id) === eventId && Number(a.user_id) === Number(j.id));
      if (!assigned) {
        await appendSheetRow('event_judges', {
          event_id: eventId,
          user_id: Number(j.id),
        });
      }
    }

    // 7. Seed Scores
    const existingScores = await getSheetRows<Score>('scores');
    let scoresAdded = 0;

    for (const j of judges) {
      for (const cand of createdCandidates) {
        for (const crit of allCriteria) {
          const hasScore = existingScores.some(
            (s) =>
              Number(s.event_id) === eventId &&
              Number(s.judge_id) === Number(j.id) &&
              Number(s.candidate_id) === Number(cand.id) &&
              Number(s.criteria_id) === Number(crit.id)
          );

          if (!hasScore) {
            // Realistic score between 88 and 97
            const base = 88 + ((Number(cand.order_number) * 2 + Number(j.id)) % 8);
            const scoreVal = Math.min(99, base + ((Number(crit.id) % 3) * 0.5));

            await appendSheetRow<Score>('scores', {
              event_id: eventId,
              judge_id: Number(j.id),
              candidate_id: Number(cand.id),
              criteria_id: Number(crit.id),
              score: scoreVal,
            });
            scoresAdded++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sample competition, candidates, portions, judges, and scores successfully generated!',
      eventId,
      scoresAdded,
    });
  } catch (error: any) {
    console.error('Populate sample error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
