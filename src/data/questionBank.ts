import { ExamDefinition, Question } from '../types/exam';
import { QUESTIONS_VA_CH1_TO_5 } from './questionsVaCh1To5';

export const BUILTIN_QUESTIONS: Question[] = [...QUESTIONS_VA_CH1_TO_5];

export const BUILTIN_BANK_VERSION = 5;

/**
 * Fisher-Yates shuffle returning a new array without mutating input.
 */
export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Selects up to `targetCount` (default 100) unique questions for a Full Mock Test,
 * distributed across chapters according to syllabus weightage.
 */
export function selectWeightedMockQuestions(
  exam: ExamDefinition,
  allExamQuestions: Question[],
  targetCount = exam.totalQuestionsFullMock
): Question[] {
  const byChapter = new Map<number, Question[]>();
  for (const ch of exam.chapters) {
    byChapter.set(ch.chapterNumber, []);
  }
  for (const q of allExamQuestions) {
    const arr = byChapter.get(q.chapterNumber) ?? [];
    arr.push(q);
    byChapter.set(q.chapterNumber, arr);
  }

  // Shuffle each chapter's pool independently
  for (const [chNum, pool] of byChapter.entries()) {
    byChapter.set(chNum, shuffleArray(pool));
  }

  const totalAvailable = allExamQuestions.length;
  const count = Math.min(targetCount, totalAvailable);
  const totalWeightage = exam.chapters.reduce((sum, ch) => sum + ch.weightage, 0) || 100;

  const selectedIds = new Set<string>();
  const selected: Question[] = [];

  // Pass 1: Allocate proportional quotas per chapter
  const chapterAllocations = exam.chapters.map((ch) => {
    const ideal = Math.floor((count * ch.weightage) / totalWeightage);
    const pool = byChapter.get(ch.chapterNumber) ?? [];
    const take = Math.min(ideal, pool.length);
    return {
      chapterNumber: ch.chapterNumber,
      remainder: (count * ch.weightage) / totalWeightage - ideal,
      taken: take,
    };
  });

  // Sort by largest fractional remainder to fill rounding deficit
  let allocated = chapterAllocations.reduce((acc, c) => acc + c.taken, 0);
  const sortedForRemainder = [...chapterAllocations].sort((a, b) => b.remainder - a.remainder);

  for (const item of sortedForRemainder) {
    if (allocated >= count) break;
    const pool = byChapter.get(item.chapterNumber) ?? [];
    if (item.taken < pool.length) {
      item.taken += 1;
      allocated += 1;
    }
  }

  // Pick from each chapter pool
  for (const alloc of chapterAllocations) {
    const pool = byChapter.get(alloc.chapterNumber) ?? [];
    for (let i = 0; i < alloc.taken; i++) {
      const q = pool[i];
      if (q && !selectedIds.has(q.id)) {
        selectedIds.add(q.id);
        selected.push(q);
      }
    }
  }

  // Pass 2: If any chapter lacked enough questions to meet its quota, fill remaining slots from remaining unused questions across chapters
  if (selected.length < count) {
    const leftovers = shuffleArray(allExamQuestions.filter((q) => !selectedIds.has(q.id)));
    for (const q of leftovers) {
      if (selected.length >= count) break;
      selectedIds.add(q.id);
      selected.push(q);
    }
  }

  return shuffleArray(selected);
}

/**
 * Selects up to `requestedCount` (max 25) randomized unique questions strictly from one chapter.
 */
export function selectChapterPracticeQuestions(
  examQuestions: Question[],
  chapterNumber: number,
  requestedCount: number
): Question[] {
  const capped = Math.min(Math.max(1, requestedCount), 25);
  const chapterOnly = examQuestions.filter((q) => q.chapterNumber === chapterNumber);
  return shuffleArray(chapterOnly).slice(0, Math.min(capped, chapterOnly.length));
}
