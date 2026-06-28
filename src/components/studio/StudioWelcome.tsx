import { useNavigate } from 'react-router-dom';
import { Mic, ShieldCheck, Zap, Download } from 'lucide-react';
import Logo from '@/components/Logo';
import { useStore } from '@/lib/store';

const FEATURES = [
  {
    icon: Zap,
    title: '实时出字',
    desc: 'Web Speech API 即时转写，临时文字与最终段落分层呈现。',
  },
  {
    icon: ShieldCheck,
    title: '本地保存',
    desc: '所有内容存于浏览器，不上传服务器，隐私无忧。',
  },
  {
    icon: Download,
    title: '多格式导出',
    desc: '支持 TXT / Markdown / JSON，便于二次整理与归档。',
  },
];

export default function StudioWelcome() {
  const navigate = useNavigate();
  const createSession = useStore((s) => s.createSession);

  const start = () => {
    createSession('未命名课程');
    navigate('/studio');
  };

  return (
    <div className="paper-grain flex h-full items-center justify-center overflow-auto px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center animate-fade-up">
          <Logo size="lg" />
          <h1 className="mt-6 font-display text-4xl font-semibold text-ink">
            听课即得稿
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="rounded-xl border border-line/60 bg-paper-card p-4 shadow-card animate-fade-up"
              style={{ animationDelay: `${120 + i * 120}ms` }}
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-scholar/10 text-gold">
                <f.icon size={17} />
              </span>
              <h3 className="font-display text-sm font-semibold text-ink">
                {f.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                {f.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-center animate-fade-up" style={{ animationDelay: '480ms' }}>
          <button
            onClick={start}
            className="flex items-center gap-2.5 rounded-full bg-gradient-to-br from-scholar to-scholar-deep px-8 py-3.5 font-medium text-gold shadow-glow ring-1 ring-gold/30 transition hover:scale-105"
          >
            <Mic size={18} strokeWidth={2} />
            开始课堂
          </button>
        </div>
      </div>
    </div>
  );
}
