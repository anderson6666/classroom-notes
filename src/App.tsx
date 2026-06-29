import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import Studio from '@/pages/Studio';
import Library from '@/pages/Library';
import Settings from '@/pages/Settings';
import Unsupported from '@/pages/Unsupported';
import MobileUnsupported from '@/pages/MobileUnsupported';
import Toast from '@/components/Toast';
import { isSupported, isMobile } from '@/lib/speech';

export default function App() {
  // Block mobile devices first - they don't support Web Speech API
  if (isMobile()) {
    return <MobileUnsupported />;
  }

  // Then check if Web Speech API is supported on desktop
  if (!isSupported()) {
    return <Unsupported />;
  }

  return (
    <>
      <HashRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/studio" replace />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/studio/:id" element={<Studio />} />
            <Route path="/library" element={<Library />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/studio" replace />} />
          </Routes>
        </AppShell>
      </HashRouter>
      <Toast />
    </>
  );
}
