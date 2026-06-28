import { saveAs } from 'file-saver';
import type { Session } from './types';
import { formatDuration, formatTimestamp, formatDate } from './format';

function sessionText(s: Session): string {
  return s.segments
    .filter((seg) => seg.isFinal)
    .map((seg) => seg.text)
    .join('');
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60) || 'session';
}

export function exportTxt(s: Session): void {
  const lines: string[] = [];
  lines.push(s.title);
  lines.push('');
  if (s.lecturer) lines.push(`讲师：${s.lecturer}`);
  lines.push(`日期：${formatDate(s.date)}`);
  lines.push(`时长：${formatDuration(s.durationMs)}`);
  lines.push('');
  lines.push('─'.repeat(40));
  lines.push('');

  const sectionSet = new Map(s.sections.map((sec) => [sec.at, sec.label]));
  const finalSegments = s.segments.filter((seg) => seg.isFinal);
  finalSegments.forEach((seg) => {
    const sectionLabel = sectionSet.get(seg.timestamp);
    if (sectionLabel) {
      lines.push('');
      lines.push(`【${sectionLabel}】`);
      lines.push('');
    }
    lines.push(`[${formatTimestamp(seg.timestamp)}] ${seg.text}`);
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, `${safeFileName(s.title)}.txt`);
}

export function exportMarkdown(s: Session): void {
  const lines: string[] = [];
  lines.push(`# ${s.title}`);
  lines.push('');
  lines.push('> 课程笔记 · 由课堂笔记生成');
  lines.push('');
  const meta: string[] = [];
  if (s.lecturer) meta.push(`**讲师**：${s.lecturer}`);
  meta.push(`**日期**：${formatDate(s.date)}`);
  meta.push(`**时长**：${formatDuration(s.durationMs)}`);
  meta.push(`**语言**：${s.lang}`);
  lines.push(meta.join('  ·  '));
  lines.push('');
  lines.push('---');
  lines.push('');

  const sectionSet = new Map(s.sections.map((sec) => [sec.at, sec.label]));
  const finalSegments = s.segments.filter((seg) => seg.isFinal);
  finalSegments.forEach((seg) => {
    const sectionLabel = sectionSet.get(seg.timestamp);
    if (sectionLabel) {
      lines.push('');
      lines.push(`## ${sectionLabel}`);
      lines.push('');
    }
    const isHighlight = s.highlights.includes(seg.id);
    const prefix = isHighlight ? '> ' : '';
    lines.push(`${prefix}*[${formatTimestamp(seg.timestamp)}]* ${seg.text}`);
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], {
    type: 'text/markdown;charset=utf-8',
  });
  saveAs(blob, `${safeFileName(s.title)}.md`);
}

export function exportJson(s: Session): void {
  const blob = new Blob([JSON.stringify(s, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  saveAs(blob, `${safeFileName(s.title)}.json`);
}

export function exportAllJson(sessions: Session[]): void {
  const blob = new Blob([JSON.stringify(sessions, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const stamp = formatDate(new Date().toISOString()).replace(/\./g, '-');
  saveAs(blob, `lecture-steno-backup-${stamp}.json`);
}

export { sessionText };
