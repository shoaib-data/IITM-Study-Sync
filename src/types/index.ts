export type UserLevel =
  | 'Foundation'
  | 'Diploma in Programming'
  | 'Diploma in Data Science'
  | 'Degree';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  friendCode: string;
  friends: string[];
  activeTermId?: string;
  level: UserLevel;
  isAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AssessmentType = 'exam' | 'project';

export interface ExamComponents {
  quiz1: boolean;
  quiz2: boolean;
  endTerm: boolean;
  oppeCount: 0 | 1 | 2;
}

export interface ProjectComponents {
  hasProjectSubmission: boolean;
  hasViva: boolean;
}

export interface CourseCatalogItem {
  id: string;
  name: string;
  level: UserLevel;
  assessmentType: AssessmentType;
  examComponents?: ExamComponents;
  projectComponents?: ProjectComponents;
  createdAt?: string;
  updatedAt?: string;
}

export type CycleType = 'Jan' | 'May' | 'Sep';

export interface CalendarTerm {
  termId: string;
  cycle?: string;
  cycleType: CycleType;
  startDate: string; // YYYY-MM-DD
  quiz1Date: string; // YYYY-MM-DD
  quiz2Date: string; // YYYY-MM-DD
  endTermDate: string; // YYYY-MM-DD
  oppe1Window: {
    start: string;
    end: string;
  };
  oppe2Window: {
    start: string;
    end: string;
  };
  lastScrapedAt?: string;
  syncStatus: 'ok' | 'failed';
  source?: string;
  rawResponse?: string;
}

export interface WeeklyChecklist {
  assignmentSubmitted: boolean;
  practiceQuestionsCompleted: boolean;
  notesCreated: boolean;
}

export interface ComponentScore {
  score: number;
  max: number;
}

export interface CourseScores {
  quiz1?: ComponentScore;
  quiz2?: ComponentScore;
  endTerm?: ComponentScore;
  oppe1?: ComponentScore;
  oppe2?: ComponentScore;
  project?: ComponentScore;
  viva?: ComponentScore;
}

export interface UserCourse {
  id: string;
  courseId: string;
  name: string;
  level: UserLevel;
  assessmentType: AssessmentType;
  examComponents?: ExamComponents;
  projectComponents?: ProjectComponents;
  color: string;
  scores: CourseScores;
  weeklyProgress: Record<string, WeeklyChecklist>; // 'week1' .. 'week12'
}

export interface UserTerm {
  termId: string;
  calendarId: string;
  termName: string;
  isActive: boolean;
  createdAt: string;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  toUid: string;
  fromName: string;
  fromEmail: string;
  fromPhotoURL?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface FriendSummary {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  friendCode: string;
  level: UserLevel;
  activeTermId?: string;
  currentWeek?: number;
  completionRate?: number; // 0 to 100%
  completedItemsCount?: number;
  totalItemsCount?: number;
}
