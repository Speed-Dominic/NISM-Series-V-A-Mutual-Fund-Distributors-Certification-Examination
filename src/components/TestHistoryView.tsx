import { CheckCircle2, ClipboardList, Trash2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ExamDefinition, TestAttempt } from '../types/exam';
import { formatDateTime, formatDuration } from '../utils/analytics';

interface TestHistoryViewProps {
  exam: ExamDefinition;
  attempts: TestAttempt[];
  onReviewAttempt: (attempt: TestAttempt) => void;
  onDeleteAttempt: (attemptId: string) => void;
  onStartFullMock: () => void;
  onGoToChapters: () => void;
}

type HistoryFilter = 'all' | 'full-mock' | 'chapter-practice';

export function TestHistoryView({
  exam,
  attempts,
  onReviewAttempt,
  onDeleteAttempt,
  onStartFullMock,
  onGoToChapters,
}: TestHistoryViewProps) {
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredAttempts = useMemo(() => {
    if (filter === 'all') return attempts;
    return attempts.filter((a) => a.mode === filter);
  }, [attempts, filter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            {exam.code} · Saved Records
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Test History
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
            Open any past mock examination or chapter practice attempt to inspect your responses and detailed explanations.
          </p>
        </div>

        {/* Mode Filter Segmented Control */}
        <div
          className="inline-flex items-center gap-1 self-start rounded-lg bg-slate-100 p-1 md:self-auto dark:bg-slate-800"
          role="tablist"
          aria-label="Filter test history by mode"
        >
          {(
            [
              { id: 'all', label: `All (${attempts.length})` },
              {
                id: 'full-mock',
                label: `Full Mock (${attempts.filter((a) => a.mode === 'full-mock').length})`,
              },
              {
                id: 'chapter-practice',
                label: `Chapter Practice (${attempts.filter((a) => a.mode === 'chapter-practice').length})`,
              },
            ] as { id: HistoryFilter; label: string }[]
          ).map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(tab.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {filteredAttempts.length === 0 ? (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <ClipboardList className="mx-auto h-9 w-9 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            No test attempts found
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            All completed full mock exams and chapter-wise drills are saved locally in your browser database.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onStartFullMock}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
            >
              Start Full Mock Test
            </button>
            <button
              type="button"
              onClick={onGoToChapters}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Chapter-wise Practice
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5">Test Type</th>
                <th className="px-4 py-3.5">Chapter</th>
                <th className="px-4 py-3.5">Date &amp; Time</th>
                <th className="px-4 py-3.5 text-right">Questions</th>
                <th className="px-4 py-3.5 text-right">Score</th>
                <th className="px-4 py-3.5 text-right">Percentage</th>
                <th className="px-4 py-3.5 text-right">Accuracy</th>
                <th className="px-4 py-3.5 text-right">Time Taken</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAttempts.map((attempt) => (
                <tr
                  key={attempt.id}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {attempt.mode === 'full-mock' ? 'Full Mock Test' : 'Chapter Practice'}
                  </td>
                  <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                    {attempt.mode === 'chapter-practice'
                      ? `Ch. ${attempt.chapterNumber}: ${attempt.chapterTitle}`
                      : 'All Syllabus Chapters'}
                  </td>
                  <td className="px-4 py-3.5 font-mono-tabular text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatDateTime(attempt.completedAt)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                    {attempt.totalQuestions}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-tabular font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {attempt.marksObtained} / {attempt.totalMarks}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                    {attempt.percentage}%
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                    {attempt.accuracy}%
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono-tabular text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
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
                      <span className="text-xs text-slate-500 dark:text-slate-400">Completed</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onReviewAttempt(attempt)}
                        className="rounded-md bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                      >
                        Review Answers
                      </button>

                      {confirmDeleteId === attempt.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteAttempt(attempt.id);
                              setConfirmDeleteId(null);
                            }}
                            className="rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(attempt.id)}
                          aria-label={`Delete attempt from ${formatDateTime(attempt.completedAt)}`}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
