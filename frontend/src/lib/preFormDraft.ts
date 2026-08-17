import type { CandidateFormData } from '../pages/candidates/wizard/wizardTypes';

const FILE_KEYS = ['photoFileObject', 'resumeFileObject', 'resumeFile'] as const;

function storageKey(token: string) {
  return `preform-draft:${token}`;
}

function omitFiles(data: CandidateFormData): Record<string, unknown> {
  const out: Record<string, unknown> = { ...data };
  for (const key of FILE_KEYS) {
    delete out[key];
  }
  delete out.photoFileObject;
  delete out.resumeFileObject;
  return out;
}

export function loadPreFormDraft(token: string): Partial<CandidateFormData> | null {
  try {
    const raw = sessionStorage.getItem(storageKey(token));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<CandidateFormData>;
  } catch {
    return null;
  }
}

export function savePreFormDraft(token: string, data: CandidateFormData) {
  try {
    sessionStorage.setItem(storageKey(token), JSON.stringify(omitFiles(data)));
  } catch {
    /* quota / private mode */
  }
  void putDraftFile(token, 'photo', data.photoFileObject);
  void putDraftFile(token, 'resume', data.resumeFileObject);
}

export function clearPreFormDraft(token: string) {
  try {
    sessionStorage.removeItem(storageKey(token));
  } catch {
    /* ignore */
  }
  void putDraftFile(token, 'photo', null);
  void putDraftFile(token, 'resume', null);
}

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    const req = indexedDB.open('nippon-preform', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('files')) {
        req.result.createObjectStore('files');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

export async function putStoredFile(key: string, file: File | null) {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    if (file) store.put(file, key);
    else store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}

export async function getStoredFile(key: string): Promise<File | null> {
  const db = await openDb();
  if (!db) return null;
  const file = await new Promise<File | null>((resolve) => {
    const tx = db.transaction('files', 'readonly');
    const req = tx.objectStore('files').get(key);
    req.onsuccess = () => resolve((req.result as File) || null);
    req.onerror = () => resolve(null);
  });
  db.close();
  return file;
}

async function putDraftFile(token: string, kind: 'photo' | 'resume', file: File | null) {
  await putStoredFile(`${token}:${kind}`, file);
}

export async function loadDraftFiles(token: string): Promise<{
  photoFileObject: File | null;
  resumeFileObject: File | null;
}> {
  const [photoFileObject, resumeFileObject] = await Promise.all([
    getStoredFile(`${token}:photo`),
    getStoredFile(`${token}:resume`),
  ]);
  return { photoFileObject, resumeFileObject };
}

export function loadJsonDraft<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveJsonDraft(key: string, data: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota / private mode */
  }
}

export function clearJsonDraft(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
