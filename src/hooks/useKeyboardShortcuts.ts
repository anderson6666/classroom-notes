import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { exportMarkdown } from '@/lib/export';

function isEditable(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    tag === 'OPTION' ||
    node.isContentEditable
  );
}

export function useKeyboardShortcuts(): void {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S — export current session as Markdown
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        const s = useStore.getState().currentSession;
        if (s) {
          e.preventDefault();
          exportMarkdown(s);
        }
        return;
      }

      // Ctrl/Cmd + / — jump to library
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.code === 'Slash')) {
        e.preventDefault();
        navigate('/library');
        return;
      }

      // Space — toggle listening (only when not focused on an editable element)
      if (e.code === 'Space' && !isEditable(e.target)) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'BUTTON' || tag === 'A') return;
        e.preventDefault();
        useStore.getState().toggleListening();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
}
