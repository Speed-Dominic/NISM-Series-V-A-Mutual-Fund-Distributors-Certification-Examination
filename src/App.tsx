import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChapterPracticeSetup } from './components/ChapterPracticeSetup';
import { ExamWorkbench } from './components/ExamWorkbench';
import { HomeDashboard } from './components/HomeDashboard';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { QuestionBankView } from './components/QuestionBankView';
import { ResultsView } from './components/ResultsView';
import { TestHistoryView } from './components/TestHistoryView';
import { TopNav } from './components/TopNav';
import { NISM_VA_EXAM } from './data/exams';
import {
  BUILTIN_QUESTIONS,
  selectChapterPracticeQuestions,
  selectWeightedMockQuestions,
} from './data/questionBank';
import {
  clearActiveSession,
  clearAllQuestions,
  deleteAttempt,
  deleteQuestionsBatch,
  getActiveSession,
  getAllAttempts,
  getAllQuestions,
  getPreferences,
  importQuestionsBatch,
  initDatabaseAndSeed,
  replaceExamQuestions,
  saveActiveSession,
  saveAttempt,
  savePreferences,
} from './db/indexedDb';
import { ActiveTestSession, AppView, Question, TestAttempt } from './types/exam';
import { computeExamAnalytics, evaluateTestAttempt } from './utils/analytics';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  const [allQuestions, setAllQuestions] = useState<Question[]>(BUILTIN_QUESTIONS);
  const [allAttempts, setAllAttempts] = useState<TestAttempt[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveTestSession | null>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [reviewAttempt, setReviewAttempt] = useState<TestAttempt | null>(null);

  // Pending new test when an unfinished session exists
  const [pendingStartAction, setPendingStartAction] = useState<(() => void) | null>(null);

  const activeSessionRef = useRef<ActiveTestSession | null>(null);
  activeSessionRef.current = activeSession;

  const selectedExam = NISM_VA_EXAM;

  // Apply theme class to <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Initialize IndexedDB, seed Series V-A question bank, restore preferences & interrupted test
  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      try {
        await initDatabaseAndSeed();
        const [prefs, questions, attempts, savedSession] = await Promise.all([
          getPreferences(),
          getAllQuestions(),
          getAllAttempts(),
          getActiveSession(),
        ]);
        if (!mounted) return;

        const vaQuestions = questions.filter((q) => q.examId === selectedExam.id);
        const vaAttempts = attempts.filter((a) => a.examId === selectedExam.id);

        setAllQuestions(vaQuestions);
        setAllAttempts(vaAttempts);
        setTheme(prefs.theme ?? 'light');

        if (savedSession && savedSession.examId === selectedExam.id) {
          setActiveSession(savedSession);
        }

        if (prefs.selectedExamId !== selectedExam.id) {
          void savePreferences({ selectedExamId: selectedExam.id, theme: prefs.theme ?? 'light' });
        }
      } catch (err) {
        if (!mounted) return;
        setDbError(
          err instanceof Error
            ? err.message
            : 'Local database unavailable; running in memory.'
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [selectedExam.id]);

  // Persist active session cleanly on page unload / visibility hidden
  useEffect(() => {
    const flushSession = () => {
      if (activeSessionRef.current) {
        void saveActiveSession(activeSessionRef.current);
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flushSession();
      }
    };
    window.addEventListener('beforeunload', flushSession);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('beforeunload', flushSession);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const examQuestions = useMemo(
    () => allQuestions.filter((q) => q.examId === selectedExam.id),
    [allQuestions, selectedExam.id]
  );

  const examQuestionMap = useMemo(
    () => new Map(examQuestions.map((q) => [q.id, q])),
    [examQuestions]
  );

  const examAttempts = useMemo(
    () => allAttempts.filter((a) => a.examId === selectedExam.id),
    [allAttempts, selectedExam.id]
  );

  const analytics = useMemo(
    () => computeExamAnalytics(selectedExam, examAttempts, examQuestions),
    [selectedExam, examAttempts, examQuestions]
  );

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    void savePreferences({ selectedExamId: selectedExam.id, theme: nextTheme });
  };

  const launchFullMockInternal = useCallback(() => {
    const selectedQs = selectWeightedMockQuestions(
      selectedExam,
      examQuestions,
      selectedExam.totalQuestionsFullMock
    );
    if (selectedQs.length === 0) return;

    const newSession: ActiveTestSession = {
      id: 'current_session',
      examId: selectedExam.id,
      examName: selectedExam.name,
      mode: 'full-mock',
      questionIds: selectedQs.map((q) => q.id),
      currentIndex: 0,
      answers: {},
      markedForReview: [],
      remainingSeconds: selectedExam.durationMinutes * 60,
      questionRemainingSeconds: 60,
      perQuestionRemainingSeconds: {},
      timedOutQuestionIds: [],
      timeSpentPerQuestion: {},
      totalElapsedSeconds: 0,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };
    setActiveSession(newSession);
    void saveActiveSession(newSession);
    setCurrentView('active-test');
  }, [selectedExam, examQuestions]);

  const launchChapterPracticeInternal = useCallback(
    (chapterNumber: number, requestedCount: number) => {
      const chapter = selectedExam.chapters.find((c) => c.chapterNumber === chapterNumber);
      if (!chapter) return;

      const selectedQs = selectChapterPracticeQuestions(
        examQuestions,
        chapterNumber,
        requestedCount
      );
      if (selectedQs.length === 0) return;

      const firstQId = selectedQs[0].id;
      const newSession: ActiveTestSession = {
        id: 'current_session',
        examId: selectedExam.id,
        examName: selectedExam.name,
        mode: 'chapter-practice',
        chapterNumber: chapter.chapterNumber,
        chapterTitle: chapter.title,
        questionIds: selectedQs.map((q) => q.id),
        currentIndex: 0,
        answers: {},
        markedForReview: [],
        remainingSeconds: 0,
        questionRemainingSeconds: 60,
        perQuestionRemainingSeconds: { [firstQId]: 60 },
        timedOutQuestionIds: [],
        timeSpentPerQuestion: {},
        totalElapsedSeconds: 0,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };
      setActiveSession(newSession);
      void saveActiveSession(newSession);
      setCurrentView('active-test');
    },
    [selectedExam, examQuestions]
  );

  const handleStartFullMock = () => {
    if (examQuestions.length === 0) {
      setCurrentView('question-bank');
      return;
    }
    if (activeSession) {
      setPendingStartAction(() => launchFullMockInternal);
    } else {
      launchFullMockInternal();
    }
  };

  const handleStartChapterPractice = (chapterNumber: number, requestedCount: number) => {
    if (activeSession) {
      setPendingStartAction(() => () => launchChapterPracticeInternal(chapterNumber, requestedCount));
    } else {
      launchChapterPracticeInternal(chapterNumber, requestedCount);
    }
  };

  const handleUpdateActiveSession = useCallback((updated: ActiveTestSession) => {
    setActiveSession(updated);
    void saveActiveSession(updated);
  }, []);

  const handleSubmitTest = useCallback(
    async (finalSession: ActiveTestSession, autoSubmitted: boolean) => {
      const attempt = evaluateTestAttempt(finalSession, selectedExam, examQuestionMap, autoSubmitted);
      setAllAttempts((prev) => [attempt, ...prev]);
      setActiveSession(null);
      setReviewAttempt(attempt);
      setCurrentView('results');

      try {
        await Promise.all([saveAttempt(attempt), clearActiveSession()]);
      } catch {
        // State is already updated in memory
      }
    },
    [selectedExam, examQuestionMap]
  );

  const handleResumeSession = () => {
    if (!activeSession) return;
    setCurrentView('active-test');
  };

  const handleDiscardSession = async () => {
    setActiveSession(null);
    await clearActiveSession().catch(() => {});
  };

  const handleDeleteAttempt = async (attemptId: string) => {
    setAllAttempts((prev) => prev.filter((a) => a.id !== attemptId));
    await deleteAttempt(attemptId).catch(() => {});
  };

  const handleImportQuestions = async (newQuestions: Question[]) => {
    await importQuestionsBatch(newQuestions);
    const refreshed = await getAllQuestions();
    setAllQuestions(refreshed.filter((q) => q.examId === selectedExam.id));
  };

  const handleDeleteQuestions = async (questionIds: string[]) => {
    await deleteQuestionsBatch(questionIds);
    const refreshed = await getAllQuestions();
    const vaQs = refreshed.filter((q) => q.examId === selectedExam.id);
    setAllQuestions(vaQs);
    if (activeSession) {
      const deletedSet = new Set(questionIds);
      if (activeSession.questionIds.some((id) => deletedSet.has(id))) {
        setActiveSession(null);
        await clearActiveSession().catch(() => {});
      }
    }
  };

  const handleReplaceQuestions = async (nextQuestions: Question[]) => {
    await replaceExamQuestions(selectedExam.id, nextQuestions);
    const refreshed = await getAllQuestions();
    setAllQuestions(refreshed.filter((q) => q.examId === selectedExam.id));
    if (activeSession) {
      setActiveSession(null);
      await clearActiveSession().catch(() => {});
    }
  };

  const handleDeleteAllQuestions = async () => {
    await clearAllQuestions();
    setAllQuestions([]);
    if (activeSession) {
      setActiveSession(null);
      await clearActiveSession().catch(() => {});
    }
  };

  const activeSessionQuestions = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.questionIds
      .map((id) => examQuestionMap.get(id))
      .filter((q): q is Question => Boolean(q));
  }, [activeSession, examQuestionMap]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
            Loading NISM Series V-A Question Bank &amp; Local Records...
          </p>
        </div>
      </div>
    );
  }

  // Distraction-free Active Test Mode hides main dashboard nav
  if (currentView === 'active-test' && activeSession && activeSessionQuestions.length > 0) {
    return (
      <ExamWorkbench
        session={activeSession}
        questions={activeSessionQuestions}
        onUpdateSession={handleUpdateActiveSession}
        onSubmitTest={handleSubmitTest}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopNav
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        onStartFullMock={handleStartFullMock}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {dbError && (
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            Storage Notice: {dbError}
          </div>
        </div>
      )}

      <main>
        {currentView === 'dashboard' ? (
          <HomeDashboard
            exam={selectedExam}
            questionCount={examQuestions.length}
            analytics={analytics}
            recentAttempts={examAttempts}
            activeSession={activeSession}
            onStartFullMock={handleStartFullMock}
            onNavigate={(view) => setCurrentView(view)}
            onReviewAttempt={(attempt) => {
              setReviewAttempt(attempt);
              setCurrentView('results');
            }}
            onResumeSession={handleResumeSession}
            onDiscardSession={handleDiscardSession}
          />
        ) : currentView === 'chapters' ? (
          <ChapterPracticeSetup
            exam={selectedExam}
            chapterStats={analytics.chapterStats}
            onStartChapterPractice={handleStartChapterPractice}
          />
        ) : currentView === 'analytics' ? (
          <PerformanceDashboard
            exam={selectedExam}
            analytics={analytics}
            attempts={examAttempts}
            onStartChapterPractice={handleStartChapterPractice}
            onViewHistory={() => setCurrentView('history')}
          />
        ) : currentView === 'history' ? (
          <TestHistoryView
            exam={selectedExam}
            attempts={examAttempts}
            onReviewAttempt={(attempt) => {
              setReviewAttempt(attempt);
              setCurrentView('results');
            }}
            onDeleteAttempt={handleDeleteAttempt}
            onStartFullMock={handleStartFullMock}
            onGoToChapters={() => setCurrentView('chapters')}
          />
        ) : currentView === 'question-bank' ? (
          <QuestionBankView
            exam={selectedExam}
            questions={examQuestions}
            onImportQuestions={handleImportQuestions}
            onDeleteQuestions={handleDeleteQuestions}
            onReplaceQuestions={handleReplaceQuestions}
            onDeleteAllQuestions={handleDeleteAllQuestions}
          />
        ) : currentView === 'results' && reviewAttempt ? (
          <ResultsView
            attempt={reviewAttempt}
            exam={selectedExam}
            questionMap={examQuestionMap}
            onBackToDashboard={() => setCurrentView('dashboard')}
            onRetakeTest={() => {
              if (reviewAttempt.mode === 'full-mock') {
                handleStartFullMock();
              } else if (reviewAttempt.chapterNumber !== undefined) {
                handleStartChapterPractice(
                  reviewAttempt.chapterNumber,
                  reviewAttempt.totalQuestions
                );
              } else {
                setCurrentView('chapters');
              }
            }}
          />
        ) : null}
      </main>

      {/* Replace Active Session Confirmation Dialog */}
      {pendingStartAction && activeSession && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="replace-session-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2
              id="replace-session-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              Unfinished Test in Progress
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              You have an interrupted{' '}
              <strong>
                {activeSession.mode === 'full-mock'
                  ? 'Full Mock Test'
                  : `Chapter ${activeSession.chapterNumber} Practice`}
              </strong>{' '}
              saved. Starting a new test will discard that unfinished session.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPendingStartAction(null)}
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingStartAction(null);
                  handleResumeSession();
                }}
                className="rounded-lg border border-amber-400 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
              >
                Resume Saved Test
              </button>
              <button
                type="button"
                onClick={() => {
                  const fn = pendingStartAction;
                  setPendingStartAction(null);
                  fn();
                }}
                className="rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
              >
                Discard &amp; Start New
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
