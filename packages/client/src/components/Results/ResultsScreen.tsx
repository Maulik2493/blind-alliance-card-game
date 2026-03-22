import { useGameStore } from '../../store/gameStore';

export function ResultsScreen() {
  const winner = useGameStore((s) => s.winner);
  const bidderTeamScore = useGameStore((s) => s.bidderTeamScore);
  const oppositionTeamScore = useGameStore((s) => s.oppositionTeamScore);
  const highestBid = useGameStore((s) => s.highestBid);
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const bidderId = useGameStore((s) => s.bidderId);
  const roomId = useGameStore((s) => s.roomId);
  const requestRematch = useGameStore((s) => s.requestRematch);

  const isHost = players.length > 0 && players[0]?.id === myPlayerId;

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
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full shadow-lg border border-gray-100 space-y-6">
        {/* Header */}
        <div className="text-center">
          {winner === 'bidder_team' ? (
            <h1 className="text-4xl font-bold text-green-600">
              🏆 Bidder's Team Wins!
            </h1>
          ) : (
            <h1 className="text-4xl font-bold text-red-500">
              Bidder's Team Failed
            </h1>
          )}
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-2 gap-6">
          {/* Bidder's Team */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h3 className="text-blue-600 font-bold mb-3 text-center">Bidder's Team</h3>
            <div className="space-y-1">
              {bidderTeam.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className={p.id === myPlayerId ? 'text-amber-600 font-semibold' : 'text-gray-700'}>
                    {p.name}
                    {p.id === bidderId && ' ★'}
                    {p.id === myPlayerId && ' (you)'}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-3 pt-2 space-y-1 text-sm">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-blue-600">{bidderTeamScore}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Bid:</span>
                <span>{bidAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Result:</span>
                <span className={bidMet ? 'text-green-600' : 'text-red-500'}>
                  {bidMet ? 'Met ✓' : 'Failed ✕'}
                </span>
              </div>
            </div>
          </div>

          {/* Opposition Team */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h3 className="text-red-500 font-bold mb-3 text-center">Opposition Team</h3>
            <div className="space-y-1">
              {oppositionTeam.map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className={p.id === myPlayerId ? 'text-amber-600 font-semibold' : 'text-gray-700'}>
                    {p.name}
                    {p.id === myPlayerId && ' (you)'}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 mt-3 pt-2 text-sm">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-red-500">{oppositionTeamScore}</span>
              </div>
            </div>
          </div>
        </div>

        {/* My Result */}
        <div className="text-center">
          <p className={`text-lg font-semibold ${isWinner ? 'text-green-600' : 'text-red-500'}`}>
            You were on the {isWinner ? 'winning' : 'losing'} team
            ({myPlayer?.team === 'bidder' ? 'Bidder' : 'Opposition'})
          </p>
        </div>

        {/* Play Again */}
        <div className="mt-6 space-y-3">
          {isHost ? (
            <button
              onClick={requestRematch}
              className="w-full py-4 text-base font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors active:scale-95 cursor-pointer"
            >
              ↩ Play Again (same room)
            </button>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              Waiting for host to start a new game...
            </div>
          )}

          {roomId && (
            <div className="text-center">
              <p className="text-xs text-gray-400 mb-1">Room code</p>
              <p className="text-xl font-bold tracking-widest text-amber-600">
                {roomId}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                New players can join with this code
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
