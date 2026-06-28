import { useEffect, useRef, useState } from 'react';
import { Highlighter, Trash2, Check } from 'lucide-react';
import type { SpeechSegment } from '@/lib/types';
import { useStore } from '@/lib/store';
import { formatTimestamp } from '@/lib/format';
import { speakerColor, defaultSpeakerLabel } from '@/lib/speaker';
import { cn } from '@/lib/utils';

interface SegmentItemProps {
  segment: SpeechSegment;
  highlighted: boolean;
  index: number;
}

export default function SegmentItem({
  segment,
  highlighted,
  index,
}: SegmentItemProps) {
  const toggleHighlight = useStore((s) => s.toggleHighlight);
  const deleteSegment = useStore((s) => s.deleteSegment);
  const editSegment = useStore((s) => s.editSegment);
  const fontScale = useStore((s) => s.settings.fontScale);
  const speakerLabels = useStore((s) => s.currentSession?.speakerLabels ?? {});
  const setSpeakerLabel = useStore((s) => s.setSpeakerLabel);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(segment.text);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
    }
  }, [editing]);

  const commit = () => {
    const text = draft.trim();
    if (text && text !== segment.text) editSegment(segment.id, text);
    else setDraft(segment.text);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        'group relative flex gap-3 rounded-lg px-3 py-2.5 transition-colors animate-fade-up',
        highlighted ? 'bg-gold/10' : 'hover:bg-paper-soft/60',
      )}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <span
        className={cn(
          'mt-1 shrink-0 select-none font-display text-xs tabular-nums',
          highlighted ? 'text-gold' : 'text-ink-faint',
        )}
      >
        {formatTimestamp(segment.timestamp)}
      </span>

      <div className="min-w-0 flex-1">
        {segment.speakerId != null && (
          <SpeakerBadge
            speakerId={segment.speakerId}
            label={speakerLabels[segment.speakerId] ?? defaultSpeakerLabel(segment.speakerId)}
            onRename={(label) => setSpeakerLabel(segment.speakerId!, label)}
          />
        )}
        {editing ? (
          <textarea
            ref={ref}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commit();
              }
              if (e.key === 'Escape') {
                setDraft(segment.text);
                setEditing(false);
              }
            }}
            className={cn(
              'w-full resize-none rounded border border-gold/50 bg-paper px-2 py-1.5 font-mono text-ink',
              'focus:outline-none focus:ring-1 focus:ring-gold/60',
            )}
            style={{ fontSize: `${0.95 * fontScale}rem`, lineHeight: 1.7 }}
            rows={Math.max(2, Math.ceil(draft.length / 48))}
          />
        ) : (
          <p
            onDoubleClick={() => {
              setDraft(segment.text);
              setEditing(true);
            }}
            className={cn(
              'cursor-text whitespace-pre-wrap break-words font-mono text-ink',
              highlighted && 'border-l-2 border-gold pl-2',
            )}
            style={{ fontSize: `${0.95 * fontScale}rem`, lineHeight: 1.7 }}
            title="双击编辑"
          >
            {segment.text}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {editing ? (
          <button
            onClick={commit}
            className="rounded p-1.5 text-gold transition hover:bg-gold/10"
            aria-label="保存"
          >
            <Check size={15} />
          </button>
        ) : (
          <>
            <button
              onClick={() => toggleHighlight(segment.id)}
              className={cn(
                'rounded p-1.5 transition hover:bg-gold/10',
                highlighted ? 'text-gold' : 'text-ink-faint hover:text-gold',
              )}
              aria-label={highlighted ? '取消重点' : '标记重点'}
              title={highlighted ? '取消重点' : '标记重点'}
            >
              <Highlighter size={15} />
            </button>
            <button
              onClick={() => deleteSegment(segment.id)}
              className="rounded p-1.5 text-ink-faint transition hover:bg-rust/10 hover:text-rust"
              aria-label="删除段落"
              title="删除段落"
            >
              <Trash2 size={15} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SpeakerBadge({
  speakerId,
  label,
  onRename,
}: {
  speakerId: number;
  label: string;
  onRename: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const color = speakerColor(speakerId);

  useEffect(() => {
    if (!editing) setDraft(label);
  }, [label, editing]);

  const commit = () => {
    const next = draft.trim();
    if (next && next !== label) onRename(next);
    else setDraft(label);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            setDraft(label);
            setEditing(false);
          }
        }}
        className="mb-1 w-32 rounded border bg-paper px-2 py-0.5 text-[11px] font-medium outline-none focus:ring-1"
        style={{ borderColor: color.dot, color: color.text }}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(label);
        setEditing(true);
      }}
      className="mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition hover:opacity-80"
      style={{ backgroundColor: color.bg, color: color.text }}
      title="点击重命名说话人"
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color.dot }} />
      {label}
    </button>
  );
}
