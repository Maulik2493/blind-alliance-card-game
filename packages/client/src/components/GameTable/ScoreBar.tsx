import { useGameStore } from '../../store/gameStore';

export function ScoreBar() {
  const bidderTeamScore = useGameStore((s) => s.bidderTeamScore);
  const oppositionTeamScore = useGameStore((s) => s.oppositionTeamScore);
  const highestBid = useGameStore((s) => s.highestBid);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const tricks = useGameStore((s) => s.tricks);

  const bid = highestBid?.amount ?? 0;
  const progress = bid > 0 ? Math.min(100, (bidderTeamScore / bid) * 100) : 0;

  // Simple on-track calculation
  const totalTricksPlayed = tricks.length;
  const expectedTotalTricks = totalPoints === 500 ? 17 : 17; // approximate
  const expectedProgress = expectedTotalTricks > 0 && totalTricksPlayed > 0
    ? (totalTricksPlayed / expectedTotalTricks) * 100
    : 0;
  const onTrack = progress >= expectedProgress * 0.8;

  return (
    <div className="bg-gray-800 rounded-lg px-4 py-2 mb-4 space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-blue-400">
          Bidder Team: <span className="font-bold">{bidderTeamScore}</span>
          {bid > 0 && <span className="text-gray-500"> / {bid}</span>}
        </span>
        <span className="text-red-400">
          Opposition: <span className="font-bold">{oppositionTeamScore}</span>
        </span>
      </div>
      {bid > 0 && (
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              onTrack ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
