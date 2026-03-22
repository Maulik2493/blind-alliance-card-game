import { useGameStore } from '../../store/gameStore';
import { TrickArea } from './TrickArea';
import { PlayerHand } from './PlayerHand';
import { TeammateRevealToast } from './TeammateRevealToast';

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
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const bidderTeamTotal = useGameStore((s) => s.bidderTeamTotal);
  const oppositionTeamTotal = useGameStore((s) => s.oppositionTeamTotal);
  const isMyTurn = useGameStore((s) => s.isMyTurn)();

  const current = currentPlayer();
  const trickNum = tricks.length + (currentTrick ? 1 : 0);

  return (
    <div className="flex flex-col h-full pb-14 md:pb-0">
      <TeammateRevealToast />

      {/* Top Bar — compact on mobile */}
      <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200 shadow-sm text-sm md:text-base shrink-0">
        {trumpSuit ? (
          <span className={`font-bold text-lg ${suitColors[trumpSuit] ?? 'text-gray-800'}`}>
            {suitSymbols[trumpSuit]} Trump
          </span>
        ) : (
          <span className="text-gray-400 text-sm">No trump yet</span>
        )}
        <span className="text-gray-600 text-xs md:text-sm font-medium">
          Trick {trickNum}
        </span>
        <span className="text-xs text-gray-500">
          Bid: <b>{highestBid?.amount ?? '—'}</b>
        </span>
      </div>

      {/* Whose turn — mobile only banner */}
      <div className="md:hidden px-3 py-2 text-center shrink-0 bg-amber-50 border-b border-amber-100">
        {isMyTurn ? (
          <span className="text-green-600 font-bold text-sm">
            ✓ Your turn — tap a card to play
          </span>
        ) : (
          <span className="text-gray-500 text-sm">
            Waiting for {current?.name}...
          </span>
        )}
      </div>

      {/* Center: Trick Area */}
      <div className="flex-1 flex items-center justify-center p-2 md:p-6 bg-amber-50 min-h-0 overflow-hidden">
        <TrickArea />
      </div>

      {/* Score bar — compact on mobile */}
      <div className="shrink-0 px-3 py-2 bg-white border-t border-gray-200 flex justify-between text-xs md:text-sm">
        <span className="text-gray-600">
          Bidder: <b className="text-amber-600">{bidderTeamTotal}</b>
          /{highestBid?.amount ?? '—'}
        </span>
        <span className="text-gray-600">
          Opposition:{' '}
          <b className={oppositionTeamTotal !== null ? 'text-red-500' : 'text-gray-400'}>
            {oppositionTeamTotal !== null ? oppositionTeamTotal : '?'}
          </b>
        </span>
      </div>

      {/* Bottom: My Hand */}
      <div className="shrink-0 bg-white border-t border-gray-100 p-2">
        <PlayerHand />
      </div>
    </div>
  );
}
