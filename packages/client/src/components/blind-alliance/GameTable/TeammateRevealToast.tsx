import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../../store/gameStore';
import type { PublicPlayer } from '../../../store/gameStore';

export function TeammateRevealToast() {
  const players = useGameStore((s) => s.players);
  const [toast, setToast] = useState<{ name: string; team: string } | null>(null);
  const prevPlayersRef = useRef<PublicPlayer[]>([]);

  useEffect(() => {
    const prev = prevPlayersRef.current;
    if (prev.length > 0) {
      for (const player of players) {
        const prevPlayer = prev.find((p) => p.id === player.id);
        if (prevPlayer && !prevPlayer.isRevealed && player.isRevealed) {
          const teamLabel = player.team === 'bidder' ? "Bidder's" : 'Opposition';
          setToast({ name: player.name, team: teamLabel });
          setTimeout(() => setToast(null), 3000);
          break;
        }
      }
    }
    prevPlayersRef.current = players;
  }, [players]);

  if (!toast) return null;

  const bgColor = toast.team === "Bidder's" ? 'bg-blue-600' : 'bg-red-600';

  return (
    <div className={`${bgColor} text-white text-center py-3 px-4 rounded-lg mb-4 font-semibold animate-pulse`}>
      {toast.name} is revealed as {toast.team} teammate!
    </div>
  );
}
