import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CardComponent } from '../shared/CardComponent';
import { nextValidBid } from '@blind-alliance/core';

export function BiddingScreen() {
  const players = useGameStore((s) => s.players);
  const myHand = useGameStore((s) => s.myHand);
  const bids = useGameStore((s) => s.bids);
  const highestBid = useGameStore((s) => s.highestBid);
  const minBid = useGameStore((s) => s.minBid);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const deckCount = useGameStore((s) => s.deckCount);
  const placeBid = useGameStore((s) => s.placeBid);
  const passBid = useGameStore((s) => s.passBid);

  const myTurn = isMyTurn();
  const current = currentPlayer();
  const minimumBid = nextValidBid(highestBid?.amount ?? null, deckCount as 1 | 2);
  const [bidAmount, setBidAmount] = useState(minimumBid);

  // Keep bidAmount in sync with minimumBid changes
  if (bidAmount < minimumBid) {
    setBidAmount(minimumBid);
  }

  return (
    <div className="flex gap-8 h-full">
      {/* Left: My Hand */}
      <div className="flex-1">
        <h2 className="text-lg font-bold mb-3">Your Hand</h2>
        <div className="flex flex-wrap gap-2">
          {myHand.map((card, i) => (
            <CardComponent key={i} card={card} disabled />
          ))}
        </div>
      </div>

      {/* Right: Bidding Panel */}
      <div className="w-80 bg-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold">Bidding</h2>

        <div className="text-sm text-gray-300">
          <p>
            Current highest bid:{' '}
            <span className="text-yellow-400 font-bold">
              {highestBid?.amount ?? 'None'}
            </span>
          </p>
          <p className="text-gray-500">Minimum bid: {minBid}</p>
        </div>

        {/* Bid history */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {bids.map((bid, i) => {
            const name = players.find((p) => p.id === bid.playerId)?.name ?? bid.playerId;
            const isHighest =
              highestBid && bid.playerId === highestBid.playerId && bid.amount === highestBid.amount;
            return (
              <div
                key={i}
                className={`text-sm px-2 py-1 rounded ${
                  isHighest ? 'bg-yellow-600/20 text-yellow-400' : 'text-gray-300'
                }`}
              >
                {name}: {bid.amount === 0 ? 'PASS' : bid.amount}
              </div>
            );
          })}
        </div>

        {/* My turn controls */}
        {myTurn ? (
          <div className="space-y-3 border-t border-gray-700 pt-3">
            <p className="text-green-400 font-semibold text-sm">Your turn to bid!</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(Math.max(minimumBid, parseInt(e.target.value) || minimumBid))}
                min={minimumBid}
                step={5}
                className="w-24 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => {
                  if (bidAmount % 5 !== 0) return;
                  placeBid(bidAmount);
                }}
                disabled={bidAmount % 5 !== 0 || bidAmount < minimumBid}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Place Bid
              </button>
            </div>
            <button
              onClick={() => passBid()}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white font-semibold py-2 rounded-lg transition-colors cursor-pointer"
            >
              Pass
            </button>
          </div>
        ) : (
          <div className="border-t border-gray-700 pt-3">
            <p className="text-gray-400 text-sm">
              Waiting for <span className="text-white font-semibold">{current?.name ?? '...'}</span> to bid...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
