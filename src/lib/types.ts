// ==========================================
// 1:1 Schema Definition from database/asts.sql
// ==========================================

export type UserRole = 'admin' | 'judge';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type EventParticipationMode = 'Individual' | 'Team';
export type EventStatus = 'Upcoming' | 'Ongoing' | 'Tabulating' | 'Completed';
export type PortionStatus = 'Upcoming' | 'Ongoing' | 'Completed';

export interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
}

export interface User {
  id: number;
  username: string;
  password?: string;
  full_name: string;
  role: UserRole;
  approval_status: ApprovalStatus;
  created_at?: string;
}

export interface EventType {
  id: number;
  type_name: string;
}

export interface Course {
  id: number;
  course_name: string;
}

export interface Department {
  id: number;
  department_name: string;
  department_code?: string;
}

export interface Organizer {
  id: number;
  organizer_name: string;
}

export interface Event {
  id: number;
  name: string;
  description: string;
  type: string;
  participation_mode: EventParticipationMode;
  department?: string;
  organizer?: string;
  academic_year?: string;
  start_date: string;
  end_date: string;
  status: EventStatus;
}

export interface EventJudge {
  id: number;
  event_id: number;
  user_id: number;
}

export interface Candidate {
  id: number;
  event_id: number;
  name: string;
  image_path?: string;
  course_id?: number | null;
  year_level?: string;
  order_number: number;
  registry_id?: number | null;
}

export interface EventPortion {
  id: number;
  event_id: number;
  portion_name: string;
  percentage: number;
  order_number: number;
  status: PortionStatus;
}

export interface Criteria {
  id: number;
  event_id: number;
  portion_id: number | null;
  name: string;
  max_score: number;
  percentage: number;
}

export interface Score {
  id: number;
  event_id: number;
  judge_id: number;
  candidate_id: number;
  criteria_id: number;
  score: number;
  submitted_at?: string;
}

export interface ParticipantRegistry {
  id: number;
  name: string;
  course_id?: number | null;
  year_level?: string;
  image_path?: string;
}

// Tabulation calculated models
export interface CandidateTabulation {
  candidate: Candidate;
  portionScores: {
    [portionId: number]: {
      portionName: string;
      percentage: number;
      averageScore: number;
      weightedScore: number;
    };
  };
  totalWeightedScore: number;
  rank: number;
  judgeBreakdown: {
    [judgeId: number]: {
      judgeName: string;
      totalScore: number;
      criteriaScores: { [criteriaId: number]: number };
    };
  };
}
