import { useGameStore } from '../../store/gameStore';

export function ResultsScreen() {
  const winner = useGameStore((s) => s.winner);
  const bidderTeamScore = useGameStore((s) => s.bidderTeamScore);
  const oppositionTeamScore = useGameStore((s) => s.oppositionTeamScore);
  const highestBid = useGameStore((s) => s.highestBid);
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const bidderId = useGameStore((s) => s.bidderId);

  const bidderTeam = players.filter((p) => p.team === 'bidder');
  const oppositionTeam = players.filter((p) => p.team === 'opposition');
  const myPlayer = players.find((p) => p.id === myPlayerId);
  const bidAmount = highestBid?.amount ?? 0;
  const bidMet = bidderTeamScore >= bidAmount;

  const isWinner = winner === 'bidder_team'
    ? myPlayer?.team === 'bidder'
    : myPlayer?.team === 'opposition';

  return (
    <div className="min-h-full flex items-center justify-center">
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center">
          {winner === 'bidder_team' ? (
            <h1 className="text-4xl font-bold text-green-400">
              🏆 Bidder's Team Wins!
            </h1>
          ) : (
            <h1 className="text-4xl font-bold text-red-400">
              Bidder's Team Failed
            </h1>
          )}
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-2 gap-6">
          {/* Bidder's Team */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-blue-400 font-bold mb-3 text-center">Bidder's Team</h3>
            <div className="space-y-1">
              {bidderTeam.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className={p.id === myPlayerId ? 'text-yellow-400' : 'text-gray-300'}>
                    {p.name}
                    {p.id === bidderId && ' ★'}
                    {p.id === myPlayerId && ' (you)'}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-600 mt-3 pt-2 space-y-1 text-sm">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-blue-400">{bidderTeamScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bid:</span>
                <span>{bidAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Result:</span>
                <span className={bidMet ? 'text-green-400' : 'text-red-400'}>
                  {bidMet ? 'Met ✓' : 'Failed ✕'}
                </span>
              </div>
            </div>
          </div>

          {/* Opposition Team */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-red-400 font-bold mb-3 text-center">Opposition Team</h3>
            <div className="space-y-1">
              {oppositionTeam.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className={p.id === myPlayerId ? 'text-yellow-400' : 'text-gray-300'}>
                    {p.name}
                    {p.id === myPlayerId && ' (you)'}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-600 mt-3 pt-2 text-sm">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-red-400">{oppositionTeamScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* My Result */}
        <div className="text-center">
          <p className={`text-lg font-semibold ${isWinner ? 'text-green-400' : 'text-red-400'}`}>
            You were on the {isWinner ? 'winning' : 'losing'} team
            ({myPlayer?.team === 'bidder' ? 'Bidder' : 'Opposition'})
          </p>
        </div>

        {/* Play Again */}
        <div className="text-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors cursor-pointer text-lg"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
}
