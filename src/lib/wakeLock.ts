export class WakeLockController {
  private sentinel: WakeLockSentinel | null = null;
  private active = false;
  private onVisibility: () => void;

  constructor() {
    this.onVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        this.active &&
        !this.sentinel
      ) {
        void this.request();
      }
    };
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  }

  async request(): Promise<void> {
    if (!this.isSupported()) return;
    this.active = true;
    try {
      this.sentinel = await navigator.wakeLock.request('screen');
      this.sentinel.addEventListener('release', () => {
        this.sentinel = null;
      });
    } catch {
      // user denied or not allowed; silent
    }
  }

  release(): void {
    this.active = false;
    if (this.sentinel) {
      this.sentinel.release().catch(() => {});
      this.sentinel = null;
    }
  }

  destroy(): void {
    this.release();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
