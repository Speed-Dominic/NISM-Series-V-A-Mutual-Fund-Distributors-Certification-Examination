import {
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Download,
  FileJson,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  DifficultyLevel,
  ExamDefinition,
  OptionKey,
  Question,
  QuestionType,
} from '../types/exam';
import { extractTextFromUploadedFile, parseChapterWiseMcqText } from '../utils/docQuestionParser';

interface QuestionBankViewProps {
  exam: ExamDefinition;
  questions: Question[];
  onImportQuestions: (newQuestions: Question[]) => Promise<void>;
  onDeleteQuestions: (questionIds: string[]) => Promise<void>;
  onReplaceQuestions: (nextQuestions: Question[]) => Promise<void>;
  onDeleteAllQuestions: () => Promise<void>;
}

const VALID_OPTIONS: OptionKey[] = ['A', 'B', 'C', 'D'];
const VALID_DIFFICULTIES: DifficultyLevel[] = ['Easy', 'Moderate', 'Difficult'];
const VALID_TYPES: QuestionType[] = [
  'Conceptual',
  'Definition',
  'Practical Application',
  'Scenario-based',
  'Numerical',
  'Case Study',
  'Regulatory & Compliance',
  'Exceptions & Conditions',
];

type ManagerTab = 'json-add' | 'json-delete' | 'text';

