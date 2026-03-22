import { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Suit } from '@blind-alliance/core';

function suitSymbol(suit: Suit): string {
  return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit];
}

function suitColor(suit: Suit): string {
  return {
    spades: 'text-gray-900',
    hearts: 'text-red-500',
    diamonds: 'text-orange-500',
    clubs: 'text-emerald-700',
  }[suit];
}

export function MobileDebugDrawer() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    phase,
    trumpSuit,
    deckCount,
    minBid,
    players,
    myPlayerId,
    bidderId,
    currentTrick,
    teammateConditions,
    bids,
    highestBid,
    bidderTeamTotal,
    oppositionTeamTotal,
    currentPlayerIndex,
  } = useGameStore();

  const isMyTurn = useGameStore((s) => s.isMyTurn)();
  const currentPlayerName = players[currentPlayerIndex]?.name ?? '—';

  return (
    <>
      {/* Collapsed bar (always visible) — two-row layout */}
      <div
        onClick={() => setIsOpen(true)}
        className="fixed bottom-0 left-0 right-0 z-40
                   bg-white border-t-2 border-amber-300 shadow-lg
                   cursor-pointer active:bg-amber-50"
      >
        {/* Row 1: Turn + Trump + expand button */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-amber-100">
          {/* Whose turn */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-gray-500 shrink-0">Turn:</span>
            <span className="text-sm font-bold text-gray-800 truncate">
              {currentPlayerName}
            </span>
            {isMyTurn && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                You!
              </span>
            )}
          </div>

          {/* Trump */}
          {trumpSuit && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-gray-500">Trump:</span>
              <span className={`text-xl font-bold ${suitColor(trumpSuit)}`}>
                {suitSymbol(trumpSuit)}
              </span>
            </div>
          )}

          {/* Expand */}
          <span className="text-amber-400 text-lg font-bold shrink-0 ml-2">⌃</span>
        </div>

        {/* Row 2: Bid winner + Conditions summary + Points */}
        <div className="flex items-center justify-between px-4 py-1.5 text-xs text-gray-600 gap-3">
          {/* Bid winner */}
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-gray-400 shrink-0">Bid:</span>
            <span className="font-semibold truncate">
              {bidderId
                ? `${players.find((p) => p.id === bidderId)?.name} (${highestBid?.amount})`
                : '—'}
            </span>
          </div>

          {/* Conditions summary */}
          {teammateConditions.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-gray-400">Cond:</span>
              <div className="flex gap-0.5">
                {teammateConditions.map((c, i) => (
                  <span
                    key={i}
                    className={`w-2 h-2 rounded-full inline-block ${
                      c.collapsed ? 'bg-red-400' : c.satisfied ? 'bg-green-400' : 'bg-yellow-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Scores */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-blue-500 font-semibold">B:{bidderTeamTotal}</span>
            <span className="text-gray-300">|</span>
            <span className={oppositionTeamTotal !== null
              ? 'text-red-500 font-semibold'
              : 'text-gray-400 font-semibold'
            }>
              O:{oppositionTeamTotal !== null ? oppositionTeamTotal : '?'}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer panel */}
          <div className="fixed bottom-0 left-0 right-0 z-50
                          bg-white rounded-t-2xl shadow-2xl
                          max-h-[75vh] overflow-y-auto
                          border-t-2 border-amber-200">

            {/* Handle + close button */}
            <div className="sticky top-0 bg-white border-b border-gray-100
                            px-4 py-3 flex items-center justify-center relative">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
              <button
                onClick={() => setIsOpen(false)}
                className="absolute right-4 text-gray-400
                           hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Drawer content */}
            <div className="p-4 space-y-5">

              {/* GAME INFO */}
              <section>
                <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-2">Game Info</h3>
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
                    {phase}
                  </span>
                  {trumpSuit && (
                    <span className={`font-bold text-base ${suitColor(trumpSuit)}`}>
                      Trump: {suitSymbol(trumpSuit)}
                    </span>
                  )}
                  <span className="text-gray-600">Decks: {deckCount}</span>
                  <span className="text-gray-600">Min Bid: {minBid}</span>
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  Bidder team: <b>{bidderTeamTotal}</b> pts &nbsp;|&nbsp;
                  Opposition:{' '}
                  <b className={oppositionTeamTotal !== null ? '' : 'text-gray-400'}>
                    {oppositionTeamTotal !== null ? `${oppositionTeamTotal} pts` : 'pending...'}
                  </b>
                </div>
              </section>

              {/* CURRENT TRICK */}
              <section>
                <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-2">Current Trick</h3>
                {currentTrick?.plays.length ? (
                  currentTrick.plays.map((play) => (
                    <div key={play.playOrder} className="text-sm text-gray-700 py-0.5">
                      <span className="font-medium">
                        {players.find((p) => p.id === play.playerId)?.name}:
                      </span>{' '}
                      <span className={suitColor(play.card.suit)}>
                        {play.card.rank}{suitSymbol(play.card.suit)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No trick in progress</p>
                )}
                {currentTrick?.winnerId && (
                  <p className="text-sm font-bold text-green-600 mt-1">
                    Winner: {players.find((p) => p.id === currentTrick.winnerId)?.name}
                  </p>
                )}
              </section>

              {/* TEAMMATE CONDITIONS */}
              <section>
                <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-2">Teammate Conditions</h3>
                {teammateConditions.length === 0 ? (
                  <p className="text-sm text-gray-400">None set</p>
                ) : (
                  teammateConditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-0.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          c.collapsed ? 'bg-red-400' : c.satisfied ? 'bg-green-400' : 'bg-yellow-400'
                        }`}
                      />
                      <span className="text-gray-700">
                        {c.type === 'first_trick_win'
                          ? 'First trick winner'
                          : `${c.instance === 2 ? '2nd' : '1st'} ${c.rank}${suitSymbol(c.suit)}`}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {c.collapsed
                          ? 'collapsed'
                          : c.satisfied
                            ? `→ ${players.find((p) => p.id === c.satisfiedByPlayerId)?.name}`
                            : 'pending'}
                      </span>
                    </div>
                  ))
                )}
              </section>

              {/* PLAYERS */}
              <section>
                <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-2">Players</h3>
                {players.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 py-2 px-2 rounded-lg text-sm mb-1 ${
                      index === currentPlayerIndex ? 'bg-amber-50 border border-amber-200' : ''
                    }`}
                  >
                    {/* Turn indicator */}
                    <span className="w-3 shrink-0">
                      {index === currentPlayerIndex ? (
                        <span className="text-amber-500 text-xs">▶</span>
                      ) : null}
                    </span>

                    {/* Team colour dot */}
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        player.team === 'bidder'
                          ? 'bg-blue-400'
                          : player.team === 'opposition'
                            ? 'bg-red-400'
                            : 'bg-gray-300'
                      }`}
                    />

                    {/* Name */}
                    <span className="flex-1 truncate font-medium">
                      {player.name}
                      {player.id === myPlayerId && (
                        <span className="text-xs text-gray-400 ml-1">(you)</span>
                      )}
                    </span>

                    {/* Bidder star */}
                    {player.id === bidderId && (
                      <span className="text-xs text-amber-600 shrink-0">★</span>
                    )}

                    {/* Cards remaining */}
                    <span className="text-xs text-gray-400 shrink-0">
                      {player.cardCount}🃏
                    </span>

                    {/* Points collected */}
                    <span
                      className={`text-xs font-bold shrink-0 px-2 py-0.5 rounded-full ${
                        player.team === 'bidder'
                          ? 'bg-blue-50 text-blue-600'
                          : player.team === 'opposition'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {player.collectedPoints ?? 0}pts
                    </span>
                  </div>
                ))}
              </section>

              {/* BID HISTORY */}
              <section>
                <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-2">Bid History</h3>
                {bids.length === 0 ? (
                  <p className="text-sm text-gray-400">No bids yet</p>
                ) : (
                  bids.map((bid, i) => (
                    <div key={i} className="text-sm text-gray-700 py-0.5 flex justify-between">
                      <span>{players.find((p) => p.id === bid.playerId)?.name}</span>
                      <span className={bid.amount ? 'font-bold text-amber-600' : 'text-gray-400'}>
                        {bid.amount ? bid.amount : 'Pass'}
                      </span>
                    </div>
                  ))
                )}
              </section>

              {/* Spacer so last section isn't hidden behind collapsed bar */}
              <div className="h-4" />
            </div>
          </div>
        </>
      )}
    </>
  );
}
