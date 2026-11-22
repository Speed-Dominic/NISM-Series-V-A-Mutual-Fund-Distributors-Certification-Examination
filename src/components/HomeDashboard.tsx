import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookMarked,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  History,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import { ActiveTestSession, AppView, ExamDefinition, TestAttempt } from '../types/exam';
import { ExamAnalyticsSummary, formatClock, formatDateTime, formatDuration } from '../utils/analytics';

interface HomeDashboardProps {
  exam: ExamDefinition;
  questionCount: number;
  analytics: ExamAnalyticsSummary;
  recentAttempts: TestAttempt[];
  activeSession: ActiveTestSession | null;
  onStartFullMock: () => void;
  onNavigate: (view: AppView) => void;
  onReviewAttempt: (attempt: TestAttempt) => void;
  onResumeSession: () => void;
  onDiscardSession: () => void;
}

export function HomeDashboard({
  exam,
  questionCount,
  analytics,
  recentAttempts,
  activeSession,
  onStartFullMock,
  onNavigate,
  onReviewAttempt,
  onResumeSession,
  onDiscardSession,
}: HomeDashboardProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Interrupted Examination Resume Banner */}
      {activeSession && (
        <div
          role="region"
          aria-label="Interrupted Test Session"
          className="mb-8 flex flex-col justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50/70 p-5 sm:flex-row sm:items-center dark:border-amber-800/60 dark:bg-neutral-950"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Unfinished Examination Session Saved
              </h2>
              <p className="mt-1 text-sm text-slate-700 dark:text-neutral-300">
                <span>
                  {activeSession.mode === 'full-mock'
                    ? 'Full Mock Test'
                    : `Chapter ${activeSession.chapterNumber}: ${activeSession.chapterTitle}`}
                </span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono-tabular">
                  Question {activeSession.currentIndex + 1} of {activeSession.questionIds.length}
                </span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono-tabular">
                  {Object.keys(activeSession.answers).length} answered
                </span>
                <span aria-hidden="true"> · </span>
                <span className="font-mono-tabular font-semibold">
                  {activeSession.mode === 'full-mock'
                    ? `${formatClock(activeSession.remainingSeconds)} remaining`
                    : `${formatClock(activeSession.questionRemainingSeconds)} left on current question`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onDiscardSession}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Discard</span>
            </button>
            <button
              type="button"
              onClick={onResumeSession}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-700 whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Resume Examination</span>
            </button>
          </div>
        </div>
      )}

      {/* Exam Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end dark:border-neutral-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
            <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
              {exam.code}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{exam.chapters.length} Chapters</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-tabular">{questionCount} Questions in Bank</span>
            {exam.passingPercentage !== null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">Passing Score {exam.passingPercentage}%</span>
              </>
            )}
          </div>
          <h1 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white [text-wrap:balance]">
            {exam.name}
          </h1>
        </div>
      </div>

      {/* Home Dashboard Statistics Strip */}
      <section aria-label="Preparation Summary Metrics" className="mt-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              Total Tests Attempted
            </div>
            <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
              {analytics.totalTestsAttempted}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400 font-mono-tabular">
              {analytics.fullMockCount} Mock · {analytics.chapterPracticeCount} Chapter
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              Highest Score
            </div>
            <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
              {analytics.highestScorePercent !== null ? `${analytics.highestScorePercent}%` : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400 font-mono-tabular">
              {analytics.highestMarksLabel ? `Best: ${analytics.highestMarksLabel} marks` : 'No attempts yet'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              Average Score
            </div>
            <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
              {analytics.averageScorePercent !== null ? `${analytics.averageScorePercent}%` : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400 font-mono-tabular">
              {analytics.averageMarks !== null ? `Avg ${analytics.averageMarks} marks` : 'Across completed tests'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              Overall Accuracy
            </div>
            <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
              {analytics.overallAccuracy !== null ? `${analytics.overallAccuracy}%` : '—'}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
              Correct out of attempted
            </div>
          </div>

          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 sm:col-span-1 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="text-xs font-medium text-slate-500 dark:text-neutral-400">
              Chapters Practised
            </div>
            <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-white">
              {analytics.chaptersPractisedCount} / {analytics.totalChaptersCount}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-neutral-400">
              Syllabus modules covered
            </div>
          </div>
        </div>
      </section>

      {/* Primary Action Modes */}
      <section aria-label="Study and Examination Modes" className="mt-8">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Examination & Practice Modes
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Card 1: Full Mock Test (Dominant Primary Anchor) */}
          <div className="flex flex-col justify-between rounded-xl border border-blue-200 bg-white p-6 dark:border-blue-500/40 dark:bg-neutral-950">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                  <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono-tabular text-xs font-medium text-slate-500 dark:text-neutral-400">
                  100 Questions · 100 Marks · 120 Minutes
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">
                Full Mock Test
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                Simulates the real NISM examination with 100 chapter-weighted MCQs across the full syllabus, a single 120-minute countdown timer, review palette, and zero negative marking.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-neutral-800">
              <span className="text-xs text-slate-500 dark:text-neutral-400">
                {questionCount === 0
                  ? 'Question bank is empty · Add questions first'
                  : `Auto-submits at 00:00 · Pass mark ${exam.passingPercentage ?? 50}%`}
              </span>
              {questionCount === 0 ? (
                <button
                  type="button"
                  onClick={() => onNavigate('question-bank')}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <span>Add Questions</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartFullMock}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <span>Start Full Mock Test</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* Card 2: Chapter-wise Practice */}
          <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
            <div>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-300">
                  <BookMarked className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="font-mono-tabular text-xs font-medium text-slate-500 dark:text-neutral-400">
                  Up to 25 Questions · 60s / Question
                </span>
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">
                Chapter-wise Practice
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-neutral-300">
                Master individual syllabus chapters with 5 to 25 randomized MCQs exclusively from your chosen chapter and a focused 60-second countdown per question.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-neutral-800">
              <span className="text-xs text-slate-500 dark:text-neutral-400">
                {exam.chapters.length} chapters ready for targeted drills
              </span>
              <button
                type="button"
                onClick={() => onNavigate('chapters')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <span>Select Chapter</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Card 3: Performance Dashboard */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-start gap-3.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-300">
                <BarChart3 className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Performance Dashboard
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                  Inspect chapter strengths, accuracy trends, average pace, and practise weak chapters.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analytics')}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              Open Analytics
            </button>
          </div>

          {/* Card 4: Test History */}
          <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="flex items-start gap-3.5">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-neutral-900 dark:text-neutral-300">
                <History className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Test History
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
                  Revisit all completed mock exams and chapter drills with full answer explanations.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap shrink-0"
            >
              View History
            </button>
          </div>
        </div>
      </section>

      {/* Recent Test Results */}
      <section aria-label="Recent Test Results" className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Recent Test Results
          </h2>
          {recentAttempts.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              View All Attempts
            </button>
          )}
        </div>

        {recentAttempts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-950">
            <Clock className="mx-auto h-8 w-8 text-slate-400 dark:text-neutral-500" aria-hidden="true" />
            <h3 className="mt-3 font-display text-base font-semibold text-slate-900 dark:text-white">
              No completed tests for {exam.code} yet
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-neutral-400">
              Launch a 100-question Full Mock Test or pick a chapter to record your first benchmark score.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {questionCount === 0 ? (
                <button
                  type="button"
                  onClick={() => onNavigate('question-bank')}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  Open Question Bank to Add MCQs
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onStartFullMock}
                    className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                  >
                    Start Full Mock Test
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('chapters')}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                  >
                    Practise a Chapter
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-neutral-800 dark:bg-black dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Test Mode / Chapter</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3 text-right">Accuracy</th>
                  <th className="px-4 py-3 text-right">Time</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {recentAttempts.slice(0, 5).map((attempt) => (
                  <tr
                    key={attempt.id}
                    className="transition-colors hover:bg-slate-50/70 dark:hover:bg-neutral-900/60"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-slate-900 dark:text-neutral-100">
                        {attempt.mode === 'full-mock'
                          ? 'Full Mock Test'
                          : `Chapter ${attempt.chapterNumber}: ${attempt.chapterTitle}`}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-neutral-400 font-mono-tabular">
                        {attempt.totalQuestions} Questions
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-neutral-400 font-mono-tabular whitespace-nowrap">
                      {formatDateTime(attempt.completedAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono-tabular font-semibold text-slate-900 dark:text-neutral-100 whitespace-nowrap">
                      {attempt.marksObtained}/{attempt.totalMarks} ({attempt.percentage}%)
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono-tabular text-slate-700 dark:text-neutral-300 whitespace-nowrap">
                      {attempt.accuracy}%
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono-tabular text-xs text-slate-600 dark:text-neutral-400 whitespace-nowrap">
                      {formatDuration(attempt.timeTakenSeconds)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {attempt.passed === true && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Pass
                        </span>
                      )}
                      {attempt.passed === false && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 dark:text-rose-400">
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Fail
                        </span>
                      )}
                      {attempt.passed === null && (
                        <span className="text-xs text-slate-500 dark:text-neutral-400">Completed</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onReviewAttempt(attempt)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