export function QuestionBankView({
  exam,
  questions,
  onImportQuestions,
  onDeleteQuestions,
  onReplaceQuestions,
  onDeleteAllQuestions,
}: QuestionBankViewProps) {
  const [chapterFilter, setChapterFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Selection & inline delete confirmations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // Format reference panel state (visible by default in this section)
  const [showFormatGuide, setShowFormatGuide] = useState(true);
  const [formatGuideTab, setFormatGuideTab] = useState<'add' | 'delete'>('add');
  const [copiedFormat, setCopiedFormat] = useState<'add' | 'delete' | null>(null);

  // Global action status banner
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Add Single Question Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formChapter, setFormChapter] = useState<number>(1);
  const [formTopic, setFormTopic] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<DifficultyLevel>('Moderate');
  const [formType, setFormType] = useState<QuestionType>('Conceptual');
  const [formQuestionText, setFormQuestionText] = useState('');
  const [formOptA, setFormOptA] = useState('');
  const [formOptB, setFormOptB] = useState('');
  const [formOptC, setFormOptC] = useState('');
  const [formOptD, setFormOptD] = useState('');
  const [formCorrect, setFormCorrect] = useState<OptionKey>('A');
  const [formExplanation, setFormExplanation] = useState('');
  const [addFormError, setAddFormError] = useState<string | null>(null);
  const [isSavingSingle, setIsSavingSingle] = useState(false);

  // JSON / File Import & Delete Modal state
  const [showImportModal, setShowImportModal] = useState(false);
  const [managerTab, setManagerTab] = useState<ManagerTab>('json-add');
  const [jsonWriteMode, setJsonWriteMode] = useState<'merge' | 'replace'>('merge');
  const [defaultChapter, setDefaultChapter] = useState<number>(1);
  const [importText, setImportText] = useState('');
  const [importFeedback, setImportFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const filteredQuestions = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return questions.filter((q) => {
      if (chapterFilter !== 'all' && q.chapterNumber !== Number(chapterFilter)) return false;
      if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
      if (
        qLower &&
        !q.questionText.toLowerCase().includes(qLower) &&
        !q.topic.toLowerCase().includes(qLower) &&
        !q.id.toLowerCase().includes(qLower)
      ) {
        return false;
      }
      return true;
    });
  }, [questions, chapterFilter, difficultyFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedQuestions = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredQuestions.slice(start, start + PAGE_SIZE);
  }, [filteredQuestions, safePage]);

  const questionIdSet = useMemo(() => new Set(questions.map((q) => q.id)), [questions]);

  const sampleAddJson = useMemo(
    () =>
      JSON.stringify(
        [
          {
            id: 'VA-CUSTOM-001',
            chapterNumber: 1,
            topic: 'Asset Allocation',
            questionText: 'Which of the following best describes real rate of return?',
            options: {
              A: 'Nominal return plus inflation rate',
              B: 'Nominal return adjusted for inflation',
              C: 'Pre-tax return before compounding',
              D: 'Dividend yield divided by face value',
            },
            correctAnswer: 'B',
            explanation:
              'Real rate of return reflects purchasing power after adjusting nominal return for inflation.',
            difficulty: 'Moderate',
            questionType: 'Conceptual',
          },
        ],
        null,
        2
      ),
    []
  );

  const sampleDeleteJson = useMemo(
    () =>
      JSON.stringify(
        {
          deleteIds: ['VA-CUSTOM-001', 'VA-C01-Q001'],
        },
        null,
        2
      ),
    []
  );

  const sampleTextTemplate = `Chapter 1: Investment Landscape
1. Which of the following best describes real rate of return?
A. Nominal return plus inflation
B. Nominal return adjusted for inflation
C. Pre-tax return before compounding
D. Dividend yield divided by NAV
Answer: B
Explanation: Real rate of return adjusts nominal returns for purchasing power erosion caused by inflation.`;

  const downloadJsonFile = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const hasFilter =
      chapterFilter !== 'all' || difficultyFilter !== 'all' || searchQuery.trim().length > 0;
    const rows = hasFilter ? filteredQuestions : questions;
    const suffix = hasFilter ? 'filtered' : 'full';
    downloadJsonFile(rows, `${exam.id}-question-bank-${suffix}.json`);
    setStatusBanner({
      type: 'success',
      message: `Exported ${rows.length} question(s) to ${exam.id}-question-bank-${suffix}.json.`,
    });
  };

  const handleExportSelectedJson = () => {
    const selectedRows = questions.filter((q) => selectedIds.has(q.id));
    if (selectedRows.length === 0) return;
    downloadJsonFile(selectedRows, `${exam.id}-selected-questions.json`);
    setStatusBanner({
      type: 'success',
      message: `Exported ${selectedRows.length} selected question(s) as .json.`,
    });
  };

  const handleCopyFormat = async (kind: 'add' | 'delete') => {
    const text = kind === 'add' ? sampleAddJson : sampleDeleteJson;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(kind);
      setTimeout(() => setCopiedFormat((curr) => (curr === kind ? null : curr)), 2000);
    } catch {
      setImportText(text);
      setManagerTab(kind === 'add' ? 'json-add' : 'json-delete');
      setShowImportModal(true);
    }
  };

  const validateJsonQuestionArray = (rawInput: unknown): Question[] => {
    let rawItems: unknown[];
    if (Array.isArray(rawInput)) {
      rawItems = rawInput;
    } else if (
      rawInput &&
      typeof rawInput === 'object' &&
      Array.isArray((rawInput as { questions?: unknown[] }).questions)
    ) {
      rawItems = (rawInput as { questions: unknown[] }).questions;
    } else if (rawInput && typeof rawInput === 'object') {
      rawItems = [rawInput];
    } else {
      throw new Error('JSON must be an array of question objects or { "questions": [...] }.');
    }

    if (rawItems.length === 0) {
      throw new Error('The JSON file contains 0 questions.');
    }

    const validated: Question[] = [];
    const seenIds = new Set<string>();
    const baseTs = Date.now();

    for (let i = 0; i < rawItems.length; i++) {
      const raw = rawItems[i] as Record<string, unknown>;
      if (!raw || typeof raw !== 'object') {
        throw new Error(`Item ${i + 1}: Must be a JSON object.`);
      }
      const chNum = Number(raw.chapterNumber);
      const chapterObj = exam.chapters.find((c) => c.chapterNumber === chNum);
      if (!chapterObj) {
        throw new Error(
          `Item ${i + 1}: chapterNumber "${String(raw.chapterNumber)}" must be between 1 and ${exam.chapters.length}.`
        );
      }

      const opts = raw.options as Record<string, unknown> | undefined;
      if (
        !raw.questionText ||
        typeof raw.questionText !== 'string' ||
        !opts ||
        !opts.A ||
        !opts.B ||
        !opts.C ||
        !opts.D ||
        !VALID_OPTIONS.includes(raw.correctAnswer as OptionKey) ||
        !raw.explanation
      ) {
        throw new Error(
          `Item ${i + 1}: Missing required fields (questionText, options.A–D, correctAnswer A/B/C/D, explanation).`
        );
      }

      let qId = raw.id ? String(raw.id).trim() : `${exam.id.toUpperCase()}-JSON-${baseTs}-${i + 1}`;
      if (seenIds.has(qId)) {
        qId = `${qId}-${i + 1}`;
      }
      seenIds.add(qId);

      validated.push({
        id: qId,
        examId: exam.id,
        examName: exam.name,
        chapterNumber: chNum,
        chapterTitle: chapterObj.title,
        topic: raw.topic ? String(raw.topic).trim() : 'General Concept',
        questionText: String(raw.questionText).trim(),
        options: {
          A: String(opts.A).trim(),
          B: String(opts.B).trim(),
          C: String(opts.C).trim(),
          D: String(opts.D).trim(),
        },
        correctAnswer: raw.correctAnswer as OptionKey,
        explanation: String(raw.explanation).trim(),
        difficulty: VALID_DIFFICULTIES.includes(raw.difficulty as DifficultyLevel)
          ? (raw.difficulty as DifficultyLevel)
          : 'Moderate',
        questionType: VALID_TYPES.includes(raw.questionType as QuestionType)
          ? (raw.questionType as QuestionType)
          : 'Conceptual',
      });
    }

    return validated;
  };

  const extractDeleteIdsFromJson = (rawInput: unknown): string[] => {
    let rawList: unknown[] | null = null;
    if (Array.isArray(rawInput)) {
      rawList = rawInput;
    } else if (rawInput && typeof rawInput === 'object') {
      const obj = rawInput as Record<string, unknown>;
      if (Array.isArray(obj.deleteIds)) {
        rawList = obj.deleteIds;
      } else if (Array.isArray(obj.ids)) {
        rawList = obj.ids;
      } else if (Array.isArray(obj.questions)) {
        rawList = obj.questions;
      } else if (typeof obj.id === 'string') {
        rawList = [obj.id];
      }
    }

    if (!rawList || rawList.length === 0) {
      throw new Error(
        'Provide a JSON array of question IDs (e.g. ["VA-C01-Q001"]), { "deleteIds": [...] }, or question objects containing "id".'
      );
    }

    const ids: string[] = [];
    for (let i = 0; i < rawList.length; i++) {
      const entry = rawList[i];
      if (typeof entry === 'string' && entry.trim()) {
        ids.push(entry.trim());
      } else if (
        entry &&
        typeof entry === 'object' &&
        typeof (entry as { id?: unknown }).id === 'string' &&
        (entry as { id: string }).id.trim()
      ) {
        ids.push((entry as { id: string }).id.trim());
      } else {
        throw new Error(`Entry ${i + 1}: Expected a question ID string or object with an "id" field.`);
      }
    }

    return Array.from(new Set(ids));
  };

  const handleManagerSubmit = async () => {
    setImportFeedback(null);
    try {
      if (managerTab === 'text') {
        const { questions: parsedQs, warnings } = parseChapterWiseMcqText(
          importText,
          exam,
          defaultChapter
        );
        if (parsedQs.length === 0) {
          setImportFeedback({
            type: 'error',
            message:
              'No complete MCQs detected. Ensure each question has numbered text, options A–D, and an Answer line (e.g., "Answer: B").',
          });
          return;
        }
        await onImportQuestions(parsedQs);
        const msg = `Extracted and added ${parsedQs.length} MCQ(s) into memory for ${exam.code}.${
          warnings.length > 0 ? ` (${warnings.length} incomplete item(s) skipped)` : ''
        }`;
        setImportFeedback({ type: 'success', message: msg });
        setStatusBanner({ type: 'success', message: msg });
        setImportText('');
        return;
      }

      const parsedJson = JSON.parse(importText);

      if (managerTab === 'json-add') {
        const validated = validateJsonQuestionArray(parsedJson);
        if (jsonWriteMode === 'replace') {
          await onReplaceQuestions(validated);
          setSelectedIds(new Set());
          const msg = `Replaced the ${exam.code} question bank with ${validated.length} question(s) from the .json file.`;
          setImportFeedback({ type: 'success', message: msg });
          setStatusBanner({ type: 'success', message: msg });
        } else {
          await onImportQuestions(validated);
          const msg = `Added/updated ${validated.length} question(s) from .json into the bank.`;
          setImportFeedback({ type: 'success', message: msg });
          setStatusBanner({ type: 'success', message: msg });
        }
        setImportText('');
        return;
      }

      if (managerTab === 'json-delete') {
        const requestedIds = extractDeleteIdsFromJson(parsedJson);
        const matchingIds = requestedIds.filter((id) => questionIdSet.has(id));
        if (matchingIds.length === 0) {
          setImportFeedback({
            type: 'error',
            message: `None of the ${requestedIds.length} ID(s) in the JSON matched questions currently in the bank.`,
          });
          return;
        }
        await onDeleteQuestions(matchingIds);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          matchingIds.forEach((id) => next.delete(id));
          return next;
        });
        const skipped = requestedIds.length - matchingIds.length;
        const msg = `Deleted ${matchingIds.length} question(s) listed in the .json file.${
          skipped > 0 ? ` (${skipped} ID(s) not found in bank)` : ''
        }`;
        setImportFeedback({ type: 'success', message: msg });
        setStatusBanner({ type: 'success', message: msg });
        setImportText('');
      }
    } catch (err) {
      setImportFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Invalid input format.',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFeedback(null);

    if (file.name.toLowerCase().endsWith('.json')) {
      if (managerTab === 'text') {
        setManagerTab('json-add');
      }
      const text = await file.text();
      setImportText(text);
    } else {
      setManagerTab('text');
      const extracted = await extractTextFromUploadedFile(file);
      setImportText(extracted);
    }
    e.target.value = '';
  };

  const handleAddSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddFormError(null);

    if (
      !formQuestionText.trim() ||
      !formOptA.trim() ||
      !formOptB.trim() ||
      !formOptC.trim() ||
      !formOptD.trim() ||
      !formExplanation.trim()
    ) {
      setAddFormError('Please fill in the question text, all four options (A–D), and the explanation.');
      return;
    }

    const chapterObj = exam.chapters.find((c) => c.chapterNumber === formChapter);
    if (!chapterObj) {
      setAddFormError('Select a valid syllabus chapter.');
      return;
    }

    const newQuestion: Question = {
      id: `${exam.id.toUpperCase()}-C${String(formChapter).padStart(2, '0')}-USER-${Date.now()}`,
      examId: exam.id,
      examName: exam.name,
      chapterNumber: formChapter,
      chapterTitle: chapterObj.title,
      topic: formTopic.trim() || 'General Concept',
      questionText: formQuestionText.trim(),
      options: {
        A: formOptA.trim(),
        B: formOptB.trim(),
        C: formOptC.trim(),
        D: formOptD.trim(),
      },
      correctAnswer: formCorrect,
      explanation: formExplanation.trim(),
      difficulty: formDifficulty,
      questionType: formType,
    };

    try {
      setIsSavingSingle(true);
      await onImportQuestions([newQuestion]);
      setShowAddModal(false);
      setFormTopic('');
      setFormQuestionText('');
      setFormOptA('');
      setFormOptB('');
      setFormOptC('');
      setFormOptD('');
      setFormCorrect('A');
      setFormExplanation('');
      setStatusBanner({
        type: 'success',
        message: `Added new question (${newQuestion.id}) to Chapter ${formChapter}.`,
      });
    } catch (err) {
      setAddFormError(err instanceof Error ? err.message : 'Failed to save question.');
    } finally {
      setIsSavingSingle(false);
    }
  };

  const handleDeleteSingle = async (id: string) => {
    await onDeleteQuestions([id]);
    setConfirmDeleteId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setStatusBanner({
      type: 'success',
      message: `Deleted question ${id} from the question bank.`,
    });
  };

  const handleBulkDeleteConfirmed = async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;
    await onDeleteQuestions(idsToDelete);
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
    setStatusBanner({
      type: 'success',
      message: `Deleted ${idsToDelete.length} selected question(s) from the question bank.`,
    });
  };

  const handleDeleteAllConfirmed = async () => {
    await onDeleteAllQuestions();
    setSelectedIds(new Set());
    setShowDeleteAllConfirm(false);
    setStatusBanner({
      type: 'success',
      message: 'Deleted all questions from the question bank.',
    });
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectPage = () => {
    const pageIds = paginatedQuestions.map((q) => q.id);
    const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const allPageSelected =
    paginatedQuestions.length > 0 && paginatedQuestions.every((q) => selectedIds.has(q.id));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
            {exam.code} · Structured Repository
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-slate-100">
            Question Bank ({questions.length} MCQs)
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">
            Add or delete questions directly below, manage bulk updates via .json files, or export the bank for editing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowFormatGuide((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Code2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{showFormatGuide ? 'Hide .json Format' : 'Show .json Format'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Export .json</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportFeedback(null);
              setManagerTab('json-add');
              setShowImportModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <FileJson className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add / Delete via .json</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAddFormError(null);
              setFormChapter(chapterFilter !== 'all' ? Number(chapterFilter) : 1);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {statusBanner && (
        <div
          className={`mt-5 flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs font-medium ${
            statusBanner.type === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          <span>{statusBanner.message}</span>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="font-semibold underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Supported .json File Format Reference Section */}
      {showFormatGuide && (
        <section
          aria-label="Supported JSON File Format"
          className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                Supported .json File Format
              </h2>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Use these .json structures to add new questions, sync edits from an exported .json file, or delete questions by ID.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => setFormatGuideTab('add')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    formatGuideTab === 'add'
                      ? 'bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Add / Replace Format
                </button>
                <button
                  type="button"
                  onClick={() => setFormatGuideTab('delete')}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    formatGuideTab === 'delete'
                      ? 'bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Delete Format
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowFormatGuide(false)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Hide</span>
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Field Specifications */}
            <div className="lg:col-span-5 text-xs text-slate-600 dark:text-slate-300 space-y-2.5">
              {formatGuideTab === 'add' ? (
                <>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Top-level Array <code className="font-mono text-blue-700 dark:text-blue-400">[ &#123;...&#125; ]</code> or{' '}
                    <code className="font-mono text-blue-700 dark:text-blue-400">&#123; &quot;questions&quot;: [...] &#125;</code>
                  </div>
                  <ul className="space-y-1.5 leading-relaxed">
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">chapterNumber</strong>{' '}
                      <span className="font-mono-tabular text-rose-600 dark:text-rose-400">(required)</span>: Integer{' '}
                      <code className="font-mono">1</code> to <code className="font-mono">{exam.chapters.length}</code>.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">questionText</strong>{' '}
                      <span className="font-mono-tabular text-rose-600 dark:text-rose-400">(required)</span>: Full MCQ prompt.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">options</strong>{' '}
                      <span className="font-mono-tabular text-rose-600 dark:text-rose-400">(required)</span>: Object with{' '}
                      <code className="font-mono">A</code>, <code className="font-mono">B</code>,{' '}
                      <code className="font-mono">C</code>, <code className="font-mono">D</code> strings.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">correctAnswer</strong>{' '}
                      <span className="font-mono-tabular text-rose-600 dark:text-rose-400">(required)</span>:{' '}
                      <code className="font-mono">&quot;A&quot;</code>, <code className="font-mono">&quot;B&quot;</code>,{' '}
                      <code className="font-mono">&quot;C&quot;</code>, or <code className="font-mono">&quot;D&quot;</code>.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">explanation</strong>{' '}
                      <span className="font-mono-tabular text-rose-600 dark:text-rose-400">(required)</span>: Answer rationale.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">Optional fields</strong>:{' '}
                      <code className="font-mono">id</code> (auto-generated if omitted),{' '}
                      <code className="font-mono">topic</code>,{' '}
                      <code className="font-mono">difficulty</code> (Easy / Moderate / Difficult),{' '}
                      <code className="font-mono">questionType</code>.
                    </li>
                  </ul>
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-400">
                    Tip: Click <strong>Export .json</strong> to download the bank, add or remove entries in the .json file, then upload it using <strong>Replace Bank</strong> mode to sync both additions and deletions.
                  </p>
                </>
              ) : (
                <>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Supported .json Deletion Formats
                  </div>
                  <ul className="space-y-1.5 leading-relaxed">
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">Object with ID list</strong>:{' '}
                      <code className="font-mono">&#123; &quot;deleteIds&quot;: [&quot;ID-1&quot;, &quot;ID-2&quot;] &#125;</code>
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">Plain array of IDs</strong>:{' '}
                      <code className="font-mono">[&quot;VA-C01-Q001&quot;, &quot;VA-PDF-C01-Q002&quot;]</code>
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-slate-100">Array of question objects</strong>:{' '}
                      <code className="font-mono">[&#123; &quot;id&quot;: &quot;VA-C01-Q001&quot;, ... &#125;]</code> (e.g. an exported selection file)
                    </li>
                  </ul>
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-950/60 dark:text-slate-400">
                    Upload the file under <strong>Add / Delete via .json → Delete via .json</strong> to remove all matching question IDs in one step.
                  </p>
                </>
              )}
            </div>

            {/* Code Preview + Quick Actions */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-lg border border-b-0 border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                <span className="font-mono text-xs font-medium text-slate-600 dark:text-slate-400">
                  {formatGuideTab === 'add' ? 'sample-questions.json' : 'delete-questions.json'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyFormat(formatGuideTab)}
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {copiedFormat === formatGuideTab ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" aria-hidden="true" />
                        <span>Copy Format</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadJsonFile(
                        JSON.parse(formatGuideTab === 'add' ? sampleAddJson : sampleDeleteJson),
                        formatGuideTab === 'add'
                          ? `${exam.id}-sample-add.json`
                          : `${exam.id}-sample-delete.json`
                      )
                    }
                    className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Download className="h-3 w-3" aria-hidden="true" />
                    <span>Download Sample .json</span>
                  </button>
                </div>
              </div>
              <pre className="max-h-56 overflow-auto rounded-b-lg border border-slate-200 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100 dark:border-slate-800">
                {formatGuideTab === 'add' ? sampleAddJson : sampleDeleteJson}
              </pre>
            </div>
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by topic, text, or ID..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <select
          value={chapterFilter}
          onChange={(e) => {
            setChapterFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by chapter"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="all">All Chapters ({exam.chapters.length})</option>
          {exam.chapters.map((c) => (
            <option key={c.chapterNumber} value={String(c.chapterNumber)}>
              Ch. {c.chapterNumber}: {c.title}
            </option>
          ))}
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) => {
            setDifficultyFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by difficulty"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="all">All Difficulties</option>
          {VALID_DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Count & Bulk Selection Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={allPageSelected}
              onChange={toggleSelectPage}
              disabled={paginatedQuestions.length === 0}
              className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600 dark:border-slate-700"
            />
            <span>Select Page ({paginatedQuestions.length})</span>
          </label>

          {filteredQuestions.length > paginatedQuestions.length && (
            <button
              type="button"
              onClick={() => setSelectedIds(new Set(filteredQuestions.map((q) => q.id)))}
              className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              Select All Matching ({filteredQuestions.length})
            </button>
          )}

          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Clear Selection ({selectedIds.size})
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {selectedIds.size > 0 ? (
            <>
              <button
                type="button"
                onClick={handleExportSelectedJson}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export Selected .json ({selectedIds.size})</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Delete Selected ({selectedIds.size})</span>
              </button>
            </>
          ) : (
            <span className="font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
              Showing {filteredQuestions.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filteredQuestions.length)} of {filteredQuestions.length} matching ({questions.length} total)
            </span>
          )}

          {questions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowDeleteAllConfirm(true)}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-950/70"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
              <span>Delete All</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {filteredQuestions.length === 0 ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            {questions.length === 0
              ? 'Question bank is empty (0 MCQs)'
              : 'No questions match the current filters'}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {questions.length === 0
              ? 'Add questions individually using the form or import questions from a .json or .doc/.txt file using the format above.'
              : 'Try adjusting your search query, chapter filter, or difficulty filter.'}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            {questions.length === 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAddFormError(null);
                    setShowAddModal(true);
                  }}
                  className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 dark:bg-blue-600"
                >
                  Add Question
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportFeedback(null);
                    setManagerTab('json-add');
                    setShowImportModal(true);
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  Upload .json File
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setChapterFilter('all');
                  setDifficultyFilter('all');
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Questions List */
        <div className="mt-4 space-y-3">
          {paginatedQuestions.map((q) => {
            const isSelected = selectedIds.has(q.id);
            const isConfirming = confirmDeleteId === q.id;
            return (
              <div
                key={q.id}
                className={`rounded-xl border bg-white p-5 transition-colors dark:bg-slate-900 ${
                  isSelected
                    ? 'border-blue-500 ring-1 ring-blue-500/30 dark:border-blue-500'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectId(q.id)}
                    aria-label={`Select question ${q.id}`}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-700 focus:ring-blue-600 dark:border-slate-700"
                  />

                  <details className="group min-w-0 flex-1">
                    <summary className="cursor-pointer list-none">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono-tabular font-semibold text-blue-700 dark:text-blue-400">
                            {q.id}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Ch. {q.chapterNumber}: {q.chapterTitle}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{q.topic}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono-tabular">
                          <span>{q.questionType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{q.difficulty}</span>
                          <ChevronDown
                            className="h-3.5 w-3.5 text-slate-400 transition-transform group-open:rotate-180"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                      <p className="mt-2 font-display text-sm font-semibold text-slate-900 sm:text-base dark:text-slate-100">
                        {q.questionText}
                      </p>
                    </summary>

                    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {VALID_OPTIONS.map((k) => {
                          const isCorrect = q.correctAnswer === k;
                          return (
                            <div
                              key={k}
                              className={`rounded-lg border px-3 py-2 text-xs sm:text-sm ${
                                isCorrect
                                  ? 'border-emerald-400 bg-emerald-50/70 font-medium text-slate-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-slate-100'
                                  : 'border-slate-200 bg-slate-50/60 text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300'
                              }`}
                            >
                              <span className="font-mono-tabular font-bold">{k}.</span> {q.options[k]}
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-slate-100">Explanation:</strong>{' '}
                        {q.explanation}
                      </p>
                    </div>
                  </details>

                  {/* Per-question Delete Control */}
                  <div className="shrink-0">
                    {isConfirming ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteSingle(q.id)}
                          className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(q.id)}
                        aria-label={`Delete question ${q.id}`}
                        title="Delete question"
                        className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Previous Page
          </button>
          <span className="font-mono-tabular text-xs font-medium text-slate-600 dark:text-slate-300">
            Page {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Next Page
          </button>
        </div>
      )}

      {/* Add Single Question Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-question-modal-title"
        >
          <form
            onSubmit={handleAddSingleSubmit}
            className="my-8 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <h2
              id="add-question-modal-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              Add Question to {exam.code}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Create a new MCQ directly in memory for Full Mock Tests and Chapter-wise Practice.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Chapter
                </label>
                <select
                  value={formChapter}
                  onChange={(e) => setFormChapter(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {exam.chapters.map((c) => (
                    <option key={c.chapterNumber} value={c.chapterNumber}>
                      Ch. {c.chapterNumber}: {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Topic / Subtopic
                </label>
                <input
                  type="text"
                  value={formTopic}
                  onChange={(e) => setFormTopic(e.target.value)}
                  placeholder="e.g., Expense Ratio, KYC Norms"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Difficulty
                  </label>
                  <select
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value as DifficultyLevel)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {VALID_DIFFICULTIES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Question Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as QuestionType)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    {VALID_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Question Text
                </label>
                <textarea
                  rows={3}
                  value={formQuestionText}
                  onChange={(e) => setFormQuestionText(e.target.value)}
                  placeholder="Enter the MCQ prompt..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Option A
                </label>
                <input
                  type="text"
                  value={formOptA}
                  onChange={(e) => setFormOptA(e.target.value)}
                  placeholder="Option A"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Option B
                </label>
                <input
                  type="text"
                  value={formOptB}
                  onChange={(e) => setFormOptB(e.target.value)}
                  placeholder="Option B"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Option C
                </label>
                <input
                  type="text"
                  value={formOptC}
                  onChange={(e) => setFormOptC(e.target.value)}
                  placeholder="Option C"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Option D
                </label>
                <input
                  type="text"
                  value={formOptD}
                  onChange={(e) => setFormOptD(e.target.value)}
                  placeholder="Option D"
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Correct Answer
                </label>
                <select
                  value={formCorrect}
                  onChange={(e) => setFormCorrect(e.target.value as OptionKey)}
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {VALID_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      Option {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Explanation
                </label>
                <textarea
                  rows={2}
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                  placeholder="Explain why the selected option is correct..."
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            </div>

            {addFormError && (
              <div className="mt-3 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                {addFormError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingSingle}
                className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50 dark:bg-blue-600"
              >
                {isSavingSingle ? 'Saving...' : 'Save Question'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* JSON & File Add / Delete Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
        >
          <div className="my-8 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                id="import-modal-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                Manage Questions via .json &amp; Text
              </h2>

              <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setImportFeedback(null);
                    setManagerTab('json-add');
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    managerTab === 'json-add'
                      ? 'bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Add / Sync .json
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportFeedback(null);
                    setManagerTab('json-delete');
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    managerTab === 'json-delete'
                      ? 'bg-white text-rose-700 shadow-xs dark:bg-slate-900 dark:text-rose-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Delete via .json
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportFeedback(null);
                    setManagerTab('text');
                  }}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                    managerTab === 'text'
                      ? 'bg-white text-blue-700 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  .doc / Text
                </button>
              </div>
            </div>

            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
              {managerTab === 'json-add'
                ? 'Upload a .json file or paste JSON questions to either add/merge into the bank or replace the entire bank (syncing both additions and deletions).'
                : managerTab === 'json-delete'
                  ? 'Upload a .json file or paste JSON containing question IDs (["ID-1", ...], { "deleteIds": [...] }, or [{ "id": "..." }]) to delete them from memory.'
                  : 'Upload a .doc or .txt file, or paste chapter-wise MCQs from Microsoft Word.'}
            </p>

            {managerTab === 'json-add' && (
              <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Mode:</span>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="jsonWriteMode"
                    checked={jsonWriteMode === 'merge'}
                    onChange={() => setJsonWriteMode('merge')}
                    className="text-blue-700"
                  />
                  <span>Add / Update existing bank</span>
                </label>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="jsonWriteMode"
                    checked={jsonWriteMode === 'replace'}
                    onChange={() => setJsonWriteMode('replace')}
                    className="text-blue-700"
                  />
                  <span>Replace entire bank with this .json (Sync Add &amp; Delete)</span>
                </label>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>
                    {managerTab === 'text' ? 'Load .doc / .txt / .json' : 'Upload .json File'}
                  </span>
                  <input
                    type="file"
                    accept={
                      managerTab === 'text'
                        ? '.doc,.txt,.json,application/msword,text/plain,application/json'
                        : '.json,application/json'
                    }
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {managerTab === 'text' && (
                  <select
                    value={defaultChapter}
                    onChange={(e) => setDefaultChapter(Number(e.target.value))}
                    aria-label="Fallback Chapter"
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {exam.chapters.map((c) => (
                      <option key={c.chapterNumber} value={c.chapterNumber}>
                        Default: Ch. {c.chapterNumber}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setImportText(
                    managerTab === 'json-add'
                      ? sampleAddJson
                      : managerTab === 'json-delete'
                        ? sampleDeleteJson
                        : sampleTextTemplate
                  )
                }
                className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
              >
                Insert Sample Format
              </button>
            </div>

            <textarea
              rows={9}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={
                managerTab === 'json-add'
                  ? 'Paste JSON array of questions or upload a .json file...'
                  : managerTab === 'json-delete'
                    ? 'Paste JSON array of question IDs or { "deleteIds": [...] }...'
                    : 'Paste chapter-wise MCQs from your Word document...'
              }
              className="mt-3 w-full rounded-lg border border-slate-300 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />

            {importFeedback && (
              <div
                className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${
                  importFeedback.type === 'success'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {importFeedback.message}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!importText.trim()}
                onClick={handleManagerSubmit}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 ${
                  managerTab === 'json-delete'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-blue-700 hover:bg-blue-800 dark:bg-blue-600'
                }`}
              >
                {managerTab === 'json-delete'
                  ? 'Delete Matching Questions'
                  : managerTab === 'json-add' && jsonWriteMode === 'replace'
                    ? 'Replace Question Bank'
                    : 'Save to Question Bank'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2
              id="bulk-delete-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              Delete {selectedIds.size} Selected Question(s)?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              These questions will be removed from your local bank and excluded from future mock tests and chapter drills. You can export a backup .json or restore defaults anytime.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteConfirmed}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Delete Questions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Dialog */}
      {showDeleteAllConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-all-title"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <h2
              id="delete-all-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              Delete All {questions.length} Question(s)?
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This will permanently remove every question stored in the question bank. Consider exporting a .json backup first if you want to keep a copy.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllConfirmed}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Delete All Questions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
