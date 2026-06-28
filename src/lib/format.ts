export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatTimestamp(ms: number): string {
  if (!ms || ms < 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(m)}:${pad(s)}`;
}

export function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}.${m}.${day}`;
  } catch {
    return '';
  }
}

export function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    const date = formatDate(iso);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${date} ${h}:${m}`;
  } catch {
    return '';
  }
}

export function countWords(text: string): number {
  if (!text) return 0;
  // For CJK, count characters; for latin, count words. Mix: sum of both.
  const cjk = text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g);
  const cjkCount = cjk ? cjk.length : 0;
  const latin = text
    .replace(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, ' ')
    .trim();
  const latinCount = latin ? latin.split(/\s+/).length : 0;
  return cjkCount + latinCount;
}

export function readingMinutes(wordCount: number): number {
  // ~300 cjk chars / min or ~200 words/min; use wordCount directly as blended
  return Math.max(1, Math.round(wordCount / 250));
}

export function previewText(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max) + '…';
}
