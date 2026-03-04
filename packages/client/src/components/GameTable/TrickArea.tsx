import { useGameStore } from '../../store/gameStore';
import { CardComponent } from '../shared/CardComponent';

export function TrickArea() {
  const currentTrick = useGameStore((s) => s.currentTrick);
  const players = useGameStore((s) => s.players);

  if (!currentTrick || currentTrick.plays.length === 0) {
    return (
      <div className="text-gray-500 text-center">
        Waiting for first card...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 justify-center items-end">
        {currentTrick.plays.map((play, i) => {
          const playerName = players.find((p) => p.id === play.playerId)?.name ?? play.playerId;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <CardComponent card={play.card} />
              <span className="text-xs text-gray-400">{playerName}</span>
            </div>
          );
        })}
      </div>
      {currentTrick.winnerId && (
        <div className="text-center text-green-400 font-bold text-lg animate-pulse">
          Trick won by {players.find((p) => p.id === currentTrick.winnerId)?.name ?? currentTrick.winnerId}!
        </div>
      )}
    </div>
  );
}
