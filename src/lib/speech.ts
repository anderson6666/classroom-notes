import type {
  RecognitionState,
  SpeechError,
  SpeechSegment,
} from './types';

// ===== Engine Detection =====

export type SpeechEngine = 'vosk';

export function detectEngine(): SpeechEngine {
  return 'vosk';
}

export function isSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return typeof WebAssembly !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
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

// ===== Vosk Types =====

interface VoskModel {
  KaldiRecognizer: new (sampleRate: number, grammar?: string) => VoskRecognizer;
  terminate: () => void;
  ready: boolean;
  on: (event: string, listener: (message: unknown) => void) => void;
  setLogLevel: (level: number) => void;
}

interface VoskRecognizer {
  on: (event: string, listener: (message: unknown) => void) => void;
  setWords: (words: boolean) => void;
  acceptWaveform: (buffer: AudioBuffer) => void;
  remove: () => void;
}

interface VoskModule {
  createModel: (modelUrl: string, logLevel?: number) => Promise<VoskModel>;
}

const RELEASE_BASE = 'https://github.com/anderson6666/classroom-notes/releases/download/models-large';

const MODEL_URLS: Record<string, string> = {
  'zh-CN': `${RELEASE_BASE}/vosk-model-cn-0.22.tar.gz`,
  'en-US': `${RELEASE_BASE}/vosk-model-en-us-0.22.tar.gz`,
};

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
    onProgress() { /* no-op: Web Speech API has no model download */ },
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

// ===== Vosk Controller =====

let cachedModel: VoskModel | null = null;
let cachedModelLang = '';
let voskModule: VoskModule | null = null;

