import Meyda from 'meyda';

export interface SpeakerSegment {
  speakerId: number;
  startTime: number;
  endTime: number;
}

export interface SpeakerRecognizer {
  start: () => Promise<void>;
  stop: () => void;
  onSegment: (cb: (seg: SpeakerSegment) => void) => void;
  onClusterChange: (cb: (count: number) => void) => void;
  getSpeakerAt: (ts: number) => number;
  getClusterCount: () => number;
  destroy: () => void;
}

const RMS_THRESHOLD = 0.018;
const SIM_THRESHOLD = 0.72;
const SILENCE_GAP_MS = 800;

interface Cluster {
  id: number;
  centroid: number[];
  count: number;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function isSpeakerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof AudioContext !== 'undefined'
  );
}

export function createSpeakerRecognizer(): SpeakerRecognizer {
  let stream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let analyzer: ReturnType<typeof Meyda.createMeydaAnalyzer> | null = null;

  let clusters: Cluster[] = [];
  let timeline: SpeakerSegment[] = [];
  let currentSeg: { speakerId: number; startTime: number } | null = null;
  let lastVoiceTime = 0;
  let startTime = 0;

  const segCbs = new Set<(seg: SpeakerSegment) => void>();
  const clusterCbs = new Set<(count: number) => void>();

  const emitSeg = (seg: SpeakerSegment) => segCbs.forEach((cb) => cb(seg));
  const emitClusters = () => clusterCbs.forEach((cb) => cb(clusters.length));

  const classify = (x: number[]): number => {
    if (clusters.length === 0) {
      clusters.push({ id: 0, centroid: [...x], count: 1 });
      emitClusters();
      return 0;
    }
    let best = 0;
    let bestSim = -1;
    for (let i = 0; i < clusters.length; i++) {
      const sim = cosine(x, clusters[i].centroid);
      if (sim > bestSim) {
        bestSim = sim;
        best = i;
      }
    }
    if (bestSim > SIM_THRESHOLD) {
      const c = clusters[best];
      const n = c.count + 1;
      for (let i = 0; i < c.centroid.length; i++) {
        c.centroid[i] = c.centroid[i] + (x[i] - c.centroid[i]) / n;
      }
      c.count = n;
      return c.id;
    }
    const id = clusters.length;
    clusters.push({ id, centroid: [...x], count: 1 });
    emitClusters();
    return id;
  };

  const onFrame = (features: { rms?: number; mfcc?: number[] }) => {
    if (!startTime) return;
    const now = Date.now() - startTime;
    const rms = features.rms ?? 0;
    const mfcc = features.mfcc;
    const hasVoice = rms > RMS_THRESHOLD && mfcc && mfcc.length > 0;

    if (hasVoice && mfcc) {
      const sid = classify(mfcc);
      if (!currentSeg) {
        currentSeg = { speakerId: sid, startTime: now };
      } else if (currentSeg.speakerId !== sid) {
        const seg: SpeakerSegment = {
          speakerId: currentSeg.speakerId,
          startTime: currentSeg.startTime,
          endTime: now,
        };
        timeline.push(seg);
        emitSeg(seg);
        currentSeg = { speakerId: sid, startTime: now };
      }
      lastVoiceTime = now;
    } else if (currentSeg && now - lastVoiceTime > SILENCE_GAP_MS) {
      const seg: SpeakerSegment = {
        speakerId: currentSeg.speakerId,
        startTime: currentSeg.startTime,
        endTime: lastVoiceTime,
      };
      timeline.push(seg);
      emitSeg(seg);
      currentSeg = null;
    }
  };

  return {
    async start() {
      if (!isSpeakerSupported()) return;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      audioContext = new AudioContext();
      source = audioContext.createMediaStreamSource(stream);
      analyzer = Meyda.createMeydaAnalyzer({
        audioContext,
        source,
        bufferSize: 512,
        featureExtractors: ['rms', 'mfcc'],
        numberOfMFCCCoefficients: 13,
        callback: onFrame,
      });
      analyzer.start();
      startTime = Date.now();
    },
    stop() {
      analyzer?.stop();
      analyzer = null;
      if (currentSeg) {
        const seg: SpeakerSegment = {
          speakerId: currentSeg.speakerId,
          startTime: currentSeg.startTime,
          endTime: lastVoiceTime || Date.now() - startTime,
        };
        timeline.push(seg);
        emitSeg(seg);
        currentSeg = null;
      }
      source?.disconnect();
      source = null;
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      void audioContext?.close();
      audioContext = null;
    },
    onSegment(cb) {
      segCbs.add(cb);
    },
    onClusterChange(cb) {
      clusterCbs.add(cb);
    },
    getSpeakerAt(ts) {
      for (let i = timeline.length - 1; i >= 0; i--) {
        const seg = timeline[i];
        if (ts >= seg.startTime && ts <= seg.endTime) return seg.speakerId;
      }
      if (currentSeg && ts >= currentSeg.startTime) return currentSeg.speakerId;
      return 0;
    },
    getClusterCount() {
      return clusters.length;
    },
    destroy() {
      this.stop();
      segCbs.clear();
      clusterCbs.clear();
      clusters = [];
      timeline = [];
    },
  };
}

export interface SpeakerColor {
  bg: string;
  text: string;
  dot: string;
}

export function speakerColor(id: number): SpeakerColor {
  const hue = (id * 137.508) % 360;
  return {
    bg: `hsl(${hue} 55% 50% / 0.15)`,
    text: `hsl(${hue} 60% 58%)`,
    dot: `hsl(${hue} 60% 58%)`,
  };
}

export function defaultSpeakerLabel(id: number): string {
  return `说话人 ${id + 1}`;
}
