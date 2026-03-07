import { useGameStore } from './store/gameStore';
import { LobbyScreen } from './components/Lobby/LobbyScreen';
import { BiddingScreen } from './components/Bidding/BiddingScreen';
import { TrumpSelectScreen } from './components/TrumpSelect/TrumpSelectScreen';
import { TeammateSelectScreen } from './components/TeammateSelect/TeammateSelectScreen';
import { GameTableScreen } from './components/GameTable/GameTableScreen';
import { ResultsScreen } from './components/Results/ResultsScreen';
import { DebugPanel } from './components/Debug/DebugPanel';
import { GameLog } from './components/Debug/GameLog';
import { MobileDebugDrawer } from './components/Debug/MobileDebugDrawer';
import { ErrorToast } from './components/shared/ErrorToast';
import { ReconnectingBanner } from './components/shared/ReconnectingBanner';
import { GameStartBanner } from './components/shared/GameStartBanner';

export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="min-h-screen bg-amber-50 text-gray-800 flex flex-col">
      <ErrorToast />
      <GameStartBanner />
      <ReconnectingBanner />

      <div className="flex flex-1 overflow-hidden">

        {/* Game content — full width on mobile, flex-1 on desktop */}
        <div className="flex-1 overflow-auto p-3 md:p-4">
          {phase === 'lobby' && <LobbyScreen />}
          {phase === 'dealing' && <LobbyScreen />}
          {phase === 'bidding' && <BiddingScreen />}
          {phase === 'trump_select' && <TrumpSelectScreen />}
          {phase === 'teammate_select' && <TeammateSelectScreen />}
          {phase === 'playing' && <GameTableScreen />}
          {phase === 'reveal' && <GameTableScreen />}
          {phase === 'finished' && <ResultsScreen />}
        </div>

        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex w-80 border-l border-amber-200 flex-col bg-white shadow-inner">
          <DebugPanel />
          <GameLog />
        </div>

      </div>

      {/* Mobile bottom drawer — visible on mobile only, hidden on desktop */}
      <div className="md:hidden">
        <MobileDebugDrawer />
      </div>

    </div>
  );
}
