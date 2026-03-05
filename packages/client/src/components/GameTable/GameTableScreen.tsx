import { useGameStore } from '../../store/gameStore';
import { TrickArea } from './TrickArea';
import { PlayerHand } from './PlayerHand';
import { TeammateRevealToast } from './TeammateRevealToast';
import { ScoreBar } from './ScoreBar';

const suitSymbols: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const suitColors: Record<string, string> = {
  spades: 'text-gray-800',
  hearts: 'text-red-500',
  diamonds: 'text-orange-500',
  clubs: 'text-emerald-600',
};

export function GameTableScreen() {
  const trumpSuit = useGameStore((s) => s.trumpSuit);
  const tricks = useGameStore((s) => s.tricks);
  const currentTrick = useGameStore((s) => s.currentTrick);
  const highestBid = useGameStore((s) => s.highestBid);
  const bidderId = useGameStore((s) => s.bidderId);
  const players = useGameStore((s) => s.players);
  const currentPlayer = useGameStore((s) => s.currentPlayer);

  const current = currentPlayer();
  const bidderName = players.find((p) => p.id === bidderId)?.name ?? 'Bidder';
  const trickNum = tricks.length + (currentTrick ? 1 : 0);
  return (
    <div className="flex flex-col h-full">
      <TeammateRevealToast />

      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white rounded-xl px-4 py-2 mb-4 shadow-sm border border-gray-100">
        <div className="text-sm">
          {trumpSuit && (
            <span className={`font-bold ${suitColors[trumpSuit] ?? 'text-gray-800'}`}>
              Trump: {suitSymbols[trumpSuit]}
            </span>
          )}
        </div>
        <div className="text-sm text-center">
          <span className="text-gray-600">Trick {trickNum}</span>
          {current && (
            <span className="text-gray-400 ml-2">
              · {current.name}'s turn
            </span>
          )}
        </div>
        <div className="text-sm text-right">
          <span className="text-gray-600">Bid: {highestBid?.amount}</span>
          <span className="text-gray-400 ml-2">
            · {bidderName}
          </span>
        </div>
      </div>

      {/* Score Bar */}
      <ScoreBar />

      {/* Center: Trick Area */}
      <div className="flex-1 flex items-center justify-center bg-amber-50/60 rounded-xl">
        <TrickArea />
      </div>

      {/* Bottom: My Hand */}
      <div className="mt-4">
        <PlayerHand />
      </div>
    </div>
  );
}
