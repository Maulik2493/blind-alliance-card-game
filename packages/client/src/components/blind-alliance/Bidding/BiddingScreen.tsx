import { useState, useEffect } from 'react';
import { useGameStore } from '../../../store/gameStore';
import { PlayerHand } from '../../shared/PlayerHand';
import { nextValidBid, getMaxBid } from '@blind-alliance/core';

export function BiddingScreen() {
  const players = useGameStore((s) => s.players);
  const bids = useGameStore((s) => s.bids);
  const highestBid = useGameStore((s) => s.highestBid);
  const minBid = useGameStore((s) => s.minBid);
  const deckCount = useGameStore((s) => s.deckCount);
  const placeBid = useGameStore((s) => s.placeBid);
  const passBid = useGameStore((s) => s.passBid);
  const biddingQueue = useGameStore((s) => s.biddingQueue);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

  const isMyBiddingTurn = biddingQueue[0] === myPlayerId;
  const currentBidderName = players.find((p) => p.id === biddingQueue[0])?.name ?? '...';
  const minimumBid = nextValidBid(highestBid?.amount ?? null, deckCount as 1 | 2);
  const maxBid = getMaxBid(deckCount as 1 | 2);
  const [bidAmount, setBidAmount] = useState(minimumBid);
  const [showHand, setShowHand] = useState(false);
  const [currentBid, setCurrentBid] = useState(minimumBid);

  // Keep bidAmount in sync with minimumBid changes
  if (bidAmount < minimumBid) {
    setBidAmount(minimumBid);
  }

  // Reset currentBid whenever highestBid changes
  useEffect(() => {
    setCurrentBid(nextValidBid(highestBid?.amount ?? null, deckCount as 1 | 2));
  }, [highestBid?.amount, deckCount]);

  const passedPlayerIds = players
    .filter((p) => !biddingQueue.includes(p.id))
    .map((p) => p.id);

  return (
    <div className="flex flex-col md:flex-row gap-4 pb-16 md:pb-0">
      {/* Left/Top: My Hand */}
      <div className="md:flex-1">
        <button
          className="md:hidden text-sm text-amber-600 underline mb-2 block"
          onClick={() => setShowHand(!showHand)}
        >
          {showHand ? 'Hide my hand ▲' : 'Show my hand ▼'}
        </button>
        <div className={`w-full ${showHand ? 'block' : 'hidden md:block'}`}>
          <PlayerHand disabled />
        </div>
      </div>

      {/* Right/Bottom: Bidding Panel */}
      <div className="md:w-80 bg-white rounded-2xl p-4 md:p-6 space-y-4 shadow border border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">Bidding</h2>

        <div className="text-sm text-gray-600">
          <p>
            Current highest bid:{' '}
            <span className="text-amber-600 font-bold">
              {highestBid?.amount ?? 'None'}
            </span>
          </p>
          <p className="text-gray-400">Minimum bid: {minBid}</p>
        </div>

        {/* Queue status */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Still Bidding ({biddingQueue.length} players)
          </p>
          {biddingQueue.map((playerId, index) => {
            const player = players.find((p) => p.id === playerId);
            const isCurrentBidder = index === 0;
            const isMe = playerId === myPlayerId;
            return (
              <div
                key={playerId}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  isCurrentBidder
                    ? 'bg-amber-100 border border-amber-300 font-bold'
                    : 'bg-gray-50'
                }`}
              >
                {isCurrentBidder && (
                  <span className="text-amber-500 text-xs">▶</span>
                )}
                <span className={isMe ? 'text-amber-600' : 'text-gray-700'}>
                  {player?.name ?? playerId}
                  {isMe ? ' (you)' : ''}
                </span>
                {isCurrentBidder && (
                  <span className="ml-auto text-xs text-amber-500 font-medium">
                    Bidding now
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Passed players */}
        {passedPlayerIds.length > 0 && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Passed</p>
            <div className="flex flex-wrap gap-2">
              {passedPlayerIds.map((id) => (
                <span
                  key={id}
                  className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded-full line-through"
                >
                  {players.find((p) => p.id === id)?.name}
                </span>
              ))}
            </div>
          </div>
        )}

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
                  isHighest ? 'bg-amber-50 text-amber-600 font-semibold' : 'text-gray-600'
                }`}
              >
                {name}: {bid.amount === null ? 'PASS' : bid.amount}
              </div>
            );
          })}
        </div>

        {/* My turn controls */}
        {isMyBiddingTurn ? (
          <div className="space-y-3 border-t border-gray-200 pt-3">
            <p className="text-green-600 font-semibold text-sm">Your turn to bid!</p>

            {/* Desktop: number input */}
            <div className="hidden md:block">
              <input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(Math.min(maxBid, Math.max(minimumBid, parseInt(e.target.value) || minimumBid)))}
                min={minimumBid}
                max={maxBid}
                step={5}
                className="w-full text-center text-2xl font-bold border-2 border-amber-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              />
              <div className="flex flex-row gap-2 mt-3">
                <button
                  onClick={() => {
                    if (bidAmount % 5 !== 0) return;
                    placeBid(bidAmount);
                  }}
                  disabled={bidAmount % 5 !== 0 || bidAmount < minimumBid || bidAmount > maxBid}
                  className="flex-1 py-2 text-base font-bold bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors cursor-pointer"
                >
                  Place Bid
                </button>
                <button
                  onClick={() => passBid()}
                  className="flex-1 py-2 text-base font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer"
                >
                  Pass
                </button>
              </div>
            </div>

            {/* Mobile: chip-based bid selector */}
            <div className="md:hidden space-y-3">
              <div className="text-center">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Your Bid</span>
                <div className="text-4xl font-bold text-amber-600 my-2">{currentBid}</div>
                <span className="text-xs text-gray-400">Min: {minimumBid}</span>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2 text-center">Add to bid:</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {[5, 10, 25, 50].map((increment) => {
                    const newAmount = currentBid + increment;
                    const disabled = newAmount > maxBid;
                    return (
                      <button
                        key={increment}
                        onClick={() => !disabled && setCurrentBid(newAmount)}
                        disabled={disabled}
                        className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold rounded-xl text-sm transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      +{increment}
                    </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-2 text-center">Remove from bid:</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {[5, 10, 25, 50].map((decrement) => {
                    const newAmount = currentBid - decrement;
                    const disabled = newAmount < minimumBid;
                    return (
                      <button
                        key={decrement}
                        onClick={() => !disabled && setCurrentBid(newAmount)}
                        disabled={disabled}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl text-sm transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        -{decrement}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <button
                  onClick={() => placeBid(currentBid)}
                  className="w-full py-4 text-base font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors active:scale-95 cursor-pointer"
                >
                  Place Bid: {currentBid}
                </button>
                <button
                  onClick={() => passBid()}
                  className="w-full py-4 text-base font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Pass
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-t border-gray-200 pt-3">
            <p className="text-center text-gray-500 py-4">
              Waiting for <span className="text-gray-800 font-semibold">{currentBidderName}</span> to bid...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
