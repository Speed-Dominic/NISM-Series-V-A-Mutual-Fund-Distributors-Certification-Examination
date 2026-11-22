import { Play, Timer } from 'lucide-react';
import { useState } from 'react';
import { ExamDefinition } from '../types/exam';
import { ChapterPerformanceStat } from '../utils/analytics';

interface ChapterPracticeSetupProps {
  exam: ExamDefinition;
  chapterStats: ChapterPerformanceStat[];
  onStartChapterPractice: (chapterNumber: number, requestedCount: number) => void;
}

const QUESTION_COUNT_OPTIONS = [5, 10, 15, 20, 25];

export function ChapterPracticeSetup({
  exam,
  chapterStats,
  onStartChapterPractice,
}: ChapterPracticeSetupProps) {
  // Maintain per-chapter selected question count (default 10 or available max)
  const [countsByChapter, setCountsByChapter] = useState<Record<number, number>>({});

  const getSelectedCount = (chapterNum: number, available: number) => {
    if (countsByChapter[chapterNum] !== undefined) {
      return countsByChapter[chapterNum];
    }
    return available >= 10 ? 10 : Math.min(available, 25);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end dark:border-neutral-800">
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            {exam.code} · Chapter-wise Practice Mode
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Syllabus Chapters & Focused Drills
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-neutral-300">
            Select any single chapter to practise up to 25 randomized questions exclusively from that module. Every question carries a 60-second individual timer that auto-advances on expiry.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-neutral-300 shrink-0">
          <Timer className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
          <span className="font-mono-tabular">60s / question · Max 25 Qs</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {exam.chapters.map((chapter) => {
          const stat = chapterStats.find((s) => s.chapterNumber === chapter.chapterNumber);
          const available = stat?.availableQuestions ?? 0;
          const requestedCount = getSelectedCount(chapter.chapterNumber, available);
          const effectiveCount = Math.min(requestedCount, available, 25);

          return (
            <article
              key={chapter.chapterNumber}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-neutral-400">
                  <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                    Chapter {chapter.chapterNumber}
                  </span>
                  <span className="font-mono-tabular">
                    {available} questions available · Weightage ~{chapter.weightage}%
                  </span>
                </div>

                <h2 className="mt-1.5 font-display text-lg font-bold text-slate-900 dark:text-white">
                  {chapter.title}
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-neutral-300">
                  {chapter.summary}
                </p>

                <p className="mt-3 text-xs text-slate-500 dark:text-neutral-400">
                  {chapter.keyTopics.join(' · ')}
                </p>

                {/* Previous performance summary */}
                <div className="mt-4 grid grid-cols-3 gap-3 border-y border-slate-100 py-3 text-xs dark:border-neutral-800">
                  <div>
                    <div className="text-slate-500 dark:text-neutral-400">Chapter Drills</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold text-slate-900 dark:text-neutral-100">
                      {stat?.chapterPracticeAttempts ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-neutral-400">Accuracy</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold text-slate-900 dark:text-neutral-100">
                      {stat?.accuracy !== null && stat?.accuracy !== undefined ? `${stat.accuracy}%` : 'Not attempted'}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-neutral-400">Qs Attempted</div>
                    <div className="mt-0.5 font-mono-tabular text-sm font-semibold text-slate-900 dark:text-neutral-100">
                      {stat?.questionsAttempted ?? 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls: Question count selector + Start button */}
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="mb-1.5 text-xs font-medium text-slate-600 dark:text-neutral-400">
                    Number of Questions
                    {requestedCount > available && available > 0 && (
                      <span className="ml-1.5 text-amber-700 dark:text-amber-400">
                        (Using all {available} available)
                      </span>
                    )}
                  </div>
                  <div
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-neutral-900"
                    role="group"
                    aria-label={`Question count for Chapter ${chapter.chapterNumber}`}
                  >
                    {QUESTION_COUNT_OPTIONS.map((opt) => {
                      const active = requestedCount === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setCountsByChapter((prev) => ({
                              ...prev,
                              [chapter.chapterNumber]: opt,
                            }))
                          }
                          className={`rounded-md px-2.5 py-1.5 font-mono-tabular text-xs font-semibold transition-colors ${
                            active
                              ? 'bg-white text-blue-700 shadow-xs dark:bg-black dark:text-blue-400'
                              : 'text-slate-600 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={available === 0}
                  onClick={() => onStartChapterPractice(chapter.chapterNumber, requestedCount)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  <span>Start Practice ({effectiveCount} Q)</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
