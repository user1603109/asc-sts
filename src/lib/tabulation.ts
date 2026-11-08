import { Candidate, Criteria, EventPortion, Score, User } from './types';

export interface TabulationResult {
  candidate: Candidate;
  portionBreakdown: {
    portionId: number;
    portionName: string;
    portionPercentage: number;
    criteriaBreakdown: {
      criteriaId: number;
      criteriaName: string;
      maxScore: number;
      percentage: number;
      averageRawScore: number;
      weightedScore: number;
    }[];
    portionTotal: number;
  }[];
  portionScores: {
    portionId: number;
    portionName: string;
    weightedScore: number;
    portionTotal: number;
  }[];
  judgeBreakdown: {
    judgeId: number;
    judgeName: string;
    hasSubmitted: boolean;
    totalScore: number | null;
  }[];
  totalScore: number;
  rank: number;
  judgeScoresCount: number;
  expectedJudgesCount: number;
}

export function computeTabulation(
  candidates: Candidate[],
  portions: EventPortion[],
  criteriaList: Criteria[],
  scores: Score[],
  judges: User[]
): TabulationResult[] {
  const activeJudgesCount = judges.length;

  // Determine effective portions
  // If portions exist, check if any criteria match them by portion_id or by name
  const hasMatchingPortions =
    portions.length > 0 &&
    portions.some((p) =>
      criteriaList.some(
        (c) =>
          Number(c.portion_id) === Number(p.id) ||
          (!c.portion_id && c.name?.trim().toLowerCase() === p.portion_name?.trim().toLowerCase())
      )
    );

  const effectivePortions: EventPortion[] = hasMatchingPortions
    ? portions
    : [
        {
          id: 0,
          event_id: candidates[0]?.event_id || 0,
          portion_name: 'General Criteria',
          percentage: 100,
          order_number: 1,
          status: 'Ongoing' as const,
        },
      ];

  const results: TabulationResult[] = candidates.map((candidate) => {
    let grandTotal = 0;

    // Filter scores for this candidate
    const candScores = scores.filter((s) => Number(s.candidate_id) === Number(candidate.id));
    const uniqueJudgesScored = new Set(candScores.map((s) => Number(s.judge_id))).size;

    const portionBreakdown = effectivePortions.map((portion) => {
      // Find criteria belonging to this portion (or all criteria if synthetic single portion)
      let portionCriteria = criteriaList.filter((c) => {
        if (portion.id === 0) return true;
        if (Number(c.portion_id) === Number(portion.id)) return true;
        if (!c.portion_id && c.name?.trim().toLowerCase() === portion.portion_name?.trim().toLowerCase()) return true;
        return false;
      });

      // If portion has no specific criteria, fallback to all event criteria
      if (portionCriteria.length === 0 && effectivePortions.length === 1) {
        portionCriteria = criteriaList;
      }

      let portionSum = 0;
      const criteriaBreakdown = portionCriteria.map((crit) => {
        const critScores = candScores.filter((s) => Number(s.criteria_id) === Number(crit.id));
        const sumRaw = critScores.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);

        // Average across judges who submitted
        const judgeDivisor = critScores.length > 0 ? critScores.length : 1;
        const averageRawScore = critScores.length > 0 ? sumRaw / judgeDivisor : 0;

        // Calculate weighted score based on criteria percentage
        const maxScore = Number(crit.max_score) || 100;
        const critPercentage = Number(crit.percentage) || 100;
        const weightedScore = maxScore > 0 ? (averageRawScore / maxScore) * critPercentage : 0;

        portionSum += weightedScore;

        return {
          criteriaId: crit.id,
          criteriaName: crit.name,
          maxScore,
          percentage: critPercentage,
          averageRawScore: Number(averageRawScore.toFixed(2)),
          weightedScore: Number(weightedScore.toFixed(2)),
        };
      });

      // Scale portion sum if portion has a weight percentage
      const portionPercentage = Number(portion.percentage) || 100;
      let portionTotal = portionSum;
      if (effectivePortions.length > 1 && portion.id !== 0) {
        const criteriaTotalWeight = portionCriteria.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);
        if (criteriaTotalWeight > 0) {
          portionTotal = (portionSum / criteriaTotalWeight) * portionPercentage;
        }
      }

      grandTotal += portionTotal;

      return {
        portionId: portion.id,
        portionName: portion.portion_name,
        portionPercentage,
        criteriaBreakdown,
        portionTotal: Number(portionTotal.toFixed(2)),
      };
    });

    const portionScores = portionBreakdown.map((pb) => ({
      portionId: pb.portionId,
      portionName: pb.portionName,
      weightedScore: pb.portionTotal,
      portionTotal: pb.portionTotal,
    }));

    // Compute individual judge breakdowns for real-time verification in admin
    const judgeBreakdown = judges.map((judge) => {
      const judgeCandScores = candScores.filter((s) => Number(s.judge_id) === Number(judge.id));
      const hasSubmitted = judgeCandScores.length > 0;

      let judgeGrandTotal = 0;
      effectivePortions.forEach((portion) => {
        let portionCriteria = criteriaList.filter((c) => {
          if (portion.id === 0) return true;
          if (Number(c.portion_id) === Number(portion.id)) return true;
          if (!c.portion_id && c.name?.trim().toLowerCase() === portion.portion_name?.trim().toLowerCase()) return true;
          return false;
        });
        if (portionCriteria.length === 0 && effectivePortions.length === 1) {
          portionCriteria = criteriaList;
        }

        let pSum = 0;
        portionCriteria.forEach((crit) => {
          const s = judgeCandScores.find((sc) => Number(sc.criteria_id) === Number(crit.id));
          const rawScore = s ? Number(s.score) || 0 : 0;
          const maxScore = Number(crit.max_score) || 100;
          const critPercentage = Number(crit.percentage) || 100;
          const weighted = maxScore > 0 ? (rawScore / maxScore) * critPercentage : 0;
          pSum += weighted;
        });

        const portionPercentage = Number(portion.percentage) || 100;
        let pTotal = pSum;
        if (effectivePortions.length > 1 && portion.id !== 0) {
          const criteriaTotalWeight = portionCriteria.reduce((acc, c) => acc + (Number(c.percentage) || 0), 0);
          if (criteriaTotalWeight > 0) {
            pTotal = (pSum / criteriaTotalWeight) * portionPercentage;
          }
        }
        judgeGrandTotal += pTotal;
      });

      return {
        judgeId: Number(judge.id),
        judgeName: judge.full_name || judge.username,
        hasSubmitted,
        totalScore: hasSubmitted ? Number(judgeGrandTotal.toFixed(2)) : null,
      };
    });

    return {
      candidate,
      portionBreakdown,
      portionScores,
      judgeBreakdown,
      totalScore: Number(grandTotal.toFixed(2)),
      rank: 0, // Assigned below
      judgeScoresCount: uniqueJudgesScored,
      expectedJudgesCount: activeJudgesCount,
    };
  });

  // Sort descending by totalScore
  results.sort((a, b) => b.totalScore - a.totalScore);

  // Assign ranks with tie handling
  let currentRank = 1;
  for (let i = 0; i < results.length; i++) {
    if (i > 0 && results[i].totalScore === results[i - 1].totalScore) {
      results[i].rank = results[i - 1].rank;
    } else {
      results[i].rank = currentRank;
    }
    currentRank++;
  }

  return results;
}
