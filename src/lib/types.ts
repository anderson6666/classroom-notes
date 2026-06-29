export interface SpeechSegment {
  id: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  confidence?: number;
  speakerId?: number;
}

export interface SessionSection {
  id: string;
  at: number;
  label?: string;
}

export interface Session {
  id: string;
  title: string;
  lecturer?: string;
  date: string;
  updatedAt: string;
  lang: string;
  segments: SpeechSegment[];
  highlights: string[];
  sections: SessionSection[];
  durationMs: number;
  summary?: string;
  correctedText?: string;
  speakerLabels?: Record<number, string>;
}

export interface SessionIndex {
  id: string;
  title: string;
  lecturer?: string;
  date: string;
  updatedAt: string;
  lang: string;
  durationMs: number;
  wordCount: number;
  segmentCount: number;
  preview: string;
}

export type RecognitionState = 'idle' | 'loading' | 'listening' | 'error';

export type SpeechErrorKind =
  | 'no-speech'
  | 'audio-capture'
  | 'not-allowed'
  | 'service-not-allowed'
  | 'network'
  | 'aborted'
  | 'unknown';

export interface SpeechError {
  kind: SpeechErrorKind;
  message: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  theme: ThemeMode;
  fontScale: number;
  autoPunctuateHint: boolean;
  enableAI: boolean;
  enableSpeakerId: boolean;
  enableWakeLock: boolean;
}

export interface LanguageOption {
  value: string;
  label: string;
}

export const LANGUAGES: LanguageOption[] = [
  { value: 'zh-CN', label: '普通话' },
  { value: 'zh-HK', label: '粤语（香港）' },
  { value: 'en-US', label: 'English' },
];
