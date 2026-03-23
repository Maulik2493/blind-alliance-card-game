import { useGameStore } from '../../../store/gameStore';

export function ScoreBar() {
  const bidderTeamTotal = useGameStore((s) => s.bidderTeamTotal);
  const oppositionTeamTotal = useGameStore((s) => s.oppositionTeamTotal);
  const highestBid = useGameStore((s) => s.highestBid);
  const totalPoints = useGameStore((s) => s.totalPoints);
  const tricks = useGameStore((s) => s.tricks);

  const bid = highestBid?.amount ?? 0;
  const progress = bid > 0 ? Math.min(100, (bidderTeamTotal / bid) * 100) : 0;

  // Simple on-track calculation
  const totalTricksPlayed = tricks.length;
  const expectedTotalTricks = totalPoints === 500 ? 17 : 17; // approximate
  const expectedProgress = expectedTotalTricks > 0 && totalTricksPlayed > 0
    ? (totalTricksPlayed / expectedTotalTricks) * 100
    : 0;
  const onTrack = progress >= expectedProgress * 0.8;

  return (
    <div className="bg-white rounded-xl px-4 py-2 mb-4 space-y-1 shadow-sm border border-gray-100">
      <div className="flex justify-between text-sm">
        <span className="text-blue-600">
          Bidder Team: <span className="font-bold">{bidderTeamTotal}</span>
          {bid > 0 && <span className="text-gray-400"> / {bid}</span>}
        </span>
        <span className={oppositionTeamTotal !== null ? 'text-red-500' : 'text-gray-400'}>
          Opposition: <span className="font-bold">{oppositionTeamTotal !== null ? oppositionTeamTotal : '?'}</span>
        </span>
      </div>
      {bid > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
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
