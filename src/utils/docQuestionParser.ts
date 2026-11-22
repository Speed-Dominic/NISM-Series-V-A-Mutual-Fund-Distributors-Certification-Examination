import { ExamDefinition, OptionKey, Question } from '../types/exam';

/**
 * Extracts readable text from uploaded .txt, .html/.xml-backed .doc, or legacy binary .doc files.
 */
export async function extractTextFromUploadedFile(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Check if file is actually HTML/XML/UTF-8 text saved with .doc extension (common Word export)
  const utf8Preview = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 512));
  if (
    lower.endsWith('.txt') ||
    utf8Preview.includes('<html') ||
    utf8Preview.includes('<?xml') ||
    utf8Preview.includes('<w:wordDocument')
  ) {
    const raw = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    if (raw.includes('<')) {
      // Strip HTML/XML tags while preserving block line breaks
      return raw
        .replace(/<\/(p|div|li|tr|h[1-6]|w:p)>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"');
    }
    return raw;
  }

  // Legacy OLE2 binary .doc (starts with D0 CF 11 E0)
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    // Extract readable ASCII and UTF-16LE runs from Word binary stream
    const latin = new TextDecoder('latin1').decode(bytes);
    // Word 97-2003 stores Unicode text in UTF-16LE runs; extract ASCII printable paragraphs
    const cleaned = latin
      .replace(/\r/g, '\n')
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length >= 2 && /[a-zA-Z0-9]/.test(line))
      .join('\n');
    return cleaned;
  }

  // Fallback UTF-8 decode
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/**
 * Parses chapter-wise MCQs from plain text copied from a Word/PDF/text file.
 * Supports formats like:
 *   Chapter 1: Investment Landscape
 *   1. Question text...
 *   A. Option 1   (or (a), a), A))
 *   B. Option 2
 *   C. Option 3
 *   D. Option 4
 *   Answer: B     (or Ans: B / Correct: B)
 *   Explanation: ...
 */
export function parseChapterWiseMcqText(
  rawText: string,
  exam: ExamDefinition,
  defaultChapterNumber = 1
): { questions: Question[]; warnings: string[] } {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim());

  let currentChapter = defaultChapterNumber;
  const questions: Question[] = [];
  const warnings: string[] = [];

  let qTextParts: string[] = [];
  let options: Partial<Record<OptionKey, string>> = {};
  let currentOptKey: OptionKey | null = null;
  let correctAnswer: OptionKey | null = null;
  let explanationParts: string[] = [];
  let inExplanation = false;

  const flushCurrent = () => {
    const qText = qTextParts.join(' ').trim();
    if (
      qText &&
      options.A &&
      options.B &&
      options.C &&
      options.D &&
      correctAnswer
    ) {
      const chObj =
        exam.chapters.find((c) => c.chapterNumber === currentChapter) ?? exam.chapters[0];
      const idx = questions.length + 1;
      questions.push({
        id: `${exam.id.toUpperCase()}-DOC-C${String(chObj.chapterNumber).padStart(2, '0')}-${Date.now().toString(36)}-${idx}`,
        examId: exam.id,
        examName: exam.name,
        chapterNumber: chObj.chapterNumber,
        chapterTitle: chObj.title,
        topic: chObj.keyTopics[0] ?? chObj.title,
        questionText: qText,
        options: {
          A: options.A.trim(),
          B: options.B.trim(),
          C: options.C.trim(),
          D: options.D.trim(),
        },
        correctAnswer,
        explanation:
          explanationParts.join(' ').trim() ||
          `Correct option is ${correctAnswer}: ${options[correctAnswer]?.trim()}.`,
        difficulty: 'Moderate',
        questionType: 'Conceptual',
      });
    } else if (qText && (options.A || options.B)) {
      warnings.push(`Skipped incomplete question: "${qText.slice(0, 60)}..."`);
    }

    qTextParts = [];
    options = {};
    currentOptKey = null;
    correctAnswer = null;
    explanationParts = [];
    inExplanation = false;
  };

  const chapterRegex = /^(?:chapter|ch\.?|unit|module)\s*[-:]?\s*(\d{1,2})\b/i;
  const questionStartRegex = /^(?:q(?:uestion)?\s*\d+\s*[.):-]|\d{1,3}\s*[.)])\s*(.+)$/i;
  const optionRegex = /^\(?([A-Da-d])\)?[.):\-]\s*(.+)$/;
  const answerRegex = /^(?:ans(?:wer)?|correct\s*(?:ans(?:wer)?|option)?)\s*[:=-]?\s*\(?([A-Da-d])\)?\b/i;
  const explanationRegex = /^(?:exp(?:lanation)?|rationale|solution|reason)\s*[:=-]\s*(.*)$/i;

  for (const line of lines) {
    if (!line) continue;

    // 1. Check Chapter heading
    const chMatch = line.match(chapterRegex);
    if (chMatch) {
      const num = Number(chMatch[1]);
      if (exam.chapters.some((c) => c.chapterNumber === num)) {
        flushCurrent();
        currentChapter = num;
        continue;
      }
    }

    // 2. Check Answer line
    const ansMatch = line.match(answerRegex);
    if (ansMatch) {
      correctAnswer = ansMatch[1].toUpperCase() as OptionKey;
      currentOptKey = null;
      inExplanation = false;
      continue;
    }

    // 3. Check Explanation line
    const expMatch = line.match(explanationRegex);
    if (expMatch) {
      inExplanation = true;
      currentOptKey = null;
      if (expMatch[1]) explanationParts.push(expMatch[1]);
      continue;
    }

    // 4. Check Option line (A/B/C/D)
    const optMatch = line.match(optionRegex);
    if (optMatch) {
      const key = optMatch[1].toUpperCase() as OptionKey;
      // Only treat as option if we already have some question text or prior options
      if (qTextParts.length > 0 || Object.keys(options).length > 0) {
        currentOptKey = key;
        inExplanation = false;
        options[key] = optMatch[2];
        continue;
      }
    }

    // 5. Check Question start line (1. ... / Q1. ...)
    const qMatch = line.match(questionStartRegex);
    if (qMatch && (Object.keys(options).length >= 2 || correctAnswer !== null || qTextParts.length === 0)) {
      if (qTextParts.length > 0 || Object.keys(options).length > 0) {
        flushCurrent();
      }
      qTextParts.push(qMatch[1]);
      continue;
    }

    // 6. Continuation line
    if (inExplanation) {
      explanationParts.push(line);
    } else if (currentOptKey && options[currentOptKey] !== undefined) {
      options[currentOptKey] = `${options[currentOptKey]} ${line}`;
    } else if (qTextParts.length > 0) {
      qTextParts.push(line);
    }
  }

  flushCurrent();
  return { questions, warnings };
}
