import { useState } from 'react';
import {
  Sparkles,
  RefreshCw,
  Wand2,
  Check,
  X,
  Loader2,
  AlertCircle,
  Eraser,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function SummaryPanel({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const summary = useStore((s) => s.summary);
  const summaryRunning = useStore((s) => s.summaryRunning);
  const correctRunning = useStore((s) => s.correctRunning);
  const correctedText = useStore((s) => s.correctedText);
  const aiError = useStore((s) => s.aiError);
  const apiKey = useStore((s) => s.apiKey);
  const runSummary = useStore((s) => s.runSummary);
  const correctAll = useStore((s) => s.correctAll);
  const applyCorrected = useStore((s) => s.applyCorrected);
  const dismissAiError = useStore((s) => s.dismissAiError);
  const [tab, setTab] = useState<'summary' | 'correct'>('summary');

  const hasKey = Boolean(apiKey);

  const panel = (
    <div className="flex h-full flex-col bg-paper-soft/40">
      <header className="flex items-center justify-between border-b border-line/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-gold" />
          <h2 className="font-display text-sm font-semibold text-ink">AI 助手</h2>
          {(summaryRunning || correctRunning) && (
            <Loader2 size={13} className="animate-spin text-gold" />
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-ink-faint hover:text-ink md:hidden"
          aria-label="关闭"
        >
          <X size={16} />
        </button>
      </header>

      {!hasKey && (
        <div className="border-b border-gold/30 bg-gold/5 px-4 py-2.5 text-xs text-ink-soft">
          未配置 Agnes API Key，请在
          <span className="text-gold"> 设置 → AI </span>
          中填入后使用总结与纠错。
        </div>
      )}

      {aiError && (
        <div className="flex items-start gap-2 border-b border-rust/30 bg-rust/5 px-4 py-2.5 text-xs text-rust">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="flex-1">{aiError}</span>
          <button onClick={dismissAiError} className="shrink-0">
            <X size={13} />
          </button>
        </div>
      )}

      <div className="flex gap-1 border-b border-line/60 px-3 pt-2">
        <TabBtn active={tab === 'summary'} onClick={() => setTab('summary')}>
          要点总结
        </TabBtn>
        <TabBtn active={tab === 'correct'} onClick={() => setTab('correct')}>
          全文纠错
        </TabBtn>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {tab === 'summary' ? (
          <SummaryContent summary={summary} running={summaryRunning} />
        ) : (
          <CorrectContent
            text={correctedText}
            running={correctRunning}
            onApply={applyCorrected}
          />
        )}
      </div>

      <footer className="space-y-2 border-t border-line/60 px-4 py-3">
        {tab === 'summary' ? (
          <button
            onClick={() => void runSummary()}
            disabled={summaryRunning || !hasKey}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-scholar to-scholar-deep px-3 py-2 text-xs font-medium text-paper ring-1 ring-gold/30 transition hover:shadow-glow disabled:opacity-40"
          >
            <RefreshCw size={13} className={summaryRunning ? 'animate-spin' : ''} />
            {summary ? '重新总结' : '生成总结'}
          </button>
        ) : (
          <>
            <button
              onClick={() => {
                void correctAll();
              }}
              disabled={correctRunning || !hasKey}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-scholar to-scholar-deep px-3 py-2 text-xs font-medium text-paper ring-1 ring-gold/30 transition hover:shadow-glow disabled:opacity-40"
            >
              <Wand2 size={13} className={correctRunning ? 'animate-spin' : ''} />
              {correctedText ? '重新纠错' : '纠错全文'}
            </button>
            {correctedText && !correctRunning && (
              <button
                onClick={applyCorrected}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-xs font-medium text-gold transition hover:bg-gold/20"
              >
                <Check size={13} />
                应用纠错替换原文
              </button>
            )}
          </>
        )}
        <p className="text-center font-mono text-[10px] text-ink-faint">
          {summaryRunning
            ? '正在流式生成…'
            : correctRunning
              ? '正在纠错…'
              : '由 agnes-2.0-flash 实时驱动'}
        </p>
      </footer>
    </div>
  );

  return (
    <>
      <aside className="hidden w-80 shrink-0 border-l border-line/60 lg:block">
        {panel}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-scholar-deep/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="absolute bottom-0 left-0 right-0 top-16 animate-fade-up border-t border-line/60 bg-paper shadow-card">
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative px-3 py-1.5 text-xs transition',
        active ? 'text-gold' : 'text-ink-faint hover:text-ink',
      )}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gold" />
      )}
    </button>
  );
}

function SummaryContent({
  summary,
  running,
}: {
  summary: string;
  running: boolean;
}) {
  if (!summary && !running) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Sparkles size={26} className="mb-3 text-ink-faint" />
        <p className="text-xs text-ink-faint">
          录音进行时将自动生成要点总结，也可手动点击下方按钮触发。
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {summary
        .split('\n')
        .map((line, i) => {
          const m = line.match(/^\s*[-*•]\s+(.*)/);
          if (m) {
            return (
              <div key={i} className="flex gap-2 text-sm text-ink">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold" />
                <span className="flex-1 leading-relaxed">{renderInline(m[1])}</span>
              </div>
            );
          }
          if (line.trim()) {
            return (
              <p key={i} className="text-sm leading-relaxed text-ink">
                {renderInline(line)}
              </p>
            );
          }
          return null;
        })}
      {running && (
        <div className="flex items-center gap-1.5 pt-2 text-xs text-gold">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
          生成中…
        </div>
      )}
    </div>
  );
}

function CorrectContent({
  text,
  running,
  onApply,
}: {
  text: string;
  running: boolean;
  onApply: () => void;
}) {
  if (!text && !running) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Eraser size={26} className="mb-3 text-ink-faint" />
        <p className="text-xs text-ink-faint">
          对整篇转写文本做一次 AI 纠错（同音字、标点、术语），生成后可应用替换原文。
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink">
        {text}
        {running && <span className="ml-0.5 inline-block h-3 w-0.5 animate-caret bg-gold" />}
      </p>
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-scholar">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
