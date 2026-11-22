import { ActiveTestSession, ExamDefinition, Question, TestAttempt } from '../types/exam';

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  }
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function evaluateTestAttempt(
  session: ActiveTestSession,
  exam: ExamDefinition,
  questionMap: Map<string, Question>,
  autoSubmitted: boolean
): TestAttempt {
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  for (const qId of session.questionIds) {
    const q = questionMap.get(qId);
    const chosen = session.answers[qId];
    if (!chosen) {
      unansweredCount += 1;
    } else if (q && chosen === q.correctAnswer) {
      correctCount += 1;
    } else {
      incorrectCount += 1;
    }
  }

  const totalQuestions = session.questionIds.length;
  const totalMarks = totalQuestions * exam.marksPerQuestion;
  const marksObtained = Math.max(
    0,
    correctCount * exam.marksPerQuestion - incorrectCount * exam.negativeMarking
  );
  const percentage = totalMarks > 0 ? Number(((marksObtained / totalMarks) * 100).toFixed(1)) : 0;
  const attempted = correctCount + incorrectCount;
  const accuracy = attempted > 0 ? Number(((correctCount / attempted) * 100).toFixed(1)) : 0;

  const passingPercentage = session.mode === 'full-mock' ? exam.passingPercentage : null;
  const passed = passingPercentage !== null ? percentage >= passingPercentage : null;

  return {
    id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    examId: exam.id,
    examName: exam.name,
    mode: session.mode,
    chapterNumber: session.chapterNumber,
    chapterTitle: session.chapterTitle,
    questionIds: [...session.questionIds],
    answers: { ...session.answers },
    markedForReview: [...session.markedForReview],
    timedOutQuestionIds: [...session.timedOutQuestionIds],
    timeSpentPerQuestion: { ...session.timeSpentPerQuestion },
    totalQuestions,
    totalMarks,
    marksObtained,
    percentage,
    accuracy,
    correctCount,
    incorrectCount,
    unansweredCount,
    passed,
    passingPercentage,
    timeTakenSeconds: session.totalElapsedSeconds,
    completedAt: new Date().toISOString(),
    autoSubmitted,
  };
}

export interface ChapterPerformanceStat {
  chapterNumber: number;
  chapterTitle: string;
  weightage: number;
  availableQuestions: number;
  attemptsCount: number; // Number of chapter-practice attempts + mock appearances
  chapterPracticeAttempts: number;
  questionsSeen: number;
  questionsAttempted: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number | null; // % correct out of attempted
  scorePercent: number | null; // % correct out of seen
  avgTimePerQuestion: number | null;
  lastAttemptedAt: string | null;
}

export interface ExamAnalyticsSummary {
  totalTestsAttempted: number;
  fullMockCount: number;
  chapterPracticeCount: number;
  highestScorePercent: number | null;
  highestMarksLabel: string | null;
  averageScorePercent: number | null;
  averageMarks: number | null;
  overallAccuracy: number | null;
  chaptersPractisedCount: number;
  totalChaptersCount: number;
  avgTimePerQuestionSeconds: number | null;
  chapterStats: ChapterPerformanceStat[];
  strongestChapters: ChapterPerformanceStat[];
  weakestChapters: ChapterPerformanceStat[];
  chronologicalTrend: {
    id: string;
    label: string;
    dateShort: string;
    scorePercent: number;
    accuracy: number;
    mode: string;
  }[];
}

