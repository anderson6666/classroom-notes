import { Scissors, Eraser, Infinity as InfinityIcon } from 'lucide-react';
import RecordButton from '@/components/RecordButton';
import { useStore } from '@/lib/store';
import { LANGUAGES } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function ControlBar() {
  const state = useStore((s) => s.recognitionState);
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const addSection = useStore((s) => s.addSection);
  const clearSegments = useStore((s) => s.clearSegments);
  const hasSession = useStore((s) => Boolean(s.currentSession));

  const isListening = state === 'listening';
  const isLoading = state === 'loading';
  const progress = useStore((s) => s.modelProgress);

  return (
    <div className="sticky top-0 z-10 border-b border-line/60 bg-paper/80 px-5 py-3 backdrop-blur-md md:px-8">
      <div className="flex items-center justify-between gap-3">
        {/* Left: language + continuous */}
        <div className="flex items-center gap-2">
          <select
            value={settings.lang}
            onChange={(e) => updateSettings({ lang: e.target.value })}
            className="rounded-lg border border-line/60 bg-paper-card px-2.5 py-1.5 text-xs text-ink-soft outline-none transition hover:border-gold/50 focus:border-gold/60"
            aria-label="识别语言"
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => updateSettings({ continuous: !settings.continuous })}
            className={cn(
              'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition',
              settings.continuous
                ? 'border-gold/50 bg-gold/10 text-gold'
                : 'border-line/60 bg-paper-card text-ink-faint hover:text-ink',
            )}
            title="连续识别模式"
          >
            <InfinityIcon size={13} />
            <span className="hidden sm:inline">连续</span>
          </button>
        </div>

        {/* Center: record */}
        <div className="flex flex-col items-center">
          <RecordButton size="lg" />
        </div>

        {/* Right: section + clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => addSection()}
            disabled={!hasSession}
            className="flex items-center gap-1.5 rounded-lg border border-line/60 bg-paper-card px-2.5 py-1.5 text-xs text-ink-soft transition hover:border-gold/50 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            title="在当前位置插入分节符"
          >
            <Scissors size={13} />
            <span className="hidden sm:inline">分节</span>
          </button>
          <button
            onClick={() => {
              if (confirm('确定清空当前会话的所有段落吗？此操作不可撤销。')) {
                clearSegments();
              }
            }}
            disabled={!hasSession || isListening || isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-line/60 bg-paper-card px-2.5 py-1.5 text-xs text-ink-soft transition hover:border-rust/50 hover:text-rust disabled:cursor-not-allowed disabled:opacity-40"
            title="清空所有段落"
          >
            <Eraser size={13} />
            <span className="hidden sm:inline">清空</span>
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
        {isListening
          ? '正在聆听 · 实时转写'
          : isLoading
            ? progress > 0
              ? `下载模型 ${progress}%`
              : '加载识别模型中…'
            : '按下金色按钮开始'}
      </p>
    </div>
  );
}
