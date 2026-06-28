import { get, set, del } from 'idb-keyval';
import type { Session, SessionIndex } from './types';
import { countWords, previewText } from './format';

const INDEX_KEY = 'lecture-steno:index';
const SESSION_PREFIX = 'lecture-steno:session:';
const MAX_LOCAL_LENGTH = 4_500_000; // ~4.5MB safety margin per key

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function buildIndex(s: Session): SessionIndex {
  const finalSegments = s.segments.filter((seg) => seg.isFinal);
  const fullText = finalSegments.map((seg) => seg.text).join(' ');
  return {
    id: s.id,
    title: s.title,
    lecturer: s.lecturer,
    date: s.date,
    updatedAt: s.updatedAt,
    lang: s.lang,
    durationMs: s.durationMs,
    wordCount: countWords(fullText),
    segmentCount: finalSegments.length,
    preview: previewText(fullText, 80),
  };
}

export async function listSessions(): Promise<SessionIndex[]> {
  const raw = localStorage.getItem(INDEX_KEY);
  const list = safeParse<SessionIndex[]>(raw, []);
  return list.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

async function readRawSession(id: string): Promise<Session | null> {
  const key = SESSION_PREFIX + id;
  // Try localStorage first
  const local = localStorage.getItem(key);
  if (local !== null) {
    return safeParse<Session | null>(local, null);
  }
  // Fallback to IndexedDB
  const idbVal = await get<Session>(key);
  return idbVal ?? null;
}

async function writeRawSession(session: Session): Promise<void> {
  const key = SESSION_PREFIX + session.id;
  const payload = JSON.stringify(session);
  if (payload.length <= MAX_LOCAL_LENGTH) {
    try {
      localStorage.setItem(key, payload);
      return;
    } catch {
      // localStorage quota exceeded; fall through to IDB
    }
  }
  await set(key, session);
}

async function deleteRawSession(id: string): Promise<void> {
  const key = SESSION_PREFIX + id;
  localStorage.removeItem(key);
  await del(key);
}

export async function getSession(id: string): Promise<Session | null> {
  return readRawSession(id);
}

export async function saveSession(session: Session): Promise<SessionIndex> {
  await writeRawSession(session);
  const index = buildIndex(session);
  const list = await listSessions();
  const idx = list.findIndex((it) => it.id === session.id);
  if (idx >= 0) list[idx] = index;
  else list.push(index);
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
  return index;
}

export async function deleteSession(id: string): Promise<void> {
  await deleteRawSession(id);
  const list = await listSessions();
  const next = list.filter((it) => it.id !== id);
  localStorage.setItem(INDEX_KEY, JSON.stringify(next));
}

export async function clearAllSessions(): Promise<void> {
  const list = await listSessions();
  for (const it of list) {
    await deleteRawSession(it.id);
  }
  localStorage.removeItem(INDEX_KEY);
}

export async function getAllSessions(): Promise<Session[]> {
  const list = await listSessions();
  const sessions: Session[] = [];
  for (const it of list) {
    const s = await readRawSession(it.id);
    if (s) sessions.push(s);
  }
  return sessions;
}
