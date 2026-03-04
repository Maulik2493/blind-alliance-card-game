import { useGameStore } from '../../store/gameStore';
import { PhaseLabel } from '../shared/PhaseLabel';

const suitSymbols: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export function DebugPanel() {
  const phase = useGameStore((s) => s.phase);
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const trumpSuit = useGameStore((s) => s.trumpSuit);
  const bidderId = useGameStore((s) => s.bidderId);
  const highestBid = useGameStore((s) => s.highestBid);
  const deckCount = useGameStore((s) => s.deckCount);
  const minBid = useGameStore((s) => s.minBid);
  const bidderTeamScore = useGameStore((s) => s.bidderTeamScore);
  const oppositionTeamScore = useGameStore((s) => s.oppositionTeamScore);
  const currentTrick = useGameStore((s) => s.currentTrick);
  const removedCards = useGameStore((s) => s.removedCards);
  const teammateConditions = useGameStore((s) => s.teammateConditions);
  const bids = useGameStore((s) => s.bids);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);

  return (
    <div className="overflow-y-auto p-3 text-xs font-mono bg-gray-800 space-y-4 flex-1">
      <h2 className="text-sm font-bold text-white">Debug Panel</h2>

      {/* 1. GAME INFO */}
      <section>
        <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-1">Game Info</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <PhaseLabel phase={phase} />
          {trumpSuit && (
            <span className="text-yellow-400">
              Trump: {suitSymbols[trumpSuit]}
            </span>
          )}
          <span className="text-gray-300">Decks: {deckCount}</span>
          <span className="text-gray-300">Min Bid: {minBid}</span>
        </div>
        <div className="mt-1 text-gray-300">
          Bidder: {bidderTeamScore} | Opposition: {oppositionTeamScore}
        </div>
      </section>

      {/* 2. REMOVED CARDS */}
      <section>
        <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-1">Removed Cards</h3>
        {removedCards.length === 0 ? (
          <span className="text-gray-500">None removed</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {removedCards.map((c, i) => (
              <span key={i} className="bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">
                {c.rank}{suitSymbols[c.suit]}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 3. PLAYERS TABLE */}
      <section>
        <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-1">Players</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-500">
              <th className="pr-1"></th>
              <th className="pr-2">Name</th>
              <th className="pr-2">Team</th>
              <th className="pr-2">Cards</th>
              <th className="pr-2">Flags</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              const teamColor =
                p.team === 'bidder' ? 'text-blue-400' :
                p.team === 'opposition' ? 'text-red-400' :
                'text-gray-500';
              const isCurrent = i === currentPlayerIndex;
              const isBidder = p.id === bidderId;
              const isMe = p.id === myPlayerId;
              return (
                <tr key={p.id} className={isMe ? 'bg-gray-700/50' : ''}>
                  <td className="pr-1">{isCurrent ? '→' : ''}</td>
                  <td className="pr-2">{p.name}{isMe ? ' (me)' : ''}</td>
                  <td className={`pr-2 ${teamColor}`}>{p.team}</td>
                  <td className="pr-2">{p.cardCount}</td>
                  <td className="pr-2">
                    {isBidder && '★'}
                    {p.isRevealed && ' ✓'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* 4. CURRENT TRICK */}
      <section>
        <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-1">Current Trick</h3>
        {currentTrick ? (
          <div className="space-y-0.5">
            {currentTrick.plays.map((play, i) => (
              <div key={i} className="text-gray-300">
                {players.find((p) => p.id === play.playerId)?.name ?? play.playerId}:{' '}
                {play.card.rank}{suitSymbols[play.card.suit]} (order: {play.playOrder})
              </div>
            ))}
            {currentTrick.winnerId && (
              <div className="text-green-400 font-bold mt-1">
                Winner: {players.find((p) => p.id === currentTrick.winnerId)?.name ?? currentTrick.winnerId}
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-500">No trick in progress</span>
        )}
      </section>

      {/* 5. TEAMMATE CONDITIONS */}
      <section>
        <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-1">Teammate Conditions</h3>
        {teammateConditions.length === 0 ? (
          <span className="text-gray-500">None set</span>
        ) : (
          <div className="space-y-1">
            {teammateConditions.map((cond, i) => {
              const statusColor = cond.collapsed
                ? 'text-red-400'
                : cond.satisfied
                ? 'text-green-400'
                : 'text-yellow-400';
              const statusText = cond.collapsed
                ? 'COLLAPSED'
                : cond.satisfied
                ? 'SATISFIED'
                : 'PENDING';
              return (
                <div key={i} className={statusColor}>
                  {cond.type === 'card_reveal'
                    ? `${cond.rank}${suitSymbols[cond.suit]} (${cond.instance === 1 ? '1st' : '2nd'})`
                    : 'First trick winner'}{' '}
                  — {statusText}
                  {cond.satisfiedByPlayerId && (
                    <span className="text-gray-400">
                      {' '}by {players.find((p) => p.id === cond.satisfiedByPlayerId)?.name ?? cond.satisfiedByPlayerId}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. BID HISTORY */}
      <section>
        <h3 className="text-gray-400 uppercase text-xs tracking-wider mb-1">Bid History</h3>
        {bids.length === 0 ? (
          <span className="text-gray-500">No bids yet</span>
        ) : (
          <div className="space-y-0.5">
            {bids.map((bid, i) => {
              const name = players.find((p) => p.id === bid.playerId)?.name ?? bid.playerId;
              const isHighest = highestBid && bid.playerId === highestBid.playerId && bid.amount === highestBid.amount;
              return (
                <div key={i} className={isHighest ? 'text-yellow-400' : 'text-gray-300'}>
                  {name}: {bid.amount === 0 ? 'PASS' : bid.amount}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
