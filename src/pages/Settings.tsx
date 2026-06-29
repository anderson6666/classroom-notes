import { useState } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Type,
  Database,
  Download,
  Trash2,
  Info,
  ShieldCheck,
  Chrome,
  Globe,
  Github,
  Sparkles,
  Users,
  Loader2,
  Check,
  X,
  Zap,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import { getAllSessions } from '@/lib/storage';
import { exportAllJson } from '@/lib/export';
import { LANGUAGES, type ThemeMode } from '@/lib/types';
import { isSupported } from '@/lib/speech';
import { testAgnesConnection } from '@/lib/agnes';
import { isSpeakerSupported } from '@/lib/speaker';
import { cn } from '@/lib/utils';

export default function Settings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const clearAllData = useStore((s) => s.clearAllData);
  const sessions = useStore((s) => s.sessions);
  const apiKey = useStore((s) => s.apiKey);
  const setApiKey = useStore((s) => s.setApiKey);
  const [exporting, setExporting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null);
  const [testError, setTestError] = useState('');

  const handleExportAll = async () => {
    setExporting(true);
    const all = await getAllSessions();
    exportAllJson(all);
    setExporting(false);
  };

  const handleClear = async () => {
    if (
      confirm(
        `确定清空全部本地数据吗？将删除 ${sessions.length} 条会话记录，此操作不可撤销。`,
      )
    ) {
      await clearAllData();
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await testAgnesConnection(apiKey);
      setTestResult('ok');
    } catch (e) {
      setTestResult('fail');
      setTestError(e instanceof Error ? e.message : '连接失败');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl px-5 py-6 md:px-8 md:py-8">
        <header className="mb-6">
          <h1 className="font-display text-2xl font-semibold text-ink">设置</h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink-faint">
            识别 · AI · 说话人 · 外观 · 数据 · 关于
          </p>
        </header>

        {/* Recognition */}
        <Section title="识别" icon={Globe}>
          <Row label="识别语言" desc="影响实时转写的语种">
            <select
              value={settings.lang}
              onChange={(e) => updateSettings({ lang: e.target.value })}
              className="rounded-lg border border-line/60 bg-paper-card px-2.5 py-1.5 text-sm text-ink outline-none focus:border-gold/60"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="连续识别" desc="长时间课堂录音建议开启">
            <Switch
              checked={settings.continuous}
              onChange={(v) => updateSettings({ continuous: v })}
            />
          </Row>
          <Row label="显示临时结果" desc="实时显示未落定的文字">
            <Switch
              checked={settings.interimResults}
              onChange={(v) => updateSettings({ interimResults: v })}
            />
          </Row>
          <Row label="防息屏" desc="录音时保持屏幕常亮（Wake Lock）">
            <Switch
              checked={settings.enableWakeLock}
              onChange={(v) => updateSettings({ enableWakeLock: v })}
            />
          </Row>
        </Section>

        {/* AI Assistant */}
        <Section title="AI 助手" icon={Sparkles}>
          <Row label="Agnes API Key" desc="用于实时总结与纠错，密钥仅存于本地浏览器">
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="sk-..."
                className="w-36 rounded-lg border border-line/60 bg-paper-card px-2.5 py-1.5 text-sm text-ink outline-none focus:border-gold/60"
              />
              <button
                onClick={() => void handleTest()}
                disabled={!apiKey || testing}
                className="flex items-center gap-1 rounded-lg border border-line/60 bg-paper-card px-2.5 py-1.5 text-xs text-ink-soft transition hover:border-gold/50 hover:text-ink disabled:opacity-40"
              >
                {testing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Zap size={12} />
                )}
                测试
              </button>
            </div>
          </Row>
          <div className="px-3 py-1.5 text-xs text-ink-faint">
            还没有 Key？
            <a
              href="https://platform.agnes-ai.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold transition hover:underline"
            >
              前往 Agnes 平台获取 →
            </a>
          </div>
          {testResult === 'ok' && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-gold">
              <Check size={12} /> 连接正常，可使用总结与纠错
            </div>
          )}
          {testResult === 'fail' && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-rust">
              <X size={12} /> {testError || '连接失败'}
            </div>
          )}
          <Row label="启用 AI 总结与纠错" desc="录音时自动生成要点总结，可手动纠错全文">
            <Switch
              checked={settings.enableAI}
              onChange={(v) => updateSettings({ enableAI: v })}
            />
          </Row>
        </Section>

        {/* Speaker Recognition */}
        <Section title="说话人识别" icon={Users}>
          <Row label="启用声纹聚类" desc="纯前端 MFCC 特征 + 余弦相似度在线聚类">
            <Switch
              checked={settings.enableSpeakerId}
              onChange={(v) => updateSettings({ enableSpeakerId: v })}
            />
          </Row>
          <Row label="浏览器支持" desc="需要麦克风权限与 AudioContext">
            <span
              className={cn(
                'font-mono text-xs',
                isSpeakerSupported() ? 'text-gold' : 'text-rust',
              )}
            >
              {isSpeakerSupported() ? '已支持' : '不支持'}
            </span>
          </Row>
          <div className="px-3 py-2.5 text-xs leading-relaxed text-ink-faint">
            录音时将自动区分不同说话人，转写段落上方会显示彩色说话人标签。点击标签可重命名（如"老师"、"同学"）。
          </div>
        </Section>

        {/* Appearance */}
        <Section title="外观" icon={Type}>
          <Row label="主题" desc="亮色纸张 / 暗色墨绿 / 跟随系统">
            <div className="flex rounded-lg border border-line/60 p-0.5">
              {(
                [
                  ['light', Sun],
                  ['dark', Moon],
                  ['system', Monitor],
                ] as const
              ).map(([mode, Icon]) => (
                <button
                  key={mode}
                  onClick={() => updateSettings({ theme: mode as ThemeMode })}
                  className={cn(
                    'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition',
                    settings.theme === mode
                      ? 'bg-gold/15 text-gold'
                      : 'text-ink-faint hover:text-ink',
                  )}
                  title={mode}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">
                    {mode === 'light' ? '亮' : mode === 'dark' ? '暗' : '系统'}
                  </span>
                </button>
              ))}
            </div>
          </Row>
          <Row label="正文字号" desc={`${Math.round(settings.fontScale * 100)}%`}>
            <input
              type="range"
              min={0.85}
              max={1.3}
              step={0.05}
              value={settings.fontScale}
              onChange={(e) =>
                updateSettings({ fontScale: parseFloat(e.target.value) })
              }
              className="w-32 accent-gold"
            />
          </Row>
        </Section>

        {/* Data */}
        <Section title="数据" icon={Database}>
          <Row label="导出全部会话" desc="备份为单个 JSON 文件">
            <button
              onClick={handleExportAll}
              disabled={exporting || sessions.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-line/60 bg-paper-card px-3 py-1.5 text-xs text-ink-soft transition hover:border-gold/50 hover:text-ink disabled:opacity-40"
            >
              <Download size={13} />
              导出
            </button>
          </Row>
          <Row label="清空全部数据" desc="删除所有本地会话记录" danger>
            <button
              onClick={handleClear}
              disabled={sessions.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-rust/40 bg-rust/5 px-3 py-1.5 text-xs text-rust transition hover:bg-rust/10 disabled:opacity-40"
            >
              <Trash2 size={13} />
              清空
            </button>
          </Row>
        </Section>

        {/* About */}
        <Section title="关于" icon={Info}>
          <div className="space-y-3 px-1 py-2 text-xs leading-relaxed text-ink-soft">
            <p className="flex items-start gap-2">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gold" />
              <span>
                所有数据仅存于浏览器本地（localStorage / IndexedDB），不会上传任何服务器。
                语音识别基于 Web Speech API（浏览器在线服务），需要联网。
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Chrome size={14} className="mt-0.5 shrink-0 text-gold" />
              <span>
                {isSupported() ? (
                  <span className="text-gold">当前浏览器已支持语音识别</span>
                ) : (
                  <span className="text-rust">当前浏览器不支持语音识别</span>
                )}
                （Web Speech API · 仅支持桌面端）
              </span>
            </p>
            <p className="flex items-start gap-2">
              <Github size={14} className="mt-0.5 shrink-0 text-gold" />
              <span>
                纯前端项目，部署于 GitHub Pages。仅支持桌面端浏览器（Chrome、Edge、Safari）。
              </span>
            </p>
          </div>
        </Section>

        <p className="mt-8 text-center font-mono text-[10px] text-ink-faint">
          课堂笔记 · Classroom Notes · v1.0
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Info;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-xl border border-line/60 bg-paper-card p-1 shadow-card">
      <header className="flex items-center gap-2 px-3 py-2.5">
        <Icon size={14} className="text-gold" />
        <h2 className="font-display text-sm font-semibold text-ink">{title}</h2>
      </header>
      <div className="divide-y divide-line/40">{children}</div>
    </section>
  );
}

function Row({
  label,
  desc,
  children,
  danger,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3">
      <div className="min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            danger ? 'text-rust' : 'text-ink',
          )}
        >
          {label}
        </p>
        {desc && <p className="mt-0.5 text-xs text-ink-faint">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Switch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        checked ? 'bg-gold' : 'bg-line',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-paper shadow-sm transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
