export type OptionKey = 'A' | 'B' | 'C' | 'D';

export type DifficultyLevel = 'Easy' | 'Moderate' | 'Difficult';

export type QuestionType =
  | 'Conceptual'
  | 'Definition'
  | 'Practical Application'
  | 'Scenario-based'
  | 'Numerical'
  | 'Case Study'
  | 'Regulatory & Compliance'
  | 'Exceptions & Conditions';

export type TestMode = 'full-mock' | 'chapter-practice';

export interface Question {
  id: string;
  examId: string;
  examName: string;
  chapterNumber: number;
  chapterTitle: string;
  topic: string;
  questionText: string;
  options: Record<OptionKey, string>;
  correctAnswer: OptionKey;
  explanation: string;
  difficulty: DifficultyLevel;
  questionType: QuestionType;
}

export interface ChapterDefinition {
  chapterNumber: number;
  title: string;
  weightage: number; // Relative percentage weightage in full mock test (sums to ~100)
  summary: string;
  keyTopics: string[];
}

export interface ExamDefinition {
  id: string;
  code: string;
  name: string;
  shortName: string;
  description: string;
  totalQuestionsFullMock: number;
  totalMarksFullMock: number;
  marksPerQuestion: number;
  negativeMarking: number;
  durationMinutes: number;
  passingPercentage: number | null;
  chapters: ChapterDefinition[];
}

export interface ActiveTestSession {
  id: string;
  examId: string;
  examName: string;
  mode: TestMode;
  chapterNumber?: number;
  chapterTitle?: string;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, OptionKey>;
  markedForReview: string[];
  remainingSeconds: number; // Full mock total countdown (7200s)
  questionRemainingSeconds: number; // Chapter-wise current question countdown (60s)
  perQuestionRemainingSeconds: Record<string, number>;
  timedOutQuestionIds: string[];
  timeSpentPerQuestion: Record<string, number>;
  totalElapsedSeconds: number;
  startedAt: string;
  lastUpdatedAt: string;
}

export interface TestAttempt {
  id: string;
  examId: string;
  examName: string;
  mode: TestMode;
  chapterNumber?: number;
  chapterTitle?: string;
  questionIds: string[];
  answers: Record<string, OptionKey>;
  markedForReview: string[];
  timedOutQuestionIds: string[];
  timeSpentPerQuestion: Record<string, number>;
  totalQuestions: number;
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  accuracy: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  passed: boolean | null;
  passingPercentage: number | null;
  timeTakenSeconds: number;
  completedAt: string;
  autoSubmitted: boolean;
}

export interface UserPreferences {
  selectedExamId: string | null;
  theme: 'light' | 'dark';
}

export type AppView =
  | 'dashboard'
  | 'chapters'
  | 'analytics'
  | 'history'
  | 'question-bank'
  | 'active-test'
  | 'results';
