import { create } from 'zustand';
import { createSpeechController, type SpeechController } from './speech';
import {
  createSpeakerRecognizer,
  type SpeakerRecognizer,
  isSpeakerSupported,
} from './speaker';
import { WakeLockController } from './wakeLock';
import {
  streamAgnes,
  buildSummaryMessages,
  buildCorrectMessages,
} from './agnes';
import type {
  RecognitionState,
  Session,
  SessionIndex,
  Settings,
  SpeechError,
  SpeechSegment,
  ThemeMode,
} from './types';
import * as storage from './storage';

const SETTINGS_KEY = 'lecture-steno:settings';
const APIKEY_KEY = 'lecture-steno:apikey';

const DEFAULT_SETTINGS: Settings = {
  lang: 'zh-CN',
  continuous: true,
  interimResults: true,
  maxAlternatives: 1,
  theme: 'dark',
  fontScale: 1,
  autoPunctuateHint: true,
  enableAI: true,
  enableSpeakerId: true,
  enableWakeLock: true,
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS;
}

function persistSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function loadApiKey(): string {
  return localStorage.getItem(APIKEY_KEY) || '';
}

function persistApiKey(k: string): void {
  if (k) localStorage.setItem(APIKEY_KEY, k);
  else localStorage.removeItem(APIKEY_KEY);
}

export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement;
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  root.classList.toggle('dark', isDark);
}

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function newSession(lang: string, title?: string): Session {
  const now = new Date().toISOString();
  return {
    id: uid(),
    title: title || '未命名课程',
    lecturer: '',
    date: now,
    updatedAt: now,
    lang,
    segments: [],
    highlights: [],
    sections: [],
    durationMs: 0,
    summary: '',
    correctedText: '',
    speakerLabels: {},
  };
}

interface AppStore {
  sessions: SessionIndex[];
  currentSession: Session | null;
  recognitionState: RecognitionState;
  interimText: string;
  lastError: SpeechError | null;
  elapsedMs: number;
  settings: Settings;
  saving: boolean;
  initialized: boolean;

  apiKey: string;
  speakerCount: number;
  summary: string;
  summaryRunning: boolean;
  correctRunning: boolean;
  correctedText: string;
  aiError: string | null;

  init: () => Promise<void>;
  loadSessions: () => Promise<void>;
  createSession: (title?: string) => string;
  openSession: (id: string) => Promise<void>;
  closeSession: () => void;
  updateSessionMeta: (patch: Partial<Pick<Session, 'title' | 'lecturer'>>) => void;

  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
  dismissError: () => void;

  toggleHighlight: (segId: string) => void;
  addSection: (label?: string) => void;
  editSegment: (segId: string, text: string) => void;
  deleteSegment: (segId: string) => void;
  clearSegments: () => void;

  updateSettings: (patch: Partial<Settings>) => void;
  deleteSession: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;

  setApiKey: (key: string) => void;
  setSpeakerLabel: (id: number, label: string) => void;
  runSummary: () => Promise<void>;
  correctAll: () => Promise<void>;
  applyCorrected: () => void;
  clearSummary: () => void;
  dismissAiError: () => void;
}

