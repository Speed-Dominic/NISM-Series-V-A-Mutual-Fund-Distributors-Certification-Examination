import { BUILTIN_BANK_VERSION, BUILTIN_QUESTIONS } from '../data/questionBank';
import { ActiveTestSession, Question, TestAttempt, UserPreferences } from '../types/exam';

const DB_NAME = 'nism_exam_prep_db';
const DB_VERSION = 1;

const STORE_QUESTIONS = 'questions';
const STORE_ATTEMPTS = 'attempts';
const STORE_ACTIVE_SESSION = 'activeSession';
const STORE_PREFERENCES = 'preferences';

const ACTIVE_SESSION_KEY = 'current_session';
const PREFS_KEY = 'user_preferences';
const BANK_VERSION_KEY = 'builtin_bank_version';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
        const qStore = db.createObjectStore(STORE_QUESTIONS, { keyPath: 'id' });
        qStore.createIndex('examId', 'examId', { unique: false });
        qStore.createIndex('examChapter', ['examId', 'chapterNumber'], { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_ATTEMPTS)) {
        const aStore = db.createObjectStore(STORE_ATTEMPTS, { keyPath: 'id' });
        aStore.createIndex('examId', 'examId', { unique: false });
        aStore.createIndex('completedAt', 'completedAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_ACTIVE_SESSION)) {
        db.createObjectStore(STORE_ACTIVE_SESSION, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORE_PREFERENCES)) {
        db.createObjectStore(STORE_PREFERENCES, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export async function initDatabaseAndSeed(): Promise<void> {
  const db = await openDB();
  try {
    const readTx = db.transaction(STORE_PREFERENCES, 'readonly');
    const verRecord = await idbReq<{ key: string; value: number } | undefined>(
      readTx.objectStore(STORE_PREFERENCES).get(BANK_VERSION_KEY)
    );
    await txDone(readTx);

    if (!verRecord || verRecord.value < BUILTIN_BANK_VERSION) {
      const existingTx = db.transaction([STORE_ATTEMPTS], 'readonly');
      const existingAttempts = await idbReq<TestAttempt[]>(
        existingTx.objectStore(STORE_ATTEMPTS).getAll()
      );
      await txDone(existingTx);

      const writeTx = db.transaction(
        [STORE_QUESTIONS, STORE_ATTEMPTS, STORE_ACTIVE_SESSION, STORE_PREFERENCES],
        'readwrite'
      );
      const qStore = writeTx.objectStore(STORE_QUESTIONS);
      const aStore = writeTx.objectStore(STORE_ATTEMPTS);

      qStore.clear();
      for (const oldA of existingAttempts) {
        if (oldA.examId !== 'nism-va') {
          aStore.delete(oldA.id);
        }
      }
      writeTx.objectStore(STORE_ACTIVE_SESSION).delete(ACTIVE_SESSION_KEY);

      for (const q of BUILTIN_QUESTIONS) {
        qStore.put(q);
      }
      writeTx.objectStore(STORE_PREFERENCES).put({
        key: BANK_VERSION_KEY,
        value: BUILTIN_BANK_VERSION,
      });
      await txDone(writeTx);
    }
  } finally {
    db.close();
  }
}

export async function getAllQuestions(): Promise<Question[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_QUESTIONS, 'readonly');
    const rows = await idbReq<Question[]>(tx.objectStore(STORE_QUESTIONS).getAll());
    await txDone(tx);
    return rows;
  } finally {
    db.close();
  }
}

export async function getQuestionsByExam(examId: string): Promise<Question[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_QUESTIONS, 'readonly');
    const index = tx.objectStore(STORE_QUESTIONS).index('examId');
    const rows = await idbReq<Question[]>(index.getAll(IDBKeyRange.only(examId)));
    await txDone(tx);
    return rows;
  } finally {
    db.close();
  }
}

export async function importQuestionsBatch(questions: Question[]): Promise<number> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_QUESTIONS, 'readwrite');
    const store = tx.objectStore(STORE_QUESTIONS);
    for (const q of questions) {
      store.put(q);
    }
    await txDone(tx);
    return questions.length;
  } finally {
    db.close();
  }
}

