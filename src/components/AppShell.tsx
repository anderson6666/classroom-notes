import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Mic, Library, Settings as SettingsIcon, Menu, X, Plus } from 'lucide-react';
import Logo from './Logo';
import { useStore } from '@/lib/store';
import { isSupported } from '@/lib/speech';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Mic;
  desc: string;
}

const NAV: NavItem[] = [
  { to: '/studio', label: '工作台', icon: Mic, desc: '实时转写' },
  { to: '/library', label: '课程库', icon: Library, desc: '历史记录' },
  { to: '/settings', label: '设置', icon: SettingsIcon, desc: '识别与外观' },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const createSession = useStore((s) => s.createSession);

  const handleNew = () => {
    createSession();
    navigate('/studio');
    setOpen(false);
  };

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-6 pb-4">
        <Logo size="md" />
      </div>

      <nav className="flex-1 px-3">
        <p className="px-2 pb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
          导航
        </p>
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to === '/studio' && location.pathname.startsWith('/studio'));
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                    active
                      ? 'bg-scholar/10 text-ink'
                      : 'text-ink-soft hover:bg-paper-soft hover:text-ink',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-md transition',
                      active
                        ? 'bg-gradient-to-br from-gold-soft to-gold text-scholar-deep'
                        : 'bg-paper-soft text-ink-soft group-hover:text-ink',
                    )}
                  >
                    <item.icon size={16} strokeWidth={1.8} />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="font-mono text-[10px] text-ink-faint">
                      {item.desc}
                    </span>
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-3">
        <button
          onClick={handleNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-scholar to-scholar-deep px-3 py-2.5 text-sm font-medium text-paper shadow-sm ring-1 ring-gold/30 transition hover:shadow-glow"
        >
          <Plus size={16} strokeWidth={2} />
          新建课程
        </button>
        <p className="mt-3 px-2 font-mono text-[10px] leading-relaxed text-ink-faint">
          {isSupported() ? '已就绪 · 本地保存' : '浏览器受限'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-paper">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-line/60 bg-paper-soft/40 md:block">
        {SidebarContent}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-scholar-deep/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-line/60 bg-paper shadow-card animate-fade-up">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded p-1.5 text-ink-faint hover:text-ink"
              aria-label="关闭菜单"
            >
              <X size={18} />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile topbar */}
        <header className="flex items-center justify-between border-b border-line/60 bg-paper-soft/40 px-4 py-3 md:hidden">
          <button
            onClick={() => setOpen(true)}
            className="rounded p-1.5 text-ink-soft hover:text-ink"
            aria-label="打开菜单"
          >
            <Menu size={20} />
          </button>
          <Logo size="sm" showText={false} />
          <div className="w-9" />
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
