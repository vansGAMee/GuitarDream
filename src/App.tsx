import React, { useEffect } from 'react';
import { SongProvider, useSong } from './state/songContext';
import { PlaybackProvider } from './state/playbackContext';
import { Header } from './components/Shell/Header';
import { BottomNav } from './components/Shell/BottomNav';
import { TabMode } from './components/TabMode/TabMode';
import { PlayMode } from './components/PlayMode/PlayMode';
import { getAudioContext } from './audio/synth';

const MainLayout: React.FC = () => {
  const { activeMode } = useSong();

  // Unlock AudioContext on first touch/pointerdown anywhere on screen
  useEffect(() => {
    const handleUnlock = () => {
      try {
        const ctx = getAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      } catch {}
    };

    window.addEventListener('pointerdown', handleUnlock, { once: true });
    window.addEventListener('keydown', handleUnlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handleUnlock);
      window.removeEventListener('keydown', handleUnlock);
    };
  }, []);

  return (
    <div
      className="flex flex-col h-screen h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-canvas text-on-surface antialiased select-none"
      style={{
        paddingTop: 'var(--safe-top)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      <Header />
      <main className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        {activeMode === 'TAB' ? <TabMode /> : <PlayMode />}
      </main>
      <BottomNav />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <SongProvider>
      <PlaybackProvider>
        <MainLayout />
      </PlaybackProvider>
    </SongProvider>
  );
};

export default App;
