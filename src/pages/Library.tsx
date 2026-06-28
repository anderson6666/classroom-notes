import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Trash2,
  FileText,
  FileType2,
  Braces,
  Clock,
  BookOpen,
  FolderOpen,
  Mic,
  CalendarDays,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { getSession } from '@/lib/storage';
import { exportTxt, exportMarkdown, exportJson } from '@/lib/export';
import { formatDateTime, formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function Library() {
  const navigate = useNavigate();
  const sessions = useStore((s) => s.sessions);
  const openSession = useStore((s) => s.openSession);
  const deleteSession = useStore((s) => s.deleteSession);
  const createSession = useStore((s) => s.createSession);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.lecturer || '').toLowerCase().includes(q) ||
        s.preview.toLowerCase().includes(q),
    );
  }, [sessions, query]);

  const handleOpen = async (id: string) => {
    await openSession(id);
    navigate('/studio');
  };

  const handleExport = async (
    id: string,
    fmt: 'txt' | 'md' | 'json',
  ) => {
    setBusy(id + fmt);
    const s = await getSession(id);
    if (s) {
      if (fmt === 'txt') exportTxt(s);
      else if (fmt === 'md') exportMarkdown(s);
      else exportJson(s);
    }
    setBusy(null);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`确定删除「${title}」吗？此操作不可撤销。`)) {
      await deleteSession(id);
    }
  };

  const handleNew = () => {
    createSession('未命名课程');
    navigate('/studio');
  };

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line/60 bg-paper-soft/30 px-5 py-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">课程库</h1>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
              {sessions.length} 堂记录 · 本地存储
            </p>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索标题、讲师或内容…"
              className="w-64 max-w-full rounded-lg border border-line/60 bg-paper-card py-2 pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-gold/60"
            />
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-8">
        {filtered.length === 0 ? (
          <EmptyLibrary hasAny={sessions.length > 0} onNew={handleNew} />
        ) : (
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((s, i) => (
              <article
                key={s.id}
                className="group flex flex-col rounded-xl border border-line/60 bg-paper-card p-4 shadow-card transition hover:border-gold/40 hover:shadow-glow animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 40, 240)}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 font-display text-base font-semibold text-ink">
                    {s.title}
                  </h3>
                  <span className="shrink-0 rounded bg-scholar/8 px-1.5 py-0.5 font-mono text-[10px] text-scholar">
                    {s.lang}
                  </span>
                </div>

                {s.lecturer && (
                  <p className="mt-1 text-xs text-ink-soft">{s.lecturer}</p>
                )}

                <p className="mt-2 line-clamp-3 flex-1 font-mono text-xs leading-relaxed text-ink-soft">
                  {s.preview || '（无内容）'}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-ink-faint">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={11} />
                    {formatDateTime(s.updatedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatDuration(s.durationMs)}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen size={11} />
                    {s.wordCount} 字
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line/40 pt-2.5">
                  <button
                    onClick={() => handleOpen(s.id)}
                    className="flex items-center gap-1.5 rounded-md bg-scholar/10 px-2.5 py-1.5 text-xs font-medium text-ink transition hover:bg-scholar/20"
                  >
                    <FolderOpen size={13} />
                    打开
                  </button>
                  <div className="flex items-center gap-0.5">
                    {([
                      ['txt', FileText],
                      ['md', FileType2],
                      ['json', Braces],
                    ] as const).map(([fmt, Icon]) => (
                      <button
                        key={fmt}
                        onClick={() => handleExport(s.id, fmt)}
                        disabled={busy === s.id + fmt}
                        className="rounded p-1.5 text-ink-faint transition hover:bg-gold/10 hover:text-gold disabled:opacity-40"
                        title={`导出 ${fmt.toUpperCase()}`}
                      >
                        <Icon size={14} />
                      </button>
                    ))}
                    <button
                      onClick={() => handleDelete(s.id, s.title)}
                      className="rounded p-1.5 text-ink-faint transition hover:bg-rust/10 hover:text-rust"
                      title="删除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyLibrary({ hasAny, onNew }: { hasAny: boolean; onNew: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-line/60 bg-paper-card">
        <Mic size={26} className={cn('text-gold')} />
      </span>
      <h3 className="font-display text-lg text-ink">
        {hasAny ? '没有匹配的记录' : '还没有任何课程记录'}
      </h3>
      <p className="mt-2 max-w-xs text-sm text-ink-soft">
        {hasAny
          ? '试试更换关键词，或清空搜索框查看全部。'
          : '开始第一堂课的实时转写，记录会自动保存在这里。'}
      </p>
      {!hasAny && (
        <button
          onClick={onNew}
          className="mt-5 flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-medium text-scholar-deep transition hover:scale-105"
        >
          <Mic size={15} />
          开始第一堂课
        </button>
      )}
    </div>
  );
}
