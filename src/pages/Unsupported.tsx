import { AlertCircle, Chrome } from 'lucide-react';
import Logo from '@/components/Logo';

export default function Unsupported() {
  return (
    <div className="paper-grain flex h-full items-center justify-center overflow-auto px-6 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>

        <div className="rounded-2xl border border-line/70 bg-paper-card p-8 shadow-card">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-rust/15 text-rust">
              <AlertCircle size={22} />
            </span>
            <div>
              <h1 className="font-display text-xl font-semibold text-ink">
                当前浏览器不支持语音识别
              </h1>
              <p className="text-sm text-ink-soft">
                课堂笔记依赖 Web Speech API，请使用 Chrome 或 Edge 浏览器。
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-line/50 bg-paper-soft/50 px-4 py-3">
            <p className="text-xs leading-relaxed text-ink-soft">
              语音识别基于浏览器内置的 Web Speech API（在线服务），
              需要 HTTPS 环境与麦克风权限。仅支持桌面端浏览器。
            </p>
          </div>

          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noreferrer"
            className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-sm font-medium text-scholar-deep transition hover:shadow-glow"
          >
            <Chrome size={16} />
            下载 Chrome 浏览器
          </a>

          <p className="mt-4 text-center font-mono text-[10px] text-ink-faint">
            支持的浏览器：Chrome、Edge、Safari（macOS）
          </p>
        </div>
      </div>
    </div>
  );
}