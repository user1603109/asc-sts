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

  const results: TabulationResult[] = candidates.map((candidate) => {
    let grandTotal = 0;

    // Filter scores for this candidate
    const candScores = scores.filter((s) => Number(s.candidate_id) === Number(candidate.id));
    const uniqueJudgesScored = new Set(candScores.map((s) => s.judge_id)).size;

    // If there are defined portions (e.g. Talent 20%, Q&A 30%, Gown 50%)
    const portionBreakdown = (portions.length > 0 ? portions : [
      { id: 0, event_id: candidate.event_id, portion_name: 'General Criteria', percentage: 100, order_number: 1, status: 'Ongoing' as const }
    ]).map((portion) => {
      // Find criteria belonging to this portion (or all if no portions defined)
      const portionCriteria = criteriaList.filter(
        (c) => portion.id === 0 || Number(c.portion_id) === Number(portion.id)
      );

      let portionSum = 0;
      const criteriaBreakdown = portionCriteria.map((crit) => {
        const critScores = candScores.filter((s) => Number(s.criteria_id) === Number(crit.id));
        const sumRaw = critScores.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
        
        // Average across judges who submitted, or active judges
        const judgeDivisor = critScores.length > 0 ? critScores.length : 1;
        const averageRawScore = critScores.length > 0 ? sumRaw / judgeDivisor : 0;
        
        // Calculate weighted score based on criteria percentage
        // e.g. (average / max_score) * percentage
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
      if (portions.length > 0 && portion.id !== 0) {
        // If portion sum is out of 100%, scale to portion percentage
        // If criteria percentages inside portion sum to 100%, portionTotal is (portionSum / 100) * portionPercentage
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

    return {
      candidate,
      portionBreakdown,
      portionScores,
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
