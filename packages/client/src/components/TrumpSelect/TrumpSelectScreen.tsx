import { useGameStore } from '../../store/gameStore';
import { CardComponent } from '../shared/CardComponent';
import type { Suit } from '@blind-alliance/core';

const suits: { suit: Suit; symbol: string; color: string; bg: string; hover: string }[] = [
  { suit: 'spades', symbol: '♠', color: 'text-gray-800', bg: 'bg-gray-100', hover: 'hover:bg-gray-200' },
  { suit: 'hearts', symbol: '♥', color: 'text-red-500', bg: 'bg-red-50', hover: 'hover:bg-red-100' },
  { suit: 'diamonds', symbol: '♦', color: 'text-orange-500', bg: 'bg-orange-50', hover: 'hover:bg-orange-100' },
  { suit: 'clubs', symbol: '♣', color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100' },
];

export function TrumpSelectScreen() {
  const amIBidder = useGameStore((s) => s.amIBidder);
  const highestBid = useGameStore((s) => s.highestBid);
  const myHand = useGameStore((s) => s.myHand);
  const players = useGameStore((s) => s.players);
  const bidderId = useGameStore((s) => s.bidderId);
  const selectTrump = useGameStore((s) => s.selectTrump);

  const isBidder = amIBidder();
  const bidderName = players.find((p) => p.id === bidderId)?.name ?? 'Bidder';

  return (
    <div className="space-y-6">
      {isBidder ? (
        <>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 text-gray-800">
              You won the bid with {highestBid?.amount} points!
            </h2>
            <p className="text-gray-500">Choose your trump suit</p>
          </div>

          {/* Suit buttons */}
          <div className="flex justify-center gap-4">
            {suits.map(({ suit, symbol, color, bg, hover }) => (
              <button
                key={suit}
                onClick={() => selectTrump(suit)}
                className={`w-28 h-32 ${bg} ${hover} border-2 border-gray-200 hover:ring-4 hover:ring-amber-400 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm`}
              >
                <span className={`text-5xl ${color}`}>{symbol}</span>
                <span className="text-sm text-gray-500 mt-1 capitalize">{suit}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2 text-gray-800">
            {bidderName} won the bid with {highestBid?.amount} points
          </h2>
          <p className="text-gray-500">Waiting for {bidderName} to choose trump suit...</p>
        </div>
      )}

      {/* My hand (read-only) */}
      <div>
        <h3 className="text-lg font-bold mb-3">Your Hand</h3>
        <div className="flex flex-wrap gap-2">
          {myHand.map((card, i) => (
            <CardComponent key={i} card={card} disabled />
          ))}
        </div>
      </div>
    </div>
  );
}
