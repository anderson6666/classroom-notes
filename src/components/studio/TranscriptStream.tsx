import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import SegmentItem from '@/components/SegmentItem';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function TranscriptStream() {
  const session = useStore((s) => s.currentSession);
  const interim = useStore((s) => s.interimText);
  const isListening = useStore((s) => s.recognitionState === 'listening');
  const fontScale = useStore((s) => s.settings.fontScale);

  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const finalSegments = session?.segments.filter((s) => s.isFinal) ?? [];
  const sectionSet = new Set(session?.sections.map((sec) => sec.at) ?? []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // auto-scroll only when user is near bottom
    const nearBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [finalSegments.length, interim, isListening]);

  if (!session) return null;

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-8"
    >
      <div className="mx-auto max-w-3xl">
        {finalSegments.length === 0 && !interim && (
          <EmptyHint listening={isListening} />
        )}

        <div className="space-y-0.5">
          {finalSegments.map((seg, i) => {
            const showSection = sectionSet.has(seg.timestamp);
            return (
              <div key={seg.id}>
                {showSection && (
                  <div className="my-4 flex items-center gap-3 px-3">
                    <span className="h-px flex-1 bg-line/60" />
                    <span className="font-display text-xs text-gold">
                      分节
                    </span>
                    <span className="h-px flex-1 bg-line/60" />
                  </div>
                )}
                <SegmentItem
                  segment={seg}
                  highlighted={session.highlights.includes(seg.id)}
                  index={i}
                />
              </div>
            );
          })}
        </div>

        {/* Interim live text */}
        {(interim || isListening) && (
          <div className="mt-1 flex gap-3 rounded-lg px-3 py-2.5">
            <span className="mt-1 w-1 shrink-0 overflow-hidden">
              <span
                className={cn(
                  'block h-full w-full origin-bottom bg-gold/60',
                  isListening && 'animate-pulse-bar',
                )}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className="font-mono italic text-ink-faint"
                style={{ fontSize: `${0.95 * fontScale}rem`, lineHeight: 1.7 }}
              >
                {interim || '聆听中'}
                {isListening && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-caret bg-gold/70" />
                )}
              </p>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  );
}

function EmptyHint({ listening }: { listening: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-line/60 bg-paper-card">
        <Sparkles size={26} className="text-gold" />
      </span>
      <h3 className="font-display text-lg text-ink">
        {listening ? '正在聆听，请开始讲述' : '准备就绪'}
      </h3>
      <p className="mt-2 max-w-xs text-sm text-ink-soft">
        {listening
          ? '识别到的内容会实时显示在这里，落定后可双击编辑、标记重点。'
          : '点击下方的金色按钮开始录音，浏览器将实时把课堂讲解转为文字。'}
      </p>
    </div>
  );
}
