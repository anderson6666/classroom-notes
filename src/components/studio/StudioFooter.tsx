import { useStore } from '@/lib/store';
import { countWords, readingMinutes } from '@/lib/format';
import { Highlighter, AlignLeft, BookOpen } from 'lucide-react';

export default function StudioFooter() {
  const session = useStore((s) => s.currentSession);
  if (!session) return null;

  const finalSegs = session.segments.filter((s) => s.isFinal);
  const text = finalSegs.map((s) => s.text).join('');
  const words = countWords(text);
  const minutes = readingMinutes(words);
  const highlights = session.highlights.length;

  const stats = [
    { icon: AlignLeft, label: '段落', value: finalSegs.length },
    { icon: BookOpen, label: '字数', value: words },
    { icon: Highlighter, label: '重点', value: highlights },
    { label: '约读', value: `${minutes} 分钟` },
  ];

  return (
    <div className="flex items-center justify-between border-t border-line/60 bg-paper-soft/30 px-5 py-2 md:px-8">
      <div className="flex items-center gap-4 text-xs text-ink-soft">
        {stats.map((st, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {st.icon && <st.icon size={12} className="text-ink-faint" />}
            <span className="text-ink-faint">{st.label}</span>
            <span className="font-mono tabular-nums text-ink">{st.value}</span>
          </span>
        ))}
      </div>
      <div className="hidden items-center gap-3 font-mono text-[10px] text-ink-faint md:flex">
        <span><kbd className="rounded bg-paper-card px-1 py-0.5">Space</kbd> 录音</span>
        <span><kbd className="rounded bg-paper-card px-1 py-0.5">Ctrl+S</kbd> 导出</span>
      </div>
    </div>
  );
}
