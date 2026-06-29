import type {
  RecognitionState,
  SpeechError,
  SpeechSegment,
} from './types';

const MODEL_URLS: Record<string, string> = {
  'zh-CN': 'https://raw.githubusercontent.com/ccoreilly/vosk-browser/gh-pages/models/vosk-model-small-cn-0.3.tar.gz',
  'en-US': 'https://raw.githubusercontent.com/ccoreilly/vosk-browser/gh-pages/models/vosk-model-small-en-us-0.15.tar.gz',
};

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

let cachedModel: VoskModel | null = null;
let cachedModelLang = '';
let voskModule: VoskModule | null = null;

export function isSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof WebAssembly !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
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
  let config: SpeechConfig = { ...initial };
  let userIntent: RecognitionState = 'idle';
  let startTimestamp = 0;

  let recognizer: VoskRecognizer | null = null;
  let audioContext: AudioContext | null = null;
  let mediaStream: MediaStream | null = null;
  let sourceNode: MediaStreamAudioSourceNode | null = null;
  let processorNode: ScriptProcessorNode | null = null;
  let loadingAborted = false;

  const segmentCb = new Set<(seg: SpeechSegment) => void>();
  const stateCb = new Set<(s: RecognitionState) => void>();
  const errorCb = new Set<(e: SpeechError) => void>();

  const emitState = (s: RecognitionState) => stateCb.forEach((cb) => cb(s));
  const emitError = (e: SpeechError) => errorCb.forEach((cb) => cb(e));
  const emitSegment = (seg: SpeechSegment) => segmentCb.forEach((cb) => cb(seg));

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
    const model = await voskModule.createModel(url, -1);
    cachedModel = model;
    cachedModelLang = lang;
    return model;
  }

  async function startInternal(): Promise<void> {
    if (loadingAborted) return;
    try {
      const model = await ensureModel(config.lang);
      if (loadingAborted) return;

      const sampleRate = 16000;
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      if (loadingAborted) return;

      audioContext = new AudioContext({ sampleRate });
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      recognizer = new model.KaldiRecognizer(audioContext.sampleRate);
      recognizer.setWords(false);

      recognizer.on('result', (message: unknown) => {
        const msg = message as { result: { text: string } };
        const text = msg.result.text;
        if (!text) return;
        const ts = Date.now() - startTimestamp;
        emitSegment({
          id: nextId(),
          text,
          timestamp: ts,
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

      processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
        if (!recognizer || userIntent !== 'listening') return;
        try {
          recognizer.acceptWaveform(event.inputBuffer);
        } catch {
          /* ignore waveform errors */
        }
      };

      sourceNode.connect(processorNode);
      processorNode.connect(audioContext.destination);

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
      userIntent = 'idle';
      cleanupAudio();
      emitState('idle');
    },
    abort() {
      loadingAborted = true;
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
      loadingAborted = true;
      userIntent = 'idle';
      cleanupAudio();
      segmentCb.clear();
      stateCb.clear();
      errorCb.clear();
      if (cachedModel) {
        cachedModel.terminate();
        cachedModel = null;
        cachedModelLang = '';
      }
    },
  };
}
