import { Monitor, Smartphone, AlertTriangle } from 'lucide-react';
import Logo from '@/components/Logo';
import { isMobile } from '@/lib/speech';

export default function MobileUnsupported() {
  return (
    <div className="paper-grain flex h-screen items-center justify-center overflow-hidden px-6">
      <div className="w-full max-w-md text-center animate-fade-up">
        <Logo size="lg" />
        
        <div className="mt-8 flex justify-center">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rust/10">
              <Smartphone size={28} className="text-rust" />
            </div>
            <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rust">
              <AlertTriangle size={14} className="text-paper" />
            </div>
          </div>
        </div>

        <h1 className="mt-6 font-display text-2xl font-semibold text-ink">
          手机版不支持
        </h1>
        
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          课堂笔记的语音识别功能依赖桌面端浏览器的 Web Speech API，
          手机浏览器暂不支持此功能。
        </p>

        <div className="mt-8 rounded-xl border border-line/60 bg-paper-card p-4">
          <div className="flex items-center gap-3">
            <Monitor size={20} className="text-gold" />
            <div className="text-left">
              <p className="text-sm font-medium text-ink">请在电脑上访问</p>
              <p className="mt-0.5 font-mono text-xs text-ink-faint">
                anderson6666.github.io/classroom-notes
              </p>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs text-ink-faint">
          支持的桌面浏览器：Chrome、Edge、Safari（需 macOS）
        </p>
      </div>
    </div>
  );
}