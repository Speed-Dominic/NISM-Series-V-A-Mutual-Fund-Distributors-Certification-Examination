import {
  AlertTriangle,
  Bookmark,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eraser,
  Grid,
  Send,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActiveTestSession, OptionKey, Question } from '../types/exam';
import { formatClock } from '../utils/analytics';

interface ExamWorkbenchProps {
  session: ActiveTestSession;
  questions: Question[];
  onUpdateSession: (updated: ActiveTestSession) => void;
  onSubmitTest: (finalSession: ActiveTestSession, autoSubmitted: boolean) => void;
}

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D'];

export function ExamWorkbench({
  session,
  questions,
  onUpdateSession,
  onSubmitTest,
}: ExamWorkbenchProps) {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showMobilePalette, setShowMobilePalette] = useState(false);

  // Keep latest session in ref for interval ticks & unload persistence without stale closures
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const submittedRef = useRef(false);

  const currentQuestion = questions[session.currentIndex];
  const totalQuestions = questions.length;
  const isFullMock = session.mode === 'full-mock';

  const triggerSubmit = useCallback(
    (finalSess: ActiveTestSession, auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      onSubmitTest(finalSess, auto);
    },
    [onSubmitTest]
  );

  // 1-second timer loop for both Full Mock (total countdown) and Chapter Practice (60s per question)
  useEffect(() => {
    const interval = window.setInterval(() => {
      const s = sessionRef.current;
      if (submittedRef.current) return;
      const curQId = s.questionIds[s.currentIndex];
      if (!curQId) return;

      const updatedTimeSpent = {
        ...s.timeSpentPerQuestion,
        [curQId]: (s.timeSpentPerQuestion[curQId] ?? 0) + 1,
      };

      if (s.mode === 'full-mock') {
        const nextRemaining = Math.max(0, s.remainingSeconds - 1);
        const nextSession: ActiveTestSession = {
          ...s,
          remainingSeconds: nextRemaining,
          totalElapsedSeconds: s.totalElapsedSeconds + 1,
          timeSpentPerQuestion: updatedTimeSpent,
        };
        if (nextRemaining <= 0) {
          onUpdateSession(nextSession);
          triggerSubmit(nextSession, true);
        } else {
          onUpdateSession(nextSession);
        }
      } else {
        // Chapter-wise 60s per-question timer
        const isAlreadyTimedOut = s.timedOutQuestionIds.includes(curQId);
        if (isAlreadyTimedOut) {
          onUpdateSession({
            ...s,
            totalElapsedSeconds: s.totalElapsedSeconds + 1,
            timeSpentPerQuestion: updatedTimeSpent,
          });
          return;
        }

        const nextQRem = Math.max(0, s.questionRemainingSeconds - 1);
        const nextPerQ = {
          ...s.perQuestionRemainingSeconds,
          [curQId]: nextQRem,
        };

        if (nextQRem <= 0) {
          // Timer expired: automatically mark question unanswered and proceed to next question (or end if last)
          const cleanedAnswers = { ...s.answers };
          delete cleanedAnswers[curQId];
          const nextTimedOut = s.timedOutQuestionIds.includes(curQId)
            ? s.timedOutQuestionIds
            : [...s.timedOutQuestionIds, curQId];

          if (s.currentIndex >= s.questionIds.length - 1) {
            const finalSess: ActiveTestSession = {
              ...s,
              answers: cleanedAnswers,
              timedOutQuestionIds: nextTimedOut,
              questionRemainingSeconds: 0,
              perQuestionRemainingSeconds: nextPerQ,
              totalElapsedSeconds: s.totalElapsedSeconds + 1,
              timeSpentPerQuestion: updatedTimeSpent,
            };
            onUpdateSession(finalSess);
            triggerSubmit(finalSess, true);
          } else {
            const nextIndex = s.currentIndex + 1;
            const nextQId = s.questionIds[nextIndex];
            const nextQTimer = s.perQuestionRemainingSeconds[nextQId] ?? 60;
            onUpdateSession({
              ...s,
              currentIndex: nextIndex,
              answers: cleanedAnswers,
              timedOutQuestionIds: nextTimedOut,
              questionRemainingSeconds: nextQTimer,
              perQuestionRemainingSeconds: {
                ...nextPerQ,
                [nextQId]: nextQTimer,
              },
              totalElapsedSeconds: s.totalElapsedSeconds + 1,
              timeSpentPerQuestion: updatedTimeSpent,
            });
          }
        } else {
          onUpdateSession({
            ...s,
            questionRemainingSeconds: nextQRem,
            perQuestionRemainingSeconds: nextPerQ,
            totalElapsedSeconds: s.totalElapsedSeconds + 1,
            timeSpentPerQuestion: updatedTimeSpent,
          });
        }
      }
    }, 1000);

    return () => window.clearInterval(interval);
  }, [onUpdateSession, triggerSubmit]);

  const navigateToIndex = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= totalQuestions) return;
    const s = sessionRef.current;
    const curQId = s.questionIds[s.currentIndex];
    const targetQId = s.questionIds[targetIndex];

    if (s.mode === 'chapter-practice') {
      const updatedPerQ = {
        ...s.perQuestionRemainingSeconds,
        [curQId]: s.questionRemainingSeconds,
      };
      // If visiting a new question, reset countdown to 60s; if revisiting an unexpired one, restore its remaining time
      const nextTimer = updatedPerQ[targetQId] !== undefined ? updatedPerQ[targetQId] : 60;
      onUpdateSession({
        ...s,
        currentIndex: targetIndex,
        questionRemainingSeconds: nextTimer,
        perQuestionRemainingSeconds: {
          ...updatedPerQ,
          [targetQId]: nextTimer,
        },
      });
    } else {
      onUpdateSession({
        ...s,
        currentIndex: targetIndex,
      });
    }
    setShowMobilePalette(false);
  };

  const isCurrentTimedOut =
    !isFullMock && currentQuestion ? session.timedOutQuestionIds.includes(currentQuestion.id) : false;

  const handleSelectOption = (opt: OptionKey) => {
    if (!currentQuestion || isCurrentTimedOut) return;
    onUpdateSession({
      ...session,
      answers: {
        ...session.answers,
        [currentQuestion.id]: opt,
      },
    });
  };

  const handleClearAnswer = () => {
    if (!currentQuestion || isCurrentTimedOut) return;
    const nextAnswers = { ...session.answers };
    delete nextAnswers[currentQuestion.id];
    onUpdateSession({
      ...session,
      answers: nextAnswers,
    });
  };

  const handleToggleReview = () => {
    if (!currentQuestion) return;
    const exists = session.markedForReview.includes(currentQuestion.id);
    const nextMarked = exists
      ? session.markedForReview.filter((id) => id !== currentQuestion.id)
      : [...session.markedForReview, currentQuestion.id];
    onUpdateSession({
      ...session,
      markedForReview: nextMarked,
    });
  };

  const summaryCounts = useMemo(() => {
    const answeredCount = session.questionIds.filter((id) => Boolean(session.answers[id])).length;
    const unansweredCount = totalQuestions - answeredCount;
    const markedCount = session.markedForReview.length;
    const answeredAndMarkedCount = session.questionIds.filter(
      (id) => Boolean(session.answers[id]) && session.markedForReview.includes(id)
    ).length;
    return { answeredCount, unansweredCount, markedCount, answeredAndMarkedCount };
  }, [session.answers, session.markedForReview, session.questionIds, totalQuestions]);

  if (!currentQuestion) {
    return null;
  }

  const selectedOption = session.answers[currentQuestion.id];
  const isMarked = session.markedForReview.includes(currentQuestion.id);

  // Timer warning state
  const isTimerCritical = isFullMock
    ? session.remainingSeconds <= 300 // last 5 mins
    : session.questionRemainingSeconds <= 10; // last 10 secs

  const renderPaletteGrid = () => (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-neutral-300">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-emerald-600 shrink-0" aria-hidden="true" />
          <span>Answered ({summaryCounts.answeredCount - summaryCounts.answeredAndMarkedCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded border border-slate-300 bg-white dark:border-neutral-700 dark:bg-black shrink-0" aria-hidden="true" />
          <span>Unanswered ({summaryCounts.unansweredCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded bg-amber-500 shrink-0" aria-hidden="true" />
          <span>Marked ({summaryCounts.markedCount - summaryCounts.answeredAndMarkedCount})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative h-3.5 w-3.5 rounded bg-indigo-600 shrink-0" aria-hidden="true">
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span>Ans &amp; Marked ({summaryCounts.answeredAndMarkedCount})</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
        {session.questionIds.map((qId, idx) => {
          const isCurrent = idx === session.currentIndex;
          const hasAns = Boolean(session.answers[qId]);
          const hasMark = session.markedForReview.includes(qId);
          const timedOut = !isFullMock && session.timedOutQuestionIds.includes(qId);

          let styleClasses =
            'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:bg-black dark:text-neutral-200 dark:hover:bg-neutral-900';
          let stateLabel = 'Unanswered';

          if (hasAns && hasMark) {
            styleClasses =
              'border-indigo-700 bg-indigo-600 text-white hover:bg-indigo-700';
            stateLabel = 'Answered and Marked for Review';
          } else if (hasAns) {
            styleClasses =
              'border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700';
            stateLabel = 'Answered';
          } else if (hasMark) {
            styleClasses =
              'border-amber-600 bg-amber-500 text-white hover:bg-amber-600';
            stateLabel = 'Marked for Review';
          } else if (timedOut) {
            styleClasses =
              'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300';
            stateLabel = 'Timed Out Unanswered';
          }

          return (
            <button
              key={qId}
              type="button"
              onClick={() => navigateToIndex(idx)}
              aria-label={`Question ${idx + 1}: ${stateLabel}`}
              aria-current={isCurrent ? 'step' : undefined}
              className={`relative flex h-10 items-center justify-center rounded-lg border font-mono-tabular text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${styleClasses} ${
                isCurrent ? 'ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-black' : ''
              }`}
            >
              <span>{idx + 1}</span>
              {hasAns && hasMark && (
                <span
                  className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-emerald-300"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-black flex flex-col">
      {/* Distraction-free Examination Top Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white dark:border-neutral-800 dark:bg-black/95">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-bold text-slate-900 dark:text-white">
              {isFullMock
                ? `${session.examName.split(':')[0]} · Full Mock Test`
                : `Chapter ${session.chapterNumber}: ${session.chapterTitle}`}
            </div>
            <div className="font-mono-tabular text-xs text-slate-500 dark:text-neutral-400">
              Question {session.currentIndex + 1} of {totalQuestions}
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Timer */}
            <div
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono-tabular text-sm font-bold ${
                isTimerCritical
                  ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : 'border-slate-200 bg-slate-50 text-slate-900 dark:border-neutral-800 dark:bg-neutral-950 dark:text-white'
              }`}
              aria-live="off"
            >
              <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {isFullMock
                  ? formatClock(session.remainingSeconds)
                  : formatClock(session.questionRemainingSeconds)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowMobilePalette(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 lg:hidden dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-200"
              aria-label="Open Question Palette"
            >
              <Grid className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Palette</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
            >
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Submit Test</span>
            </button>
          </div>
        </div>

        {/* 60-second visual progress strip for Chapter-wise Mode */}
        {!isFullMock && (
          <div className="h-1 w-full bg-slate-200 dark:bg-neutral-900" aria-hidden="true">
            <div
              className={`h-full transition-all duration-300 ${
                session.questionRemainingSeconds <= 10 ? 'bg-rose-600' : 'bg-blue-600'
              }`}
              style={{ width: `${(session.questionRemainingSeconds / 60) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* Main Examination Content */}
      <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12 lg:px-8">
        {/* Left/Center Question Canvas */}
        <section className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 sm:p-8 lg:col-span-8 dark:border-neutral-800 dark:bg-neutral-950">
          <div>
            {/* Question Header Metadata (unboxed) */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4 text-xs text-slate-500 dark:border-neutral-800 dark:text-neutral-400">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono-tabular font-bold text-slate-900 dark:text-white">
                  Question {session.currentIndex + 1} of {totalQuestions}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Ch. {currentQuestion.chapterNumber}: {currentQuestion.chapterTitle}
                </span>
                <span aria-hidden="true">·</span>
                <span>{currentQuestion.topic}</span>
              </div>
              <div className="font-mono-tabular">
                {isFullMock ? '1 Mark · No Negative Marking' : '60s Question Limit'}
              </div>
            </div>

            {isCurrentTimedOut && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  Time expired for this question. It has been marked unanswered automatically.
                </span>
              </div>
            )}

            {/* Question Text */}
            <h2 className="mt-6 whitespace-pre-line font-display text-lg font-semibold leading-relaxed text-slate-900 sm:text-xl dark:text-white">
              {currentQuestion.questionText}
            </h2>

            {/* Four Selectable Options */}
            <div className="mt-6 space-y-3" role="radiogroup" aria-label="Answer Options">
              {OPTION_KEYS.map((optKey) => {
                const isSelected = selectedOption === optKey;
                return (
                  <button
                    key={optKey}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isCurrentTimedOut}
                    onClick={() => handleSelectOption(optKey)}
                    className={`flex min-h-[52px] w-full items-start gap-3.5 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-65 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-slate-900 dark:border-blue-500 dark:bg-blue-950/40 dark:text-white'
                        : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50 dark:border-neutral-800 dark:bg-black dark:text-neutral-200 dark:hover:border-neutral-700 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono-tabular text-xs font-bold ${
                        isSelected
                          ? 'border-blue-700 bg-blue-700 text-white dark:border-blue-500 dark:bg-blue-600'
                          : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                      }`}
                    >
                      {optKey}
                    </span>
                    <span className="whitespace-pre-line text-sm sm:text-base leading-relaxed">
                      {currentQuestion.options[optKey]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Controls Bar (sticky on mobile screens for 1-thumb navigation) */}
          <div className="sticky bottom-0 z-20 -mx-5 -mb-5 mt-8 flex flex-wrap items-center justify-between gap-2.5 rounded-b-xl border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:mb-0 sm:rounded-none sm:border-slate-100 sm:bg-transparent sm:px-0 sm:py-0 sm:pt-5 dark:border-neutral-800 dark:bg-black/95 sm:dark:bg-transparent">
            <div className="flex flex-wrap items-center gap-2">
              {isFullMock && (
                <button
                  type="button"
                  onClick={handleToggleReview}
                  className={`inline-flex min-h-[46px] items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isMarked
                      ? 'border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-600 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{isMarked ? 'Marked' : 'Review'}</span>
                </button>
              )}

              <button
                type="button"
                disabled={!selectedOption || isCurrentTimedOut}
                onClick={handleClearAnswer}
                className="inline-flex min-h-[46px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 whitespace-nowrap"
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Clear</span>
              </button>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                disabled={session.currentIndex === 0}
                onClick={() => navigateToIndex(session.currentIndex - 1)}
                className="inline-flex min-h-[46px] items-center gap-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 sm:px-4 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800 whitespace-nowrap"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Prev</span>
              </button>

              {session.currentIndex < totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => navigateToIndex(session.currentIndex + 1)}
                  className="inline-flex min-h-[46px] items-center gap-1 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
                >
                  <span>Next</span>
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="inline-flex min-h-[46px] items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>Finish &amp; Submit</span>
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Right Question Navigation Palette (Desktop) */}
        <aside
          aria-label="Question Navigation Palette"
          className="hidden lg:block lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 self-start sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto dark:border-neutral-800 dark:bg-neutral-950"
        >
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-neutral-800">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white">
              Question Palette
            </h3>
            <span className="font-mono-tabular text-xs text-slate-500 dark:text-neutral-400">
              {summaryCounts.answeredCount}/{totalQuestions} answered
            </span>
          </div>
          {renderPaletteGrid()}
        </aside>
      </main>

      {/* Mobile Palette Slide-Over */}
      {showMobilePalette && (
        <div
          className="fixed inset-0 z-40 flex items-end bg-slate-950/50 lg:hidden dark:bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-label="Question Navigation Palette"
        >
          <div className="w-full max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Question Palette ({summaryCounts.answeredCount}/{totalQuestions})
              </h3>
              <button
                type="button"
                onClick={() => setShowMobilePalette(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-neutral-400 dark:hover:bg-neutral-900"
                aria-label="Close palette"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderPaletteGrid()}
          </div>
        </div>
      )}

      {/* Submission Confirmation Dialog */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 dark:bg-black/80"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-dialog-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
            <h2
              id="submit-dialog-title"
              className="font-display text-xl font-bold text-slate-900 dark:text-white"
            >
              Confirm Test Submission
            </h2>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-neutral-300">
              Review your attempt summary before submitting. Once submitted, answers cannot be modified.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-black">
              <div>
                <div className="text-xs text-slate-500 dark:text-neutral-400">Total Questions</div>
                <div className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-900 dark:text-white">
                  {totalQuestions}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-neutral-400">Answered</div>
                <div className="mt-0.5 font-mono-tabular text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {summaryCounts.answeredCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-neutral-400">Unanswered</div>
                <div className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-700 dark:text-neutral-300">
                  {summaryCounts.unansweredCount}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-neutral-400">Marked for Review</div>
                <div className="mt-0.5 font-mono-tabular text-lg font-bold text-amber-700 dark:text-amber-400">
                  {summaryCounts.markedCount}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Return to Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  triggerSubmit(session, false);
                }}
                className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Submit Final Answers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