export function computeExamAnalytics(
  exam: ExamDefinition,
  attempts: TestAttempt[],
  examQuestions: Question[]
): ExamAnalyticsSummary {
  const questionMap = new Map(examQuestions.map((q) => [q.id, q]));

  const totalTestsAttempted = attempts.length;
  const fullMockCount = attempts.filter((a) => a.mode === 'full-mock').length;
  const chapterPracticeCount = attempts.filter((a) => a.mode === 'chapter-practice').length;

  let highestScorePercent: number | null = null;
  let highestMarksLabel: string | null = null;
  let totalScorePercent = 0;
  let totalMarksSum = 0;
  let totalCorrect = 0;
  let totalAttemptedQuestions = 0;
  let totalTimeSpent = 0;
  let totalQuestionsTimed = 0;

  // Track chapter stats
  const chAcc = new Map<
    number,
    {
      chapterPracticeAttempts: number;
      appearancesInTests: Set<string>;
      questionsSeen: number;
      questionsAttempted: number;
      correctCount: number;
      incorrectCount: number;
      unansweredCount: number;
      timeSum: number;
      timeCount: number;
      lastAttemptedAt: string | null;
    }
  >();

  for (const ch of exam.chapters) {
    chAcc.set(ch.chapterNumber, {
      chapterPracticeAttempts: 0,
      appearancesInTests: new Set<string>(),
      questionsSeen: 0,
      questionsAttempted: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      timeSum: 0,
      timeCount: 0,
      lastAttemptedAt: null,
    });
  }

  for (const attempt of attempts) {
    if (highestScorePercent === null || attempt.percentage > highestScorePercent) {
      highestScorePercent = attempt.percentage;
      highestMarksLabel = `${attempt.marksObtained}/${attempt.totalMarks}`;
    }
    totalScorePercent += attempt.percentage;
    totalMarksSum += attempt.marksObtained;
    totalCorrect += attempt.correctCount;
    totalAttemptedQuestions += attempt.correctCount + attempt.incorrectCount;

    if (attempt.mode === 'chapter-practice' && attempt.chapterNumber !== undefined) {
      const entry = chAcc.get(attempt.chapterNumber);
      if (entry) {
        entry.chapterPracticeAttempts += 1;
      }
    }

    for (const qId of attempt.questionIds) {
      const q = questionMap.get(qId);
      const timeVal = attempt.timeSpentPerQuestion?.[qId] ?? 0;
      if (timeVal > 0) {
        totalTimeSpent += timeVal;
        totalQuestionsTimed += 1;
      }

      if (!q) continue;
      const entry = chAcc.get(q.chapterNumber);
      if (!entry) continue;

      entry.appearancesInTests.add(attempt.id);
      entry.questionsSeen += 1;
      if (!entry.lastAttemptedAt || new Date(attempt.completedAt) > new Date(entry.lastAttemptedAt)) {
        entry.lastAttemptedAt = attempt.completedAt;
      }

      if (timeVal > 0) {
        entry.timeSum += timeVal;
        entry.timeCount += 1;
      }

      const chosen = attempt.answers[qId];
      if (!chosen) {
        entry.unansweredCount += 1;
      } else {
        entry.questionsAttempted += 1;
        if (chosen === q.correctAnswer) {
          entry.correctCount += 1;
        } else {
          entry.incorrectCount += 1;
        }
      }
    }
  }

  const chapterStats: ChapterPerformanceStat[] = exam.chapters.map((ch) => {
    const availableQuestions = examQuestions.filter((q) => q.chapterNumber === ch.chapterNumber).length;
    const entry = chAcc.get(ch.chapterNumber)!;
    const accuracy =
      entry.questionsAttempted > 0
        ? Number(((entry.correctCount / entry.questionsAttempted) * 100).toFixed(1))
        : null;
    const scorePercent =
      entry.questionsSeen > 0
        ? Number(((entry.correctCount / entry.questionsSeen) * 100).toFixed(1))
        : null;
    const avgTimePerQuestion =
      entry.timeCount > 0 ? Number((entry.timeSum / entry.timeCount).toFixed(1)) : null;

    return {
      chapterNumber: ch.chapterNumber,
      chapterTitle: ch.title,
      weightage: ch.weightage,
      availableQuestions,
      attemptsCount: entry.appearancesInTests.size,
      chapterPracticeAttempts: entry.chapterPracticeAttempts,
      questionsSeen: entry.questionsSeen,
      questionsAttempted: entry.questionsAttempted,
      correctCount: entry.correctCount,
      incorrectCount: entry.incorrectCount,
      unansweredCount: entry.unansweredCount,
      accuracy,
      scorePercent,
      avgTimePerQuestion,
      lastAttemptedAt: entry.lastAttemptedAt,
    };
  });

  const chaptersPractisedCount = chapterStats.filter((c) => c.questionsSeen > 0).length;

  const practisedStats = chapterStats.filter((c) => c.accuracy !== null);
  const strongestChapters = [...practisedStats]
    .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0))
    .slice(0, 4);

  // Weakest chapters: practised chapters with lowest accuracy, plus unpractised chapters if few practised
  const weakestChapters = [...practisedStats]
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
    .slice(0, 4);

  const chronologicalTrend = [...attempts]
    .reverse()
    .slice(-15)
    .map((a, idx) => ({
      id: a.id,
      label: a.mode === 'full-mock' ? `Mock #${idx + 1}` : `Ch ${a.chapterNumber}`,
      dateShort: new Date(a.completedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      scorePercent: a.percentage,
      accuracy: a.accuracy,
      mode: a.mode === 'full-mock' ? 'Full Mock' : `Ch ${a.chapterNumber}`,
    }));

  return {
    totalTestsAttempted,
    fullMockCount,
    chapterPracticeCount,
    highestScorePercent,
    highestMarksLabel,
    averageScorePercent:
      totalTestsAttempted > 0 ? Number((totalScorePercent / totalTestsAttempted).toFixed(1)) : null,
    averageMarks: totalTestsAttempted > 0 ? Number((totalMarksSum / totalTestsAttempted).toFixed(1)) : null,
    overallAccuracy:
      totalAttemptedQuestions > 0
        ? Number(((totalCorrect / totalAttemptedQuestions) * 100).toFixed(1))
        : null,
    chaptersPractisedCount,
    totalChaptersCount: exam.chapters.length,
    avgTimePerQuestionSeconds:
      totalQuestionsTimed > 0 ? Number((totalTimeSpent / totalQuestionsTimed).toFixed(1)) : null,
    chapterStats,
    strongestChapters,
    weakestChapters,
    chronologicalTrend,
  };
}
