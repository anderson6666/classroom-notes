import { Loader2, Download, X } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function ModelLoadingOverlay() {
  const state = useStore((s) => s.recognitionState);
  const progress = useStore((s) => s.modelProgress);
  const stop = useStore((s) => s.stopListening);

  if (state !== 'loading') return null;

  const pct = Math.max(0, Math.min(100, progress));
  const indeterminate = pct === 0 && progress === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl border border-line/70 bg-paper-card p-6 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/15 text-gold">
            {indeterminate ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Download size={20} />
            )}
          </span>
          <div className="flex-1">
            <h3 className="font-display text-sm font-semibold text-ink">
              {indeterminate ? '正在准备…' : '下载识别模型'}
            </h3>
            <p className="text-xs text-ink-faint">
              {indeterminate ? '初始化中，请稍候' : '首次加载需要下载，之后自动缓存'}
            </p>
          </div>
          <button
            onClick={stop}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition hover:bg-paper-soft hover:text-ink"
            aria-label="取消"
          >
            <X size={16} />
          </button>
        </div>

        {indeterminate ? (
          <div className="h-2 w-full overflow-hidden rounded-full bg-paper-soft">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-gradient-to-r from-gold-soft to-gold" />
          </div>
        ) : (
          <>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-paper-soft">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold transition-all duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-ink-faint">
              <span>{pct < 100 ? '下载中…' : '加载模型中…'}</span>
              <span className="tabular-nums text-gold">{pct}%</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