function createVoskController(initial: SpeechConfig): SpeechController {
  let config: SpeechConfig = { ...initial };
  let userIntent: RecognitionState = 'idle';
  let startTimestamp = 0;

  let recognizer: VoskRecognizer | null = null;
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let processorNode: ScriptProcessorNode | null = null;
  let muteGain: GainNode | null = null;
  let loadingAborted = false;
  let fetchAbort: AbortController | null = null;

  const segmentCb = new Set<(seg: SpeechSegment) => void>();
  const stateCb = new Set<(s: RecognitionState) => void>();
  const errorCb = new Set<(e: SpeechError) => void>();
  const progressCb = new Set<(p: number) => void>();

  const emitState = (s: RecognitionState) => stateCb.forEach((cb) => cb(s));
  const emitError = (e: SpeechError) => errorCb.forEach((cb) => cb(e));
  const emitSegment = (seg: SpeechSegment) => segmentCb.forEach((cb) => cb(seg));
  const emitProgress = (p: number) => progressCb.forEach((cb) => cb(p));

  async function ensureModel(lang: string): Promise<VoskModel> {
    if (cachedModel && cachedModelLang === lang) return cachedModel;
    if (cachedModel) {
      cachedModel.terminate();
      cachedModel = null;
    }
    if (!voskModule) {
      voskModule = await import('vosk-browser');
    }
    const url = MODEL_URLS[lang] || MODEL_URLS['zh-CN'];

    let blobUrl: string;
    try {
      const cache = await caches.open('vosk-models');
      const cached = await cache.match(url);
      if (cached) {
        const blob = await cached.blob();
        blobUrl = URL.createObjectURL(blob);
      } else {
        fetchAbort = new AbortController();
        const response = await fetch(url, { signal: fetchAbort.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const contentLength = response.headers.get('Content-Length');
        const total = contentLength ? parseInt(contentLength) : 0;
        const reader = response.body!.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (loadingAborted) {
            fetchAbort.abort();
            throw new DOMException('Aborted', 'AbortError');
          }
          chunks.push(value);
          received += value.length;
          if (total > 0) {
            emitProgress(Math.min(99, Math.round((received / total) * 100)));
          }
        }
        const blob = new Blob(chunks as BlobPart[]);
        await cache.put(url, new Response(blob));
        blobUrl = URL.createObjectURL(blob);
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      blobUrl = url;
    }
    fetchAbort = null;

    emitProgress(100);
    const model = await voskModule.createModel(blobUrl, -1);
    cachedModel = model;
    cachedModelLang = lang;
    return model;
  }

  async function startInternal(): Promise<void> {
    if (loadingAborted) return;
    try {
      const model = await ensureModel(config.lang);
      if (loadingAborted) return;

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (loadingAborted) return;

      audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      recognizer = new model.KaldiRecognizer(audioContext.sampleRate);
      recognizer.setWords(false);

      recognizer.on('result', (message: unknown) => {
        const msg = message as { result: { text: string } };
        const text = msg.result.text;
        if (!text) return;
        emitSegment({
          id: nextId(),
          text,
          timestamp: Date.now() - startTimestamp,
          isFinal: true,
          confidence: 1,
        });
      });

      recognizer.on('partialresult', (message: unknown) => {
        if (!config.interimResults) return;
        const msg = message as { result: { partial: string } };
        const partial = msg.result.partial;
        if (!partial) return;
        emitSegment({
          id: nextId(),
          text: partial,
          timestamp: Date.now() - startTimestamp,
          isFinal: false,
          confidence: 0,
        });
      });

      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      processorNode = audioContext.createScriptProcessor(4096, 1, 1);
      muteGain = audioContext.createGain();
      muteGain.gain.value = 0;

      processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!recognizer || userIntent !== 'listening') return;
        try {
          recognizer.acceptWaveform(event.inputBuffer);
        } catch {
          /* ignore waveform errors */
        }
      };

      sourceNode.connect(processorNode);
      processorNode.connect(muteGain);
      muteGain.connect(audioContext.destination);

      startTimestamp = Date.now();
      userIntent = 'listening';
      emitState('listening');
    } catch (e) {
      if (loadingAborted) return;
      userIntent = 'error';
      const isMicError =
        e instanceof DOMException &&
        (e.name === 'NotAllowedError' || e.name === 'NotFoundError');
      emitError({
        kind: isMicError ? 'not-allowed' : 'unknown',
        message: isMicError
          ? '麦克风权限被拒绝，请在浏览器设置中允许。'
          : e instanceof Error
            ? `语音识别启动失败：${e.message}`
            : '语音识别启动失败。',
      });
      emitState('error');
      cleanupAudio();
    }
  }

  function cleanupAudio(): void {
    if (processorNode) {
      try { processorNode.disconnect(); } catch { /* */ }
      processorNode.onaudioprocess = null;
      processorNode = null;
    }
    if (muteGain) {
      try { muteGain.disconnect(); } catch { /* */ }
      muteGain = null;
    }
    if (sourceNode) {
      try { sourceNode.disconnect(); } catch { /* */ }
      sourceNode = null;
    }
    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }
    if (audioContext) {
      try { void audioContext.close(); } catch { /* */ }
      audioContext = null;
    }
    if (recognizer) {
      try { recognizer.remove(); } catch { /* */ }
      recognizer = null;
    }
  }

  return {
    start() {
      if (userIntent === 'listening' || userIntent === 'loading') return;
      userIntent = 'loading';
      loadingAborted = false;
      emitState('loading');
      void startInternal();
    },
    stop() {
      loadingAborted = true;
      if (fetchAbort) { try { fetchAbort.abort(); } catch { /* */ } }
      userIntent = 'idle';
      cleanupAudio();
      emitState('idle');
    },
    abort() {
      loadingAborted = true;
      if (fetchAbort) { try { fetchAbort.abort(); } catch { /* */ } }
      userIntent = 'idle';
      cleanupAudio();
      emitState('idle');
    },
    updateConfig(next) {
      const langChanged = next.lang !== undefined && next.lang !== config.lang;
      config = { ...config, ...next };
      if (langChanged && cachedModel) {
        cachedModel.terminate();
        cachedModel = null;
        cachedModelLang = '';
      }
    },
    onSegment(cb) { segmentCb.add(cb); },
    onStateChange(cb) { stateCb.add(cb); },
    onError(cb) { errorCb.add(cb); },
    onProgress(cb) { progressCb.add(cb); },
    destroy() {
      loadingAborted = true;
      if (fetchAbort) { try { fetchAbort.abort(); } catch { /* */ } }
      userIntent = 'idle';
      cleanupAudio();
      segmentCb.clear();
      stateCb.clear();
      errorCb.clear();
      progressCb.clear();
      if (cachedModel) {
        cachedModel.terminate();
        cachedModel = null;
        cachedModelLang = '';
      }
    },
  };
}

// ===== Factory =====

export function createSpeechController(initial: SpeechConfig): SpeechController {
  return createVoskController(initial);
}
