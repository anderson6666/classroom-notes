import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export default function Toast() {
  const lastError = useStore((s) => s.lastError);
  const dismiss = useStore((s) => s.dismissError);

  useEffect(() => {
    if (!lastError) return;
    const t = setTimeout(() => dismiss(), 5000);
    return () => clearTimeout(t);
  }, [lastError, dismiss]);

  if (!lastError) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      <div
        className={cn(
          'pointer-events-auto flex items-start gap-3 rounded-lg border border-rust/40 bg-paper-card px-4 py-3 shadow-card animate-fade-up',
          'max-w-md',
        )}
        role="alert"
      >
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rust" />
        <div className="flex-1">
          <p className="text-sm text-ink">{lastError.message}</p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded p-0.5 text-ink-faint transition hover:text-ink"
          aria-label="关闭"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
