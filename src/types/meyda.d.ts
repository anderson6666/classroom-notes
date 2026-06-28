declare module 'meyda' {
  export interface MeydaFeatures {
    rms?: number;
    mfcc?: number[];
    spectralCentroid?: number;
    zcr?: number;
    [key: string]: number | number[] | undefined;
  }

  export interface MeydaAnalyzerOptions {
    audioContext: AudioContext;
    source: AudioNode;
    bufferSize: number;
    featureExtractors: string[] | string;
    numberOfMFCCCoefficients?: number;
    sampleRate?: number;
    windowingFunction?: string;
    callback: (features: MeydaFeatures) => void;
  }

  export interface MeydaAnalyzer {
    start(): void;
    stop(): void;
    setSource(source: AudioNode): void;
  }

  const Meyda: {
    createMeydaAnalyzer(options: MeydaAnalyzerOptions): MeydaAnalyzer;
    extract(
      feature: string,
      signal: Float32Array,
      previousSignal?: Float32Array,
    ): MeydaFeatures;
    audioContext: AudioContext;
    numberOfMELBands: number;
  };

  export default Meyda;
}
