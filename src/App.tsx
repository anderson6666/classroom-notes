import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from '@/components/AppShell';
import Studio from '@/pages/Studio';
import Library from '@/pages/Library';
import Settings from '@/pages/Settings';
import Unsupported from '@/pages/Unsupported';
import Toast from '@/components/Toast';
import { isSupported } from '@/lib/speech';

export default function App() {
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
