import { Mic, Square } from 'lucide-react';
import { useStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface RecordButtonProps {
  size?: 'md' | 'lg';
}

export default function RecordButton({ size = 'lg' }: RecordButtonProps) {
  const state = useStore((s) => s.recognitionState);
  const toggle = useStore((s) => s.toggleListening);
  const isListening = state === 'listening';

  const dim = size === 'lg' ? 64 : 52;
  const icon = size === 'lg' ? 26 : 22;

  return (
    <button
      onClick={toggle}
      className={cn(
        'relative flex items-center justify-center rounded-full transition-all duration-300',
        'ring-1 focus-visible:outline-none',
        isListening
          ? 'bg-rust text-paper ring-rust/40 animate-breathe'
          : 'bg-gradient-to-br from-gold-soft to-gold text-scholar-deep ring-gold/40 hover:shadow-glow hover:scale-105',
      )}
      style={{ width: dim, height: dim }}
      aria-label={isListening ? '暂停录音' : '开始录音'}
      title={isListening ? '暂停录音' : '开始录音'}
    >
      {isListening ? (
        <Square size={icon - 6} className="fill-current" />
      ) : (
        <Mic size={icon} strokeWidth={2} />
      )}
    </button>
  );
}
