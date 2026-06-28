import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const dim = size === 'sm' ? 28 : size === 'lg' ? 44 : 34;
  const icon = size === 'sm' ? 15 : size === 'lg' ? 24 : 18;
  const textCls =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className="relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-scholar to-scholar-deep shadow-sm ring-1 ring-gold/30"
        style={{ width: dim, height: dim }}
      >
        <GraduationCap
          size={icon}
          className="text-gold"
          strokeWidth={1.6}
        />
        <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-rust animate-pulse" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn('font-display font-semibold text-ink', textCls)}>
            课堂笔记
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            Classroom Notes
          </span>
        </div>
      )}
    </div>
  );
}
