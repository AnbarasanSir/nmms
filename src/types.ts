export type NMMS_Subject = 'MAT' | 'SAT_MATHS' | 'SAT_SCIENCE' | 'SAT_SOCIAL';

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  image?: string;
}

export interface Question {
  id: string;
  subject: NMMS_Subject;
  topic?: string;
  questionText: string;
  questionImage?: string;
  options: QuestionOption[];
  correctOption: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
  marks: number;
  negativeMarks?: number;
  question_en?: string;
  options_en?: string[];
  explanation_en?: string;
}

export interface PyqPaperSummary {
  id: string;
  year: number;
  type: 'MAT' | 'SAT' | 'FULL';
  title: string;
  titleTa?: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  totalMarks: number;
  subjects: NMMS_Subject[];
  isDeployed: boolean;
  attemptsCount: number;
}

export interface SubjectUnitSummary {
  id: string;
  subject: NMMS_Subject;
  unitNumber: number;
  title: string;
  titleTa: string;
  titleEn: string;
  description?: string;
  questionCount: number;
  durationMinutes: number;
  totalMarks: number;
  isDeployed: boolean;
  activeQuizId?: string;
  attemptsCount: number;
  hasDiagrams: boolean;
  hasCustomEdits?: boolean;
}

export interface UnitDetailResponse {
  unit: SubjectUnitSummary;
  questions: Question[];
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  totalMarks: number;
  passPercentage: number;
  enableAntiCheat: boolean;
  shuffleQuestions: boolean;
  shuffleOptions?: boolean;
  enableQuestionLimit?: boolean;
  questionsPerAttempt?: number;
  showResultsImmediately: boolean;
  allowReview: boolean;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  questions: Question[];
}

export interface SubjectScoreBreakdown {
  obtained: number;
  possible: number;
  accuracy: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
}

export interface StudentScoreResult {
  totalObtained: number;
  totalPossible: number;
  percentage: number;
  isEligible: boolean; // NMMS Cutoff standard (40% General/OBC, 32% SC/ST)
  matScore: number;
  satScore: number;
  subjectBreakdown: {
    MAT: SubjectScoreBreakdown;
    SAT_MATHS: SubjectScoreBreakdown;
    SAT_SCIENCE: SubjectScoreBreakdown;
    SAT_SOCIAL: SubjectScoreBreakdown;
  };
  strengthSubject: string;
  weaknessSubject: string;
  aiDiagnosticInsights?: string[];
}

export interface StudentAttempt {
  id: string;
  quizId: string;
  quizTitle: string;
  studentName: string;
  examNumber: string;
  startedAt: string;
  submittedAt: string;
  timeTakenSeconds: number;
  answers: Record<string, 'A' | 'B' | 'C' | 'D' | null>;
  questionStatus?: Record<string, 'answered' | 'marked' | 'visited' | 'unvisited' | 'marked_answered'>;
  tabSwitchCount: number;
  score: StudentScoreResult;
}

export interface StudentQuizHistorySummary {
  quizId: string;
  quizTitle: string;
  attemptCount: number;
  bestScore: number;
  totalPossible: number;
  bestPercentage: number;
  latestScore: number;
  latestPercentage: number;
  latestSubmittedAt: string;
  attempts: StudentAttempt[];
}

export interface StudentFullHistory {
  student: {
    examNumber: string;
    studentName: string;
  };
  totalAttempts: number;
  totalQuizzesAttempted: number;
  overallAveragePercentage: number;
  overallBestScore: number;
  quizSummaries: StudentQuizHistorySummary[];
  allAttempts: StudentAttempt[];
  subjectAverages: {
    MAT: number;
    SAT_MATHS: number;
    SAT_SCIENCE: number;
    SAT_SOCIAL: number;
  };
}

export interface QuizAnalytics {
  quizId: string;
  quizTitle: string;
  totalAttempts: number;
  averageScore: number;
  averagePercentage: number;
  highestScore: number;
  lowestScore: number;
  averageTimeSeconds: number;
  passRate: number;
  subjectAverages: {
    MAT: number;
    SAT_MATHS: number;
    SAT_SCIENCE: number;
    SAT_SOCIAL: number;
  };
  questionStats: {
    questionId: string;
    questionNumber: number;
    subject: NMMS_Subject;
    questionText: string;
    correctRate: number;
    correctAttempts: number;
    wrongAttempts: number;
    unattempted: number;
    difficultyRating: 'Easy' | 'Moderate' | 'Hard';
  }[];
  recentAttempts: StudentAttempt[];
}

export const SUBJECT_METADATA: Record<NMMS_Subject, { name: string; shortName: string; category: 'MAT' | 'SAT'; color: string; badgeBg: string; border: string }> = {
  MAT: {
    name: 'Mental Ability Test (MAT)',
    shortName: 'MAT Reasoning',
    category: 'MAT',
    color: 'text-indigo-700 dark:text-indigo-300',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    border: 'border-indigo-500'
  },
  SAT_MATHS: {
    name: 'SAT - Mathematics',
    shortName: 'SAT Maths',
    category: 'SAT',
    color: 'text-blue-700 dark:text-blue-300',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    border: 'border-blue-500'
  },
  SAT_SCIENCE: {
    name: 'SAT - Science',
    shortName: 'SAT Science',
    category: 'SAT',
    color: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    border: 'border-emerald-500'
  },
  SAT_SOCIAL: {
    name: 'SAT - Social Science',
    shortName: 'SAT Social Science',
    category: 'SAT',
    color: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    border: 'border-amber-500'
  },
};