export const useStore = create<AppStore>((set, get) => {
  const initialSettings = loadSettings();
  applyTheme(initialSettings.theme);
  const initialApiKey = loadApiKey();

  let controller: SpeechController | null = null;
  let speaker: SpeakerRecognizer | null = null;
  let wakeLock: WakeLockController | null = null;
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  let sessionStartEpoch = 0;
  let accumulatedMs = 0;
  let lastSummaryAt = 0;
  let segsSinceSummary = 0;
  let summaryAbort: AbortController | null = null;
  let correctAbort: AbortController | null = null;

  function ensureController(settings: Settings): SpeechController {
    if (!controller) {
      controller = createSpeechController({
        lang: settings.lang,
        continuous: settings.continuous,
        interimResults: settings.interimResults,
        maxAlternatives: settings.maxAlternatives,
      });
      controller.onStateChange((state) => set({ recognitionState: state }));
      controller.onError((err) => set({ lastError: err }));
      controller.onSegment((seg) => {
        const { currentSession } = get();
        if (!currentSession) return;
        if (seg.isFinal) {
          const speakerId = speaker?.getSpeakerAt(seg.timestamp) ?? 0;
          const finalSeg: SpeechSegment = { ...seg, speakerId };
          const next: Session = {
            ...currentSession,
            segments: [...currentSession.segments, finalSeg],
            updatedAt: new Date().toISOString(),
          };
          segsSinceSummary += 1;
          set({ currentSession: next, interimText: '', saving: true });
          void persistCurrent();
          maybeAutoSummary();
        } else {
          set({ interimText: seg.text });
        }
      });
    } else {
      controller.updateConfig({
        lang: settings.lang,
        continuous: settings.continuous,
        interimResults: settings.interimResults,
        maxAlternatives: settings.maxAlternatives,
      });
    }
    return controller;
  }

  function ensureSpeaker(): SpeakerRecognizer {
    if (!speaker) {
      speaker = createSpeakerRecognizer();
      speaker.onClusterChange((count) => set({ speakerCount: count }));
    }
    return speaker;
  }

  function ensureWakeLock(): WakeLockController {
    if (!wakeLock) wakeLock = new WakeLockController();
    return wakeLock;
  }

  async function persistCurrent(): Promise<void> {
    const { currentSession } = get();
    if (!currentSession) return;
    const session = { ...currentSession, updatedAt: new Date().toISOString() };
    try {
      await storage.saveSession(session);
      const sessions = await storage.listSessions();
      set({ currentSession: session, sessions, saving: false });
    } catch {
      set({ saving: false });
    }
  }

  function startTick(): void {
    if (tickTimer) clearInterval(tickTimer);
    sessionStartEpoch = Date.now();
    tickTimer = setInterval(() => {
      set({ elapsedMs: accumulatedMs + (Date.now() - sessionStartEpoch) });
    }, 500);
  }

  function stopTick(): void {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    accumulatedMs += Date.now() - sessionStartEpoch;
    set({ elapsedMs: accumulatedMs });
  }

  function maybeAutoSummary(): void {
    const { settings, apiKey, summaryRunning } = get();
    if (!settings.enableAI || !apiKey || summaryRunning) return;
    const now = Date.now();
    if (now - lastSummaryAt < 30000 && segsSinceSummary < 6) return;
    void runSummaryInternal();
  }

  async function runSummaryInternal(): Promise<void> {
    const { currentSession, apiKey, settings, summary } = get();
    if (!currentSession || !apiKey) {
      if (!apiKey) set({ aiError: '未配置 Agnes API Key，请在设置页填入。' });
      return;
    }
    const text = currentSession.segments
      .filter((s) => s.isFinal)
      .map((s) => s.text)
      .join('')
      .slice(-2000);
    if (!text.trim()) return;

    summaryAbort?.abort();
    summaryAbort = new AbortController();
    set({ summaryRunning: true, aiError: null, summary: '' });

    try {
      const result = await streamAgnes(
        apiKey,
        buildSummaryMessages(text, settings.lang, summary || undefined),
        (delta) => set((st) => ({ summary: st.summary + delta })),
        summaryAbort.signal,
      );
      lastSummaryAt = Date.now();
      segsSinceSummary = 0;
      const sess = get().currentSession;
      if (sess) {
        const next = { ...sess, summary: result };
        set({ currentSession: next });
        void persistCurrent();
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        set({ aiError: e instanceof Error ? e.message : '总结失败' });
      }
    } finally {
      set({ summaryRunning: false });
      summaryAbort = null;
    }
  }

  ensureController(initialSettings);

  return {
    sessions: [],
    currentSession: null,
    recognitionState: 'idle',
    interimText: '',
    lastError: null,
    elapsedMs: 0,
    settings: initialSettings,
    saving: false,
    initialized: false,

    apiKey: initialApiKey,
    speakerCount: 0,
    summary: '',
    summaryRunning: false,
    correctRunning: false,
    correctedText: '',
    aiError: null,

    async init() {
      await get().loadSessions();
      if (typeof window !== 'undefined') {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener('change', () => {
          if (get().settings.theme === 'system') applyTheme('system');
        });
      }
      set({ initialized: true });
    },

    async loadSessions() {
      const list = await storage.listSessions();
      set({ sessions: list });
    },

    createSession(title) {
      const s = newSession(get().settings.lang, title);
      accumulatedMs = 0;
      sessionStartEpoch = 0;
      lastSummaryAt = 0;
      segsSinceSummary = 0;
      set({
        currentSession: s,
        elapsedMs: 0,
        interimText: '',
        lastError: null,
        summary: '',
        correctedText: '',
        speakerCount: 0,
        aiError: null,
      });
      return s.id;
    },

    async openSession(id) {
      const s = await storage.getSession(id);
      if (!s) return;
      accumulatedMs = s.durationMs;
      sessionStartEpoch = 0;
      lastSummaryAt = 0;
      segsSinceSummary = 0;
      set({
        currentSession: s,
        elapsedMs: s.durationMs,
        interimText: '',
        lastError: null,
        recognitionState: 'idle',
        summary: s.summary || '',
        correctedText: s.correctedText || '',
        speakerCount: 0,
        aiError: null,
      });
    },

    closeSession() {
      if (get().recognitionState === 'listening') get().stopListening();
      summaryAbort?.abort();
      correctAbort?.abort();
      set({
        currentSession: null,
        interimText: '',
        elapsedMs: 0,
        summary: '',
        correctedText: '',
        speakerCount: 0,
      });
    },

    updateSessionMeta(patch) {
      const { currentSession } = get();
      if (!currentSession) return;
      const next = { ...currentSession, ...patch, updatedAt: new Date().toISOString() };
      set({ currentSession: next });
      void persistCurrent();
    },

    async startListening() {
      const { currentSession, settings } = get();
      let session = currentSession;
      if (!session) {
        get().createSession();
        session = get().currentSession;
      }
      session = session!;
      ensureController(settings);
      if (sessionStartEpoch === 0 && accumulatedMs === 0) {
        accumulatedMs = session.durationMs;
      }
      controller!.start();
      startTick();
      if (settings.enableSpeakerId && isSpeakerSupported()) {
        try {
          await ensureSpeaker().start();
        } catch {
          /* speaker mic denied; speech still works */
        }
      }
      if (settings.enableWakeLock) {
        void ensureWakeLock().request();
      }
    },

    stopListening() {
      controller?.stop();
      speaker?.stop();
      wakeLock?.release();
      stopTick();
      summaryAbort?.abort();
      const { currentSession } = get();
      if (currentSession) {
        const next = { ...currentSession, durationMs: accumulatedMs };
        set({ currentSession: next });
        void persistCurrent();
      }
    },

    toggleListening() {
      if (get().recognitionState === 'listening') get().stopListening();
      else void get().startListening();
    },

    dismissError() {
      set({ lastError: null });
    },

    toggleHighlight(segId) {
      const { currentSession } = get();
      if (!currentSession) return;
      const exists = currentSession.highlights.includes(segId);
      const highlights = exists
        ? currentSession.highlights.filter((id) => id !== segId)
        : [...currentSession.highlights, segId];
      const next = { ...currentSession, highlights };
      set({ currentSession: next });
      void persistCurrent();
    },

    addSection(label) {
      const { currentSession, elapsedMs } = get();
      if (!currentSession) return;
      const section = {
        id: uid(),
        at: elapsedMs,
        label: label || `分节 ${currentSession.sections.length + 1}`,
      };
      const next = {
        ...currentSession,
        sections: [...currentSession.sections, section],
      };
      set({ currentSession: next });
      void persistCurrent();
    },

    editSegment(segId, text) {
      const { currentSession } = get();
      if (!currentSession) return;
      const segments = currentSession.segments.map((seg) =>
        seg.id === segId ? { ...seg, text } : seg,
      );
      const next = { ...currentSession, segments };
      set({ currentSession: next });
      void persistCurrent();
    },

    deleteSegment(segId) {
      const { currentSession } = get();
      if (!currentSession) return;
      const next = {
        ...currentSession,
        segments: currentSession.segments.filter((seg) => seg.id !== segId),
        highlights: currentSession.highlights.filter((id) => id !== segId),
      };
      set({ currentSession: next });
      void persistCurrent();
    },

    clearSegments() {
      const { currentSession } = get();
      if (!currentSession) return;
      const next = { ...currentSession, segments: [], highlights: [], sections: [] };
      set({ currentSession: next });
      void persistCurrent();
    },

    updateSettings(patch) {
      const next = { ...get().settings, ...patch };
      persistSettings(next);
      set({ settings: next });
      if (patch.theme) applyTheme(next.theme);
      ensureController(next);
    },

    async deleteSession(id) {
      await storage.deleteSession(id);
      const list = await storage.listSessions();
      set({ sessions: list });
      const { currentSession } = get();
      if (currentSession && currentSession.id === id) {
        get().closeSession();
      }
    },

    async clearAllData() {
      if (get().recognitionState === 'listening') get().stopListening();
      await storage.clearAllSessions();
      set({
        sessions: [],
        currentSession: null,
        elapsedMs: 0,
        interimText: '',
        summary: '',
        correctedText: '',
      });
    },

    setApiKey(key) {
      persistApiKey(key);
      set({ apiKey: key });
    },

    setSpeakerLabel(id, label) {
      const { currentSession } = get();
      if (!currentSession) return;
      const speakerLabels = { ...(currentSession.speakerLabels || {}), [id]: label };
      const next = { ...currentSession, speakerLabels };
      set({ currentSession: next });
      void persistCurrent();
    },

    async runSummary() {
      await runSummaryInternal();
    },

    async correctAll() {
      const { currentSession, apiKey, settings } = get();
      if (!currentSession || !apiKey) {
        set({ aiError: !apiKey ? '未配置 Agnes API Key，请在设置页填入。' : '无内容可纠错' });
        return;
      }
      const text = currentSession.segments
        .filter((s) => s.isFinal)
        .map((s) => s.text)
        .join('');
      if (!text.trim()) {
        set({ aiError: '无内容可纠错' });
        return;
      }
      correctAbort?.abort();
      correctAbort = new AbortController();
      set({ correctRunning: true, aiError: null, correctedText: '' });
      try {
        const result = await streamAgnes(
          apiKey,
          buildCorrectMessages(text, settings.lang),
          (delta) => set((st) => ({ correctedText: st.correctedText + delta })),
          correctAbort.signal,
        );
        const sess = get().currentSession;
        if (sess) {
          const next = { ...sess, correctedText: result };
          set({ currentSession: next });
          void persistCurrent();
        }
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          set({ aiError: e instanceof Error ? e.message : '纠错失败' });
        }
      } finally {
        set({ correctRunning: false });
        correctAbort = null;
      }
    },

    applyCorrected() {
      const { currentSession, correctedText } = get();
      if (!currentSession || !correctedText) return;
      if (!confirm('应用纠错将用纠错后的文本替换当前所有段落，是否继续？')) return;
      const newSeg: SpeechSegment = {
        id: uid(),
        text: correctedText,
        timestamp: 0,
        isFinal: true,
      };
      const next = { ...currentSession, segments: [newSeg], highlights: [] };
      set({ currentSession: next, correctedText: '' });
      void persistCurrent();
    },

    clearSummary() {
      set({ summary: '' });
      const { currentSession } = get();
      if (currentSession) {
        const next = { ...currentSession, summary: '' };
        set({ currentSession: next });
        void persistCurrent();
      }
    },

    dismissAiError() {
      set({ aiError: null });
    },
  };
});
