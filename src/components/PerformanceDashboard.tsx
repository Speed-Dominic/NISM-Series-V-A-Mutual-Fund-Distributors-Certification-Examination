import { AlertTriangle, Award, BarChart2, Play, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ExamDefinition, TestAttempt } from '../types/exam';
import { ExamAnalyticsSummary } from '../utils/analytics';

interface PerformanceDashboardProps {
  exam: ExamDefinition;
  analytics: ExamAnalyticsSummary;
  attempts: TestAttempt[];
  onStartChapterPractice: (chapterNumber: number, requestedCount: number) => void;
  onViewHistory: () => void;
}

export function PerformanceDashboard({
  exam,
  analytics,
  attempts,
  onStartChapterPractice,
  onViewHistory,
}: PerformanceDashboardProps) {
  const [weakPracticeCount, setWeakPracticeCount] = useState<number>(10);

  // Weak chapters = practised chapters with accuracy < 70%, or lowest accuracy chapters, plus unpractised chapters if needed
  const weakOrUnpractisedChapters = useMemo(() => {
    const practisedLow = analytics.chapterStats
      .filter((c) => c.accuracy !== null && c.accuracy < 75)
      .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));

    const unpractised = analytics.chapterStats.filter((c) => c.questionsSeen === 0);

    if (practisedLow.length > 0) {
      return [...practisedLow, ...unpractised.slice(0, Math.max(0, 4 - practisedLow.length))];
    }
    return [...analytics.weakestChapters, ...unpractised].slice(0, 4);
  }, [analytics]);

  const [selectedWeakChapter, setSelectedWeakChapter] = useState<number | null>(null);

  const activeWeakChapterNum =
    selectedWeakChapter ?? weakOrUnpractisedChapters[0]?.chapterNumber ?? exam.chapters[0]?.chapterNumber;

  const activeWeakStat = analytics.chapterStats.find(
    (c) => c.chapterNumber === activeWeakChapterNum
  );

  // Interactive SVG Chart dimensions
  const chartWidth = 680;
  const chartHeight = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 36;
  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const trend = analytics.chronologicalTrend;
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const getX = (idx: number, len: number) => {
    if (len <= 1) return padLeft + innerW / 2;
    return padLeft + (idx / (len - 1)) * innerW;
  };
  const getY = (pct: number) => padTop + innerH - (Math.min(100, Math.max(0, pct)) / 100) * innerH;

  const scorePoints = trend
    .map((pt, idx) => `${getX(idx, trend.length)},${getY(pt.scorePercent)}`)
    .join(' ');
  const accPoints = trend
    .map((pt, idx) => `${getX(idx, trend.length)},${getY(pt.accuracy)}`)
    .join(' ');

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            {exam.code} · Analytics &amp; Insights
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Performance Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
            Track accuracy, score progression, time efficiency, and chapter-level mastery across all attempts.
          </p>
        </div>

        <button
          type="button"
          onClick={onViewHistory}
          className="self-start rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 md:self-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
        >
          View Full Test History ({attempts.length})
        </button>
      </div>

      {/* Top KPI Cards */}
      <section aria-label="Performance KPIs" className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Overall Accuracy</div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-blue-700 dark:text-blue-400">
            {analytics.overallAccuracy !== null ? `${analytics.overallAccuracy}%` : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Attempted answers correct</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Tests Attempted
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics.totalTestsAttempted}
          </div>
          <div className="mt-1 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
            {analytics.fullMockCount} Full · {analytics.chapterPracticeCount} Chapter
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Marks</div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics.averageMarks !== null ? analytics.averageMarks : '—'}
          </div>
          <div className="mt-1 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
            {analytics.averageScorePercent !== null
              ? `Avg ${analytics.averageScorePercent}% score`
              : 'No tests yet'}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Highest Marks</div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {analytics.highestMarksLabel ?? '—'}
          </div>
          <div className="mt-1 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
            {analytics.highestScorePercent !== null
              ? `Peak ${analytics.highestScorePercent}%`
              : 'No tests yet'}
          </div>
        </div>

        <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 lg:col-span-1 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Avg Time / Question
          </div>
          <div className="mt-2 font-mono-tabular text-2xl font-bold text-slate-900 dark:text-slate-100">
            {analytics.avgTimePerQuestionSeconds !== null
              ? `${analytics.avgTimePerQuestionSeconds}s`
              : '—'}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Target pace &le; 60s</div>
        </div>
      </section>

      {/* Improvement Over Time Chart + Practise Weak Chapters */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Improvement Over Time SVG Chart */}
        <section
          aria-label="Improvement Over Time"
          className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Improvement Over Time
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" aria-hidden="true" />
                Score %
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
                Accuracy %
              </span>
            </div>
          </div>

          {trend.length === 0 ? (
            <div className="mt-6 flex h-52 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 text-center dark:border-slate-800">
              <BarChart2 className="h-7 w-7 text-slate-400" aria-hidden="true" />
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Complete at least one test to plot your score and accuracy trajectory.
              </p>
            </div>
          ) : (
            <div className="mt-4">
              <div className="relative w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="w-full min-w-[460px]"
                  role="img"
                  aria-label="Line chart of test score and accuracy percentages over recent attempts"
                >
                  {/* Horizontal Gridlines */}
                  {[0, 25, 50, 75, 100].map((val) => {
                    const y = getY(val);
                    return (
                      <g key={val}>
                        <line
                          x1={padLeft}
                          y1={y}
                          x2={chartWidth - padRight}
                          y2={y}
                          className="stroke-slate-200 dark:stroke-slate-800"
                          strokeDasharray={val === 0 ? undefined : '3 3'}
                        />
                        <text
                          x={padLeft - 8}
                          y={y + 4}
                          textAnchor="end"
                          className="fill-slate-400 text-[10px] font-mono"
                        >
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Passing line if applicable */}
                  {exam.passingPercentage !== null && (
                    <line
                      x1={padLeft}
                      y1={getY(exam.passingPercentage)}
                      x2={chartWidth - padRight}
                      y2={getY(exam.passingPercentage)}
                      className="stroke-amber-500/70"
                      strokeWidth="1.5"
                      strokeDasharray="5 4"
                    />
                  )}

                  {/* Polylines */}
                  {trend.length > 1 && (
                    <>
                      <polyline
                        fill="none"
                        stroke="#059669"
                        strokeWidth="2"
                        points={accPoints}
                      />
                      <polyline
                        fill="none"
                        stroke="#2563EB"
                        strokeWidth="2.5"
                        points={scorePoints}
                      />
                    </>
                  )}

                  {/* Interactive Data Nodes */}
                  {trend.map((pt, idx) => {
                    const x = getX(idx, trend.length);
                    const yScore = getY(pt.scorePercent);
                    const yAcc = getY(pt.accuracy);
                    return (
                      <g
                        key={pt.id}
                        onMouseEnter={() => setHoveredIdx(idx)}
                        onMouseLeave={() => setHoveredIdx(null)}
                        className="cursor-pointer"
                      >
                        <circle cx={x} cy={yAcc} r={4} fill="#059669" />
                        <circle cx={x} cy={yScore} r={4.5} fill="#2563EB" />
                        <text
                          x={x}
                          y={chartHeight - 10}
                          textAnchor="middle"
                          className="fill-slate-500 dark:fill-slate-400 text-[10px] font-mono"
                        >
                          {pt.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Hovered or Latest Readout */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400 font-mono-tabular">
                {(() => {
                  const target =
                    hoveredIdx !== null ? trend[hoveredIdx] : trend[trend.length - 1];
                  return (
                    <>
                      <span>
                        {target.label} ({target.dateShort})
                      </span>
                      <span>
                        Score: <strong className="text-blue-700 dark:text-blue-400">{target.scorePercent}%</strong> · Accuracy:{' '}
                        <strong className="text-emerald-700 dark:text-emerald-400">{target.accuracy}%</strong>
                      </span>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </section>

        {/* Practise Weak Chapters Widget */}
        <section
          aria-label="Practise Weak Chapters"
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Practise Weak Chapters
              </h2>
            </div>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
              Select a low-accuracy or unpractised chapter below to launch an immediate 60s-per-question drill.
            </p>

            <div className="mt-4 space-y-2">
              {weakOrUnpractisedChapters.map((ch) => {
                const isSelected = activeWeakChapterNum === ch.chapterNumber;
                return (
                  <button
                    key={ch.chapterNumber}
                    type="button"
                    onClick={() => setSelectedWeakChapter(ch.chapterNumber)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Ch. {ch.chapterNumber}: {ch.chapterTitle}
                      </div>
                      <div className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                        {ch.availableQuestions} Qs available · {ch.attemptsCount} attempts
                      </div>
                    </div>
                    <div className="shrink-0 font-mono-tabular text-xs font-bold text-rose-700 dark:text-rose-400">
                      {ch.accuracy !== null ? `${ch.accuracy}% acc` : 'Unpractised'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              {[5, 10, 15, 20, 25].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setWeakPracticeCount(cnt)}
                  className={`rounded-md px-2.5 py-1 font-mono-tabular text-xs font-semibold transition-colors ${
                    weakPracticeCount === cnt
                      ? 'bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>

            {activeWeakStat && (
              <button
                type="button"
                onClick={() =>
                  onStartChapterPractice(activeWeakStat.chapterNumber, weakPracticeCount)
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  Practise Ch. {activeWeakStat.chapterNumber} (
                  {Math.min(weakPracticeCount, activeWeakStat.availableQuestions)} Q)
                </span>
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Strongest vs Weakest Chapters */}
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Strongest Chapters
            </h2>
          </div>
          {analytics.strongestChapters.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Attempt tests to identify your top-performing chapters.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {analytics.strongestChapters.map((ch) => (
                <div key={ch.chapterNumber}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Ch. {ch.chapterNumber}: {ch.chapterTitle}
                    </span>
                    <span className="font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                      {ch.accuracy}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-600"
                      style={{ width: `${ch.accuracy ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              Weakest Chapters
            </h2>
          </div>
          {analytics.weakestChapters.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Attempt tests to highlight chapters needing targeted revision.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {analytics.weakestChapters.map((ch) => (
                <div key={ch.chapterNumber}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Ch. {ch.chapterNumber}: {ch.chapterTitle}
                    </span>
                    <span className="font-mono-tabular font-semibold text-rose-700 dark:text-rose-400">
                      {ch.accuracy}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-rose-600"
                      style={{ width: `${ch.accuracy ?? 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Full Chapter-wise Performance Breakdown Table */}
      <section
        aria-label="Chapter-wise Performance Table"
        className="mt-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
          Complete Chapter-wise Performance
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <tr>
                <th className="py-3 pr-4">Chapter</th>
                <th className="py-3 px-3 text-right">Chapter Drills</th>
                <th className="py-3 px-3 text-right">Qs Attempted</th>
                <th className="py-3 px-3 text-right">Correct</th>
                <th className="py-3 px-3 text-right">Avg Time / Q</th>
                <th className="py-3 px-3 w-44">Accuracy</th>
                <th className="py-3 pl-3 text-right">Quick Drill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {analytics.chapterStats.map((ch) => (
                <tr key={ch.chapterNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <td className="py-3.5 pr-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Ch. {ch.chapterNumber}: {ch.chapterTitle}
                    </div>
                    <div className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                      Weightage ~{ch.weightage}% · {ch.availableQuestions} Qs in bank
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                    {ch.chapterPracticeAttempts}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono-tabular text-slate-700 dark:text-slate-300">
                    {ch.questionsAttempted}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono-tabular font-semibold text-emerald-700 dark:text-emerald-400">
                    {ch.correctCount}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono-tabular text-slate-600 dark:text-slate-400">
                    {ch.avgTimePerQuestion !== null ? `${ch.avgTimePerQuestion}s` : '—'}
                  </td>
                  <td className="py-3.5 px-3">
                    {ch.accuracy !== null ? (
                      <div className="flex items-center gap-2.5">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full ${
                              ch.accuracy >= 70
                                ? 'bg-emerald-600'
                                : ch.accuracy >= 50
                                ? 'bg-amber-500'
                                : 'bg-rose-600'
                            }`}
                            style={{ width: `${ch.accuracy}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono-tabular text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {ch.accuracy}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Not attempted</span>
                    )}
                  </td>
                  <td className="py-3.5 pl-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onStartChapterPractice(ch.chapterNumber, 10)}
                      className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Practise
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
