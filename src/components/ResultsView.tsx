import {
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { ExamDefinition, OptionKey, Question, TestAttempt } from '../types/exam';
import { formatDateTime, formatDuration } from '../utils/analytics';

interface ResultsViewProps {
  attempt: TestAttempt;
  exam: ExamDefinition;
  questionMap: Map<string, Question>;
  onBackToDashboard: () => void;
  onRetakeTest: () => void;
}

type ReviewFilter = 'all' | 'correct' | 'incorrect' | 'unanswered' | 'marked';

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

export function ResultsView({
  attempt,
  exam,
  questionMap,
  onBackToDashboard,
  onRetakeTest,
}: ResultsViewProps) {
  const [filter, setFilter] = useState<ReviewFilter>('all');

  const reviewItems = useMemo(() => {
    return attempt.questionIds
      .map((qId, idx) => {
        const question = questionMap.get(qId);
        if (!question) return null;
        const selected = attempt.answers[qId] ?? null;
        const status: 'correct' | 'incorrect' | 'unanswered' = !selected
          ? 'unanswered'
          : selected === question.correctAnswer
          ? 'correct'
          : 'incorrect';
        const isMarked = attempt.markedForReview.includes(qId);
        const timedOut = attempt.timedOutQuestionIds.includes(qId);
        const timeSpent = attempt.timeSpentPerQuestion?.[qId] ?? 0;

        return {
          index: idx + 1,
          question,
          selected,
          status,
          isMarked,
          timedOut,
          timeSpent,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [attempt, questionMap]);

  const filteredItems = useMemo(() => {
    return reviewItems.filter((item) => {
      if (filter === 'all') return true;
      if (filter === 'marked') return item.isMarked;
      return item.status === filter;
    });
  }, [reviewItems, filter]);

  // Chapter breakdown for Full Mock Tests
  const chapterBreakdown = useMemo(() => {
    if (attempt.mode !== 'full-mock') return [];
    const map = new Map<
      number,
      { chapterNumber: number; title: string; total: number; correct: number; incorrect: number; unanswered: number }
    >();
    for (const item of reviewItems) {
      const chNum = item.question.chapterNumber;
      const existing = map.get(chNum) ?? {
        chapterNumber: chNum,
        title: item.question.chapterTitle,
        total: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
      };
      existing.total += 1;
      if (item.status === 'correct') existing.correct += 1;
      else if (item.status === 'incorrect') existing.incorrect += 1;
      else existing.unanswered += 1;
      map.set(chNum, existing);
    }
    return Array.from(map.values()).sort((a, b) => a.chapterNumber - b.chapterNumber);
  }, [attempt.mode, reviewItems]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Dashboard</span>
        </button>

        <button
          type="button"
          onClick={onRetakeTest}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {attempt.mode === 'full-mock' ? 'New Full Mock Test' : 'Retake Chapter Drill'}
          </span>
        </button>
      </div>

      {/* Results Hero Summary */}
      <section
        aria-label="Test Score Summary"
        className="mt-6 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center dark:border-slate-800">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <span>{exam.code}</span>
              <span aria-hidden="true"> · </span>
              <span>
                {attempt.mode === 'full-mock'
                  ? 'Full Mock Test'
                  : `Chapter ${attempt.chapterNumber}: ${attempt.chapterTitle}`}
              </span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono-tabular">{formatDateTime(attempt.completedAt)}</span>
              {attempt.autoSubmitted && (
                <>
                  <span aria-hidden="true"> · </span>
                  <span className="font-medium text-amber-700 dark:text-amber-400">
                    Auto-submitted on timer expiry
                  </span>
                </>
              )}
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
              Examination Result &amp; Answer Review
            </h1>
          </div>

          {/* Pass / Fail Status */}
          {attempt.passed !== null && (
            <div
              className={`inline-flex items-center gap-2 self-start rounded-lg border px-4 py-2.5 text-sm font-bold md:self-auto ${
                attempt.passed
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-300'
              }`}
            >
              {attempt.passed ? (
                <>
                  <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>PASSED (Pass Mark {attempt.passingPercentage}%)</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>DID NOT PASS (Pass Mark {attempt.passingPercentage}%)</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Core Score Metrics Grid */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Marks Obtained</div>
            <div className="mt-1 font-mono-tabular text-xl font-bold text-slate-900 dark:text-slate-100">
              {attempt.marksObtained} / {attempt.totalMarks}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Percentage</div>
            <div className="mt-1 font-mono-tabular text-xl font-bold text-blue-700 dark:text-blue-400">
              {attempt.percentage}%
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Accuracy</div>
            <div className="mt-1 font-mono-tabular text-xl font-bold text-slate-900 dark:text-slate-100">
              {attempt.accuracy}%
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Correct</div>
            <div className="mt-1 font-mono-tabular text-xl font-bold text-emerald-700 dark:text-emerald-400">
              {attempt.correctCount}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Incorrect</div>
            <div className="mt-1 font-mono-tabular text-xl font-bold text-rose-700 dark:text-rose-400">
              {attempt.incorrectCount}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Unanswered</div>
            <div className="mt-1 font-mono-tabular text-xl font-bold text-slate-600 dark:text-slate-300">
              {attempt.unansweredCount}
            </div>
          </div>

          <div className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 sm:col-span-1 dark:border-slate-800 dark:bg-slate-950">
            <div className="text-xs text-slate-500 dark:text-slate-400">Time Taken</div>
            <div className="mt-1 font-mono-tabular text-xl font-bold text-slate-900 dark:text-slate-100">
              {formatDuration(attempt.timeTakenSeconds)}
            </div>
          </div>
        </div>

        {/* Visual Score Proportion Bar */}
        <div className="mt-6">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="bg-emerald-600"
              style={{ width: `${(attempt.correctCount / attempt.totalQuestions) * 100}%` }}
              title={`Correct: ${attempt.correctCount}`}
            />
            <div
              className="bg-rose-600"
              style={{ width: `${(attempt.incorrectCount / attempt.totalQuestions) * 100}%` }}
              title={`Incorrect: ${attempt.incorrectCount}`}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400 font-mono-tabular">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" aria-hidden="true" />
              Correct ({attempt.correctCount})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-rose-600" aria-hidden="true" />
              Incorrect ({attempt.incorrectCount})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-slate-300 dark:bg-slate-700" aria-hidden="true" />
              Unanswered ({attempt.unansweredCount})
            </span>
          </div>
        </div>
      </section>

      {/* Chapter-wise Breakdown (for Full Mock Tests) */}
      {chapterBreakdown.length > 0 && (
        <section
          aria-label="Chapter-wise Breakdown"
          className="mt-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
            Chapter-wise Score Breakdown
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="py-2.5 pr-4">Chapter</th>
                  <th className="py-2.5 px-3 text-right">Questions</th>
                  <th className="py-2.5 px-3 text-right">Correct</th>
                  <th className="py-2.5 px-3 text-right">Incorrect</th>
                  <th className="py-2.5 px-3 text-right">Unanswered</th>
                  <th className="py-2.5 pl-3 text-right">Score %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {chapterBreakdown.map((ch) => {
                  const pct = ch.total > 0 ? Math.round((ch.correct / ch.total) * 100) : 0;
                  return (
                    <tr key={ch.chapterNumber}>
                      <td className="py-3 pr-4 font-medium text-slate-900 dark:text-slate-100">
                        Ch. {ch.chapterNumber}: {ch.title}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                        {ch.total}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                        {ch.correct}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-rose-700 dark:text-rose-400">
                        {ch.incorrect}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-tabular text-slate-500 dark:text-slate-400">
                        {ch.unanswered}
                      </td>
                      <td className="py-3 pl-3 text-right font-mono-tabular font-semibold text-slate-900 dark:text-slate-100">
                        {pct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Question-by-Question Answer Review */}
      <section aria-label="Question-by-Question Answer Review" className="mt-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            Detailed Answer Review ({filteredItems.length})
          </h2>

          {/* Filter Tabs */}
          <div
            className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
            role="tablist"
            aria-label="Filter reviewed questions"
          >
            {(
              [
                { id: 'all', label: `All (${reviewItems.length})` },
                { id: 'correct', label: `Correct (${attempt.correctCount})` },
                { id: 'incorrect', label: `Incorrect (${attempt.incorrectCount})` },
                { id: 'unanswered', label: `Unanswered (${attempt.unansweredCount})` },
                ...(attempt.markedForReview.length > 0
                  ? [{ id: 'marked', label: `Marked (${attempt.markedForReview.length})` }]
                  : []),
              ] as { id: ReviewFilter; label: string }[]
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

        <div className="mt-5 space-y-5">
          {filteredItems.map((item) => {
            const { question, selected, status, index, timedOut, timeSpent } = item;

            return (
              <article
                key={question.id}
                className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Question Metadata & Explicit Status */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                      Q{index}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Ch. {question.chapterNumber}: {question.chapterTitle}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{question.topic}</span>
                    <span aria-hidden="true">·</span>
                    <span>{question.difficulty}</span>
                    {timeSpent > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-tabular">{timeSpent}s spent</span>
                      </>
                    )}
                  </div>

                  {/* Explicit Status Indicator */}
                  <div>
                    {status === 'correct' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>Correct</span>
                      </span>
                    )}
                    {status === 'incorrect' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        <span>Incorrect</span>
                      </span>
                    )}
                    {status === 'unanswered' && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                        <HelpCircle className="h-4 w-4" aria-hidden="true" />
                        <span>{timedOut ? 'Unanswered (Timed Out)' : 'Unanswered'}</span>
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-4 font-display text-base font-semibold leading-relaxed text-slate-900 sm:text-lg dark:text-slate-100">
                  {question.questionText}
                </h3>

                {/* All Four Options */}
                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {OPTION_KEYS.map((optKey) => {
                    const isCorrectOpt = question.correctAnswer === optKey;
                    const isStudentOpt = selected === optKey;

                    let cardClass =
                      'border-slate-200 bg-slate-50/50 text-slate-700 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300';
                    if (isCorrectOpt) {
                      cardClass =
                        'border-emerald-500 bg-emerald-50/70 text-slate-900 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-slate-100';
                    } else if (isStudentOpt && !isCorrectOpt) {
                      cardClass =
                        'border-rose-400 bg-rose-50/70 text-slate-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-slate-100';
                    }

                    return (
                      <div
                        key={optKey}
                        className={`flex items-start gap-3 rounded-lg border p-3.5 text-sm ${cardClass}`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded font-mono-tabular text-xs font-bold ${
                            isCorrectOpt
                              ? 'bg-emerald-600 text-white'
                              : isStudentOpt
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {optKey}
                        </span>
                        <div className="flex-1">
                          <div className="leading-relaxed">{question.options[optKey]}</div>
                          {(isCorrectOpt || isStudentOpt) && (
                            <div className="mt-1.5 flex flex-wrap gap-2 text-xs font-semibold">
                              {isCorrectOpt && (
                                <span className="text-emerald-700 dark:text-emerald-400">
                                  Correct Answer
                                </span>
                              )}
                              {isStudentOpt && (
                                <span
                                  className={
                                    isCorrectOpt
                                      ? 'text-emerald-700 dark:text-emerald-400'
                                      : 'text-rose-700 dark:text-rose-400'
                                  }
                                >
                                  Your Selection
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected vs Correct Summary + Detailed Explanation */}
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex flex-wrap items-center gap-4 text-xs font-mono-tabular text-slate-600 dark:text-slate-400">
                    <span>
                      Your Answer:{' '}
                      <strong className="text-slate-900 dark:text-slate-100">
                        {selected ? `Option ${selected}` : 'Not Answered'}
                      </strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Correct Answer:{' '}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        Option {question.correctAnswer}
                      </strong>
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Explanation:{' '}
                    </span>
                    {question.explanation}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
