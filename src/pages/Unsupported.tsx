import { AlertCircle, Chrome, Github } from 'lucide-react';
import Logo from '@/components/Logo';

const BROWSERS = [
  { name: 'Chrome', note: '推荐 · 全功能支持', ok: true },
  { name: 'Edge', note: '推荐 · 全功能支持', ok: true },
  { name: 'Safari 14+', note: '部分支持 · 连续模式受限', ok: false },
  { name: 'Firefox', note: '不支持', ok: false },
];

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
                课堂笔记依赖 Web Speech API，请在桌面端使用推荐浏览器。
              </p>
            </div>
          </div>

          <ul className="mb-6 space-y-2">
            {BROWSERS.map((b) => (
              <li
                key={b.name}
                className="flex items-center justify-between rounded-lg border border-line/50 bg-paper-soft/50 px-4 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm text-ink">
                  <Chrome size={15} className="text-ink-soft" />
                  {b.name}
                </span>
                <span
                  className={
                    b.ok
                      ? 'font-mono text-xs text-gold'
                      : 'font-mono text-xs text-ink-faint'
                  }
                >
                  {b.note}
                </span>
              </li>
            ))}
          </ul>

          <div className="rounded-lg border border-gold/30 bg-gold/5 px-4 py-3">
            <p className="text-xs leading-relaxed text-ink-soft">
              <span className="font-medium text-gold">说明：</span>
              本应用完全运行于浏览器本地，需 HTTPS 环境。GitHub Pages 已提供 HTTPS。
              识别服务由浏览器厂商在线提供（Chrome/Edge 使用 Google 服务），对用户免费，但需联网。
            </p>
          </div>

          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-sm font-medium text-scholar-deep transition hover:shadow-glow"
          >
            <Chrome size={16} />
            下载 Chrome 浏览器
          </a>

          <p className="mt-4 flex items-center justify-center gap-1.5 font-mono text-[10px] text-ink-faint">
            <Github size={11} />
            可部署于 GitHub Pages · 纯前端 · 无需密钥
          </p>
        </div>
      </div>
    </div>
  );
}