export async function deleteQuestionsBatch(questionIds: string[]): Promise<number> {
  if (questionIds.length === 0) return 0;
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_QUESTIONS, 'readwrite');
    const store = tx.objectStore(STORE_QUESTIONS);
    for (const id of questionIds) {
      store.delete(id);
    }
    await txDone(tx);
    return questionIds.length;
  } finally {
    db.close();
  }
}

export async function replaceExamQuestions(examId: string, questions: Question[]): Promise<void> {
  const db = await openDB();
  try {
    const readTx = db.transaction(STORE_QUESTIONS, 'readonly');
    const index = readTx.objectStore(STORE_QUESTIONS).index('examId');
    const existing = await idbReq<Question[]>(index.getAll(IDBKeyRange.only(examId)));
    await txDone(readTx);

    const writeTx = db.transaction(STORE_QUESTIONS, 'readwrite');
    const store = writeTx.objectStore(STORE_QUESTIONS);
    for (const oldQ of existing) {
      store.delete(oldQ.id);
    }
    for (const q of questions) {
      store.put(q);
    }
    await txDone(writeTx);
  } finally {
    db.close();
  }
}

export async function clearAllQuestions(): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_QUESTIONS, 'readwrite');
    tx.objectStore(STORE_QUESTIONS).clear();
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function getAttemptsByExam(examId: string): Promise<TestAttempt[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_ATTEMPTS, 'readonly');
    const index = tx.objectStore(STORE_ATTEMPTS).index('examId');
    const rows = await idbReq<TestAttempt[]>(index.getAll(IDBKeyRange.only(examId)));
    await txDone(tx);
    return rows.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  } finally {
    db.close();
  }
}

export async function getAllAttempts(): Promise<TestAttempt[]> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_ATTEMPTS, 'readonly');
    const rows = await idbReq<TestAttempt[]>(tx.objectStore(STORE_ATTEMPTS).getAll());
    await txDone(tx);
    return rows.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  } finally {
    db.close();
  }
}

export async function saveAttempt(attempt: TestAttempt): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_ATTEMPTS, 'readwrite');
    tx.objectStore(STORE_ATTEMPTS).put(attempt);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function deleteAttempt(attemptId: string): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_ATTEMPTS, 'readwrite');
    tx.objectStore(STORE_ATTEMPTS).delete(attemptId);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function getActiveSession(): Promise<ActiveTestSession | null> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_ACTIVE_SESSION, 'readonly');
    const session = await idbReq<ActiveTestSession | undefined>(
      tx.objectStore(STORE_ACTIVE_SESSION).get(ACTIVE_SESSION_KEY)
    );
    await txDone(tx);
    return session ?? null;
  } finally {
    db.close();
  }
}

export async function saveActiveSession(session: ActiveTestSession): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_ACTIVE_SESSION, 'readwrite');
    tx.objectStore(STORE_ACTIVE_SESSION).put({
      ...session,
      id: ACTIVE_SESSION_KEY,
      lastUpdatedAt: new Date().toISOString(),
    });
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function clearActiveSession(): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_ACTIVE_SESSION, 'readwrite');
    tx.objectStore(STORE_ACTIVE_SESSION).delete(ACTIVE_SESSION_KEY);
    await txDone(tx);
  } finally {
    db.close();
  }
}

export async function getPreferences(): Promise<UserPreferences> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_PREFERENCES, 'readonly');
    const record = await idbReq<{ key: string; value: UserPreferences } | undefined>(
      tx.objectStore(STORE_PREFERENCES).get(PREFS_KEY)
    );
    await txDone(tx);
    return (
      record?.value ?? {
        selectedExamId: null,
        theme: 'light',
      }
    );
  } finally {
    db.close();
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const db = await openDB();
  try {
    const tx = db.transaction(STORE_PREFERENCES, 'readwrite');
    tx.objectStore(STORE_PREFERENCES).put({
      key: PREFS_KEY,
      value: prefs,
    });
    await txDone(tx);
  } finally {
    db.close();
  }
}
