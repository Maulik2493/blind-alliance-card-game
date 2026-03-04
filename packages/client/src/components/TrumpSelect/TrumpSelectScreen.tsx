import { useGameStore } from '../../store/gameStore';
import { CardComponent } from '../shared/CardComponent';
import type { Suit } from '@blind-alliance/core';

const suits: { suit: Suit; symbol: string; color: string }[] = [
  { suit: 'spades', symbol: '♠', color: 'text-white' },
  { suit: 'hearts', symbol: '♥', color: 'text-red-400' },
  { suit: 'diamonds', symbol: '♦', color: 'text-red-400' },
  { suit: 'clubs', symbol: '♣', color: 'text-white' },
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
            <h2 className="text-2xl font-bold mb-2">
              You won the bid with {highestBid?.amount} points!
            </h2>
            <p className="text-gray-400">Choose your trump suit</p>
          </div>

          {/* Suit buttons */}
          <div className="flex justify-center gap-4">
            {suits.map(({ suit, symbol, color }) => (
              <button
                key={suit}
                onClick={() => selectTrump(suit)}
                className={`w-24 h-28 bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-blue-500 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer`}
              >
                <span className={`text-4xl ${color}`}>{symbol}</span>
                <span className="text-sm text-gray-300 mt-1 capitalize">{suit}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">
            {bidderName} won the bid with {highestBid?.amount} points
          </h2>
          <p className="text-gray-400">Waiting for {bidderName} to choose trump suit...</p>
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
