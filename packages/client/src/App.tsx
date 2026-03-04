import { useGameStore } from './store/gameStore';
import { LobbyScreen } from './components/Lobby/LobbyScreen';
import { BiddingScreen } from './components/Bidding/BiddingScreen';
import { TrumpSelectScreen } from './components/TrumpSelect/TrumpSelectScreen';
import { TeammateSelectScreen } from './components/TeammateSelect/TeammateSelectScreen';
import { GameTableScreen } from './components/GameTable/GameTableScreen';
import { ResultsScreen } from './components/Results/ResultsScreen';
import { DebugPanel } from './components/Debug/DebugPanel';
import { GameLog } from './components/Debug/GameLog';
import { ErrorToast } from './components/shared/ErrorToast';

export default function App() {
  const phase = useGameStore((s) => s.phase);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <ErrorToast />
      <div className="flex h-screen">
        {/* Main game area */}
        <div className="flex-1 overflow-auto p-4">
          {phase === 'lobby' && <LobbyScreen />}
          {phase === 'dealing' && <LobbyScreen />}
          {phase === 'bidding' && <BiddingScreen />}
          {phase === 'trump_select' && <TrumpSelectScreen />}
          {phase === 'teammate_select' && <TeammateSelectScreen />}
          {phase === 'playing' && <GameTableScreen />}
          {phase === 'reveal' && <GameTableScreen />}
          {phase === 'finished' && <ResultsScreen />}
        </div>

        {/* Debug sidebar — always visible */}
        <div className="w-80 border-l border-gray-700 flex flex-col">
          <DebugPanel />
          <GameLog />
        </div>
      </div>
    </div>
  );
}
