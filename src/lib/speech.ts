import type {
  RecognitionState,
  SpeechError,
  SpeechSegment,
} from './types';

// ===== Platform Detection =====

/**
 * Detect if the current device is mobile (phone/tablet).
 * Mobile devices do not support Web Speech API reliably, so we block them.
 */
export function isMobile(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile|tablet/i.test(ua);
}

/**
 * Check if Web Speech API is supported (desktop only).
 */
export function isSupported(): boolean {
  if (typeof window === 'undefined') return false;
  if (isMobile()) return false; // Block mobile devices
  const hasSpeechApi =
    !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
  return hasSpeechApi && !!navigator.mediaDevices?.getUserMedia;
}

// ===== Web Speech API Types =====

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

function createRecognition(): SpeechRecognitionLike {
  const Ctor =
    (window as unknown as { SpeechRecognition?: { new (): SpeechRecognitionLike } }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: { new (): SpeechRecognitionLike } }).webkitSpeechRecognition;
  return new Ctor!();
}

// ===== Controller Interface =====

export interface SpeechController {
  start: () => void;
  stop: () => void;
  abort: () => void;
  updateConfig: (config: Partial<SpeechConfig>) => void;
  onSegment: (cb: (seg: SpeechSegment) => void) => void;
  onStateChange: (cb: (state: RecognitionState) => void) => void;
  onError: (cb: (err: SpeechError) => void) => void;
  onProgress: (cb: (progress: number) => void) => void;
  destroy: () => void;
}

export interface SpeechConfig {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `seg_${Date.now().toString(36)}_${idCounter}`;
}

// ===== Web Speech API Controller =====

function createWebSpeechController(initial: SpeechConfig): SpeechController {
  let config: SpeechConfig = { ...initial };
  let userIntent: RecognitionState = 'idle';
  let recognition: SpeechRecognitionLike | null = null;
  let startTimestamp = 0;
  let restartTimer: ReturnType<typeof setTimeout> | null = null;

  const segmentCb = new Set<(seg: SpeechSegment) => void>();
  const stateCb = new Set<(s: RecognitionState) => void>();
  const errorCb = new Set<(e: SpeechError) => void>();

  const emitState = (s: RecognitionState) => stateCb.forEach((cb) => cb(s));
  const emitError = (e: SpeechError) => errorCb.forEach((cb) => cb(e));
  const emitSegment = (seg: SpeechSegment) => segmentCb.forEach((cb) => cb(seg));

  function setupRecognition(): SpeechRecognitionLike {
    const rec = createRecognition();
    rec.lang = config.lang;
    rec.continuous = config.continuous;
    rec.interimResults = config.interimResults;
    rec.maxAlternatives = config.maxAlternatives;

    rec.onstart = () => {
      startTimestamp = Date.now();
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alt = result.item(0) || result[0];
        if (!alt) continue;
        const text = alt.transcript;
        if (!text) continue;
        emitSegment({
          id: nextId(),
          text,
          timestamp: Date.now() - startTimestamp,
          isFinal: result.isFinal,
          confidence: alt.confidence,
        });
      }
    };

    rec.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        userIntent = 'error';
        emitError({
          kind: 'not-allowed',
          message: '麦克风权限被拒绝，请在浏览器设置中允许。',
        });
        emitState('error');
      } else if (event.error === 'network') {
        emitError({
          kind: 'unknown',
          message: '网络错误，语音识别服务不可用。',
        });
      }
    };

    rec.onend = () => {
      if (userIntent === 'listening') {
        restartTimer = setTimeout(() => {
          if (userIntent === 'listening' && recognition) {
            try { recognition.start(); } catch { /* already started */ }
          }
        }, 100);
      } else {
        emitState('idle');
      }
    };

    return rec;
  }

  return {
    start() {
      if (userIntent === 'listening' || userIntent === 'loading') return;
      userIntent = 'listening';
      try {
        recognition = setupRecognition();
        recognition.start();
        startTimestamp = Date.now();
        emitState('listening');
      } catch (e) {
        userIntent = 'error';
        emitError({
          kind: 'unknown',
          message: e instanceof Error ? `语音识别启动失败：${e.message}` : '语音识别启动失败。',
        });
        emitState('error');
      }
    },
    stop() {
      userIntent = 'idle';
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
      if (recognition) {
        try { recognition.stop(); } catch { /* */ }
      }
      emitState('idle');
    },
    abort() {
      userIntent = 'idle';
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
      if (recognition) {
        try { recognition.abort(); } catch { /* */ }
      }
      emitState('idle');
    },
    updateConfig(next) {
      const langChanged = next.lang !== undefined && next.lang !== config.lang;
      config = { ...config, ...next };
      if (langChanged && userIntent === 'listening') {
        if (recognition) { try { recognition.abort(); } catch { /* */ } }
        recognition = setupRecognition();
        try { recognition.start(); } catch { /* */ }
      }
    },
    onSegment(cb) { segmentCb.add(cb); },
    onStateChange(cb) { stateCb.add(cb); },
    onError(cb) { errorCb.add(cb); },
    onProgress() { /* Web Speech API has no model download */ },
    destroy() {
      userIntent = 'idle';
      if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
      if (recognition) { try { recognition.abort(); } catch { /* */ } }
      recognition = null;
      segmentCb.clear();
      stateCb.clear();
      errorCb.clear();
    },
  };
}

// ===== Factory =====

export function createSpeechController(initial: SpeechConfig): SpeechController {
  return createWebSpeechController(initial);
}