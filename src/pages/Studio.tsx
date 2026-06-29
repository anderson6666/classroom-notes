import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import SessionHeader from '@/components/studio/SessionHeader';
import ControlBar from '@/components/studio/ControlBar';
import TranscriptStream from '@/components/studio/TranscriptStream';
import StudioFooter from '@/components/studio/StudioFooter';
import StudioWelcome from '@/components/studio/StudioWelcome';
import SummaryPanel from '@/components/studio/SummaryPanel';
import ModelLoadingOverlay from '@/components/studio/ModelLoadingOverlay';
import { useStore } from '@/lib/store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function Studio() {
  const { id } = useParams<{ id: string }>();
  const session = useStore((s) => s.currentSession);
  const openSession = useStore((s) => s.openSession);
  const initialized = useStore((s) => s.initialized);
  const [summaryOpen, setSummaryOpen] = useState(false);

  useKeyboardShortcuts();

  useEffect(() => {
    if (!initialized) return;
    if (id && (!session || session.id !== id)) {
      void openSession(id);
    }
  }, [id, initialized, openSession, session]);

  if (!session) {
    return <StudioWelcome />;
  }

  return (
    <div className="flex h-full flex-col">
      <SessionHeader />
      <ControlBar />
      <div className="flex min-h-0 flex-1">
        <TranscriptStream />
        <SummaryPanel mobileOpen={summaryOpen} onClose={() => setSummaryOpen(false)} />
      </div>
      <StudioFooter />
      <ModelLoadingOverlay />
      <button
        onClick={() => setSummaryOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-scholar to-scholar-deep text-paper shadow-glow transition hover:scale-105 lg:hidden"
        aria-label="打开 AI 助手"
      >
        <Sparkles size={18} />
      </button>
    </div>
  );
}
