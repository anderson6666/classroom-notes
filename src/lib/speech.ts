import type {
  RecognitionState,
  SpeechError,
  SpeechErrorKind,
  SpeechSegment,
} from './types';

// Minimal Web Speech API type declarations (not in lib.dom by default)
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
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
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

export function isSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function mapError(code: string): SpeechError {
  const map: Record<string, SpeechErrorKind> = {
    'no-speech': 'no-speech',
    'audio-capture': 'audio-capture',
    'not-allowed': 'not-allowed',
    'service-not-allowed': 'service-not-allowed',
    'network': 'network',
    'aborted': 'aborted',
  };
  const kind = map[code] || 'unknown';
  const messages: Record<SpeechErrorKind, string> = {
    'no-speech': '未检测到语音，请稍后再试。',
    'audio-capture': '麦克风不可用，请检查设备。',
    'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许。',
    'service-not-allowed': '识别服务不可用，请更换浏览器（推荐 Chrome）。',
    'network': '网络异常，识别服务无法连接。',
    'aborted': '识别已中止。',
    'unknown': '发生未知错误。',
  };
  return { kind, message: messages[kind] };
}

export interface SpeechController {
  start: () => void;
  stop: () => void;
  abort: () => void;
  updateConfig: (config: Partial<SpeechConfig>) => void;
  onSegment: (cb: (seg: SpeechSegment) => void) => void;
  onStateChange: (cb: (state: RecognitionState) => void) => void;
  onError: (cb: (err: SpeechError) => void) => void;
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

export function createSpeechController(initial: SpeechConfig): SpeechController {
  const Ctor = getCtor();
  let recognition: SpeechRecognition | null = null;
  let config: SpeechConfig = { ...initial };
  let userIntent: RecognitionState = 'idle';
  let startTimestamp = 0;
  let lastFinalTimestamp = 0;

  const segmentCb = new Set<(seg: SpeechSegment) => void>();
  const stateCb = new Set<(s: RecognitionState) => void>();
  const errorCb = new Set<(e: SpeechError) => void>();

  const emitState = (s: RecognitionState) => stateCb.forEach((cb) => cb(s));
  const emitError = (e: SpeechError) => errorCb.forEach((cb) => cb(e));
  const emitSegment = (seg: SpeechSegment) => segmentCb.forEach((cb) => cb(seg));

  const build = (): SpeechRecognition | null => {
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = config.lang;
    rec.continuous = config.continuous;
    rec.interimResults = config.interimResults;
    rec.maxAlternatives = config.maxAlternatives;

    rec.onstart = () => {
      if (startTimestamp === 0) startTimestamp = Date.now();
      emitState('listening');
    };

    rec.onresult = (event: SpeechRecognitionEvent) => {
      const resultIndex = event.resultIndex;
      const results = event.results;
      for (let i = resultIndex; i < results.length; i++) {
        const result = results[i];
        const alt = result.item(0) || result[0];
        if (!alt) continue;
        const text = alt.transcript;
        const confidence = alt.confidence;
        let ts = Date.now() - startTimestamp;
        if (result.isFinal) {
          lastFinalTimestamp = ts;
        } else if (lastFinalTimestamp > 0) {
          ts = lastFinalTimestamp + (ts - lastFinalTimestamp);
        }
        emitSegment({
          id: nextId(),
          text,
          timestamp: ts,
          isFinal: result.isFinal,
          confidence,
        });
      }
    };

    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'aborted' || e.error === 'no-speech') {
        // no-speech in continuous mode is normal; we restart in onend
        if (e.error === 'no-speech') return;
      }
      emitError(mapError(e.error));
    };

    rec.onend = () => {
      // Chrome auto-stops after silence. If user still wants to listen, restart.
      if (userIntent === 'listening') {
        try {
          rec.start();
        } catch {
          // restart may throw if called too quickly; defer
          setTimeout(() => {
            if (userIntent === 'listening') {
              try {
                rec.start();
              } catch {
                /* ignore */
              }
            }
          }, 250);
        }
      } else {
        emitState('idle');
      }
    };

    return rec;
  };

  return {
    start() {
      if (!Ctor) {
        emitError({
          kind: 'service-not-allowed',
          message: '当前浏览器不支持语音识别，请使用 Chrome 或 Edge。',
        });
        return;
      }
      if (userIntent === 'listening') return;
      userIntent = 'listening';
      if (startTimestamp === 0) startTimestamp = Date.now();
      if (!recognition) recognition = build();
      if (!recognition) return;
      try {
        recognition.start();
      } catch {
        // already started; ignore
      }
    },
    stop() {
      userIntent = 'idle';
      if (recognition) {
        try {
          recognition.stop();
        } catch {
          /* ignore */
        }
      }
      emitState('idle');
    },
    abort() {
      userIntent = 'idle';
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
      }
      emitState('idle');
    },
    updateConfig(next) {
      config = { ...config, ...next };
      // Apply lang on next rebuild; live recognition needs restart to pick up
      if (recognition) {
        recognition.lang = config.lang;
        recognition.continuous = config.continuous;
        recognition.interimResults = config.interimResults;
        recognition.maxAlternatives = config.maxAlternatives;
      }
    },
    onSegment(cb) {
      segmentCb.add(cb);
    },
    onStateChange(cb) {
      stateCb.add(cb);
    },
    onError(cb) {
      errorCb.add(cb);
    },
    destroy() {
      userIntent = 'idle';
      segmentCb.clear();
      stateCb.clear();
      errorCb.clear();
      if (recognition) {
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.onstart = null;
        recognition = null;
      }
    },
  };
}
