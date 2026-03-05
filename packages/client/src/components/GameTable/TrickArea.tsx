import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CardComponent } from '../shared/CardComponent';
import type { TrickPlay } from '@blind-alliance/core';

export function TrickArea() {
  const currentTrick = useGameStore((s) => s.currentTrick);
  const tricks = useGameStore((s) => s.tricks);
  const players = useGameStore((s) => s.players);

  const [displayedPlays, setDisplayedPlays] = useState<TrickPlay[]>([]);
  const [trickWinner, setTrickWinner] = useState<string | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any running hold timer whenever dependencies change
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    if (currentTrick && currentTrick.plays.length > 0) {
      // Active trick: show plays as they arrive
      setTrickWinner(null);
      setDisplayedPlays(currentTrick.plays);
    } else if (!currentTrick && tricks.length > 0) {
      // Trick just completed: the server sets currentTrick to null and pushes
      // the resolved trick (with all plays + winnerId) into tricks[].
      // Show the completed trick for 2 seconds so the last card is visible.
      const lastTrick = tricks[tricks.length - 1]!;
      setDisplayedPlays(lastTrick.plays);
      setTrickWinner(lastTrick.winnerId);

      holdTimerRef.current = setTimeout(() => {
        setDisplayedPlays([]);
        setTrickWinner(null);
        holdTimerRef.current = null;
      }, 2000);
    }

    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, [currentTrick, currentTrick?.plays.length, tricks.length]);

  if (displayedPlays.length === 0) {
    return (
      <div className="text-gray-500 text-center">
        Waiting for first card...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {trickWinner && (
        <div className="text-center font-bold text-green-600 text-lg mb-2 animate-pulse">
          {players.find((p) => p.id === trickWinner)?.name ?? trickWinner} wins this trick!
        </div>
      )}
      <div className="flex gap-4 justify-center items-end">
        {displayedPlays.map((play, i) => {
          const playerName = players.find((p) => p.id === play.playerId)?.name ?? play.playerId;
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <CardComponent card={play.card} />
              <span className="text-xs text-gray-400">{playerName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
