import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Clock,
  User,
  FileText,
  FileType2,
  Braces,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { formatDate, formatDuration } from '@/lib/format';
import { exportTxt, exportMarkdown, exportJson } from '@/lib/export';
import { cn } from '@/lib/utils';

export default function SessionHeader() {
  const session = useStore((s) => s.currentSession);
  const state = useStore((s) => s.recognitionState);
  const elapsed = useStore((s) => s.elapsedMs);
  const updateMeta = useStore((s) => s.updateSessionMeta);
  const saving = useStore((s) => s.saving);

  const [title, setTitle] = useState(session?.title ?? '');
  const [lecturer, setLecturer] = useState(session?.lecturer ?? '');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(session?.title ?? '');
    setLecturer(session?.lecturer ?? '');
  }, [session?.id]);

  if (!session) return null;

  const isListening = state === 'listening';
  const isLoading = state === 'loading';
  const commitTitle = () => {
    const v = title.trim();
    if (v && v !== session.title) updateMeta({ title: v });
    else setTitle(session.title);
  };
  const commitLecturer = () => {
    updateMeta({ lecturer: lecturer.trim() });
  };

  return (
    <div className="border-b border-line/60 bg-paper-soft/30 px-5 py-4 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
            placeholder="未命名课程"
            className="w-full truncate border-none bg-transparent font-display text-2xl font-semibold text-ink outline-none placeholder:text-ink-faint focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5">
              <User size={12} className="text-ink-faint" />
              <input
                value={lecturer}
                onChange={(e) => setLecturer(e.target.value)}
                onBlur={commitLecturer}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                placeholder="讲师（可选）"
                className="w-32 border-none bg-transparent outline-none placeholder:text-ink-faint focus:outline-none"
              />
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={12} className="text-ink-faint" />
              <span className="font-mono tabular-nums">{formatDate(session.date)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="text-ink-faint" />
              <span
                className={cn(
                  'font-mono tabular-nums',
                  isListening && 'text-rust',
                )}
              >
                {formatDuration(elapsed)}
              </span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'mr-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider',
              isListening
                ? 'bg-rust/15 text-rust'
                : isLoading
                  ? 'bg-gold/15 text-gold'
                  : 'bg-paper-soft text-ink-faint',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isListening
                  ? 'bg-rust animate-pulse'
                  : isLoading
                    ? 'bg-gold animate-pulse'
                    : 'bg-ink-faint',
              )}
            />
            {saving ? '保存中' : isListening ? '录音中' : isLoading ? '加载中' : '待机'}
          </span>
          <ExportButton session={session} />
        </div>
      </div>
    </div>
  );
}

function ExportButton({ session }: { session: NonNullable<ReturnType<typeof useStore.getState>['currentSession']> }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const items = [
    { label: 'TXT', icon: FileText, fn: () => exportTxt(session) },
    { label: 'Markdown', icon: FileType2, fn: () => exportMarkdown(session) },
    { label: 'JSON', icon: Braces, fn: () => exportJson(session) },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-lg border border-line/60 bg-paper-card px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-gold/50 hover:text-ink"
      >
        导出
        <ChevronRight size={12} className={cn('transition', open && 'rotate-90')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1.5 w-40 overflow-hidden rounded-lg border border-line/60 bg-paper-card py-1 shadow-card animate-fade-up">
          {items.map((it) => (
            <button
              key={it.label}
              onClick={() => {
                it.fn();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-soft transition hover:bg-gold/10 hover:text-ink"
            >
              <it.icon size={14} className="text-gold" />
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
