import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CardComponent } from '../shared/CardComponent';
import type { TrickPlay } from '@blind-alliance/core';

export function TrickArea() {
  const currentTrick = useGameStore((s) => s.currentTrick);
  const tricks = useGameStore((s) => s.tricks);
  const players = useGameStore((s) => s.players);
  const trumpSuit = useGameStore((s) => s.trumpSuit);
  const myPlayerId = useGameStore((s) => s.myPlayerId);

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

  // Arc layout calculations — responsive to viewport
  const [dims, setDims] = useState(() => calcDims());

  function calcDims() {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
    const W = Math.min(vw * 0.92, 420);
    const H = W * 0.68;
    return { W, H };
  }

  useEffect(() => {
    const onResize = () => setDims(calcDims());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { W, H } = dims;
  const cx = W / 2;
  const cy = H * 0.55;
  const rx = W * 0.38;
  const ry = H * 0.42;

  const ARC_START = -160;
  const ARC_END = -20;
  const cardW = W * 0.18; // card width = 18% of container
  const cardH = cardW * 1.4;

  function getCardPosition(index: number, total: number) {
    const angle =
      total === 1
        ? -90
        : ARC_START + (index / (total - 1)) * (ARC_END - ARC_START);
    const rad = (angle * Math.PI) / 180;
    return {
      x: cx + rx * Math.cos(rad) - cardW / 2,
      y: cy + ry * Math.sin(rad) - cardH / 2,
      rotate: angle + 90,
    };
  }

  return (
    <div
      className="relative mx-auto w-full"
      style={{ maxWidth: `${W}px`, height: `${H}px` }}
    >
      {/* Center label */}
      <div
        className="absolute text-xs text-gray-400 text-center pointer-events-none"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
      >
        {displayedPlays.length === 0 ? (
          <span>Waiting for first card...</span>
        ) : trickWinner ? (
          <span className="text-green-600 font-bold text-sm animate-pulse">
            {players.find((p) => p.id === trickWinner)?.name} wins!
          </span>
        ) : (
          <span>
            {displayedPlays.length} / {players.length} played
          </span>
        )}
      </div>

      {/* Played cards */}
      {displayedPlays.map((play, index) => {
        const pos = getCardPosition(index, displayedPlays.length);
        const playerName =
          players.find((p) => p.id === play.playerId)?.name ?? '';
        const isWinner = play.playerId === trickWinner;
        const isMyCard = play.playerId === myPlayerId;
        const isTrump = play.card.suit === trumpSuit;

        return (
          <div
            key={play.playOrder}
            className="absolute transition-all duration-300"
            style={{
              '--card-width': `${cardW}px`,
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              transform: `rotate(${pos.rotate * 0.15}deg)`,
              zIndex: isWinner ? 10 : index,
            } as React.CSSProperties}
          >
            {/* Player name label */}
            <div
              className={`text-center text-xs mb-1 font-medium truncate max-w-[64px] ${
                isMyCard ? 'text-amber-600 font-bold' : 'text-gray-500'
              }`}
            >
              {isMyCard ? 'You' : playerName}
            </div>

            {/* Card with winner glow or trump indicator */}
            <div
              className={`rounded-xl transition-all duration-300 ${
                isWinner
                  ? 'ring-4 ring-green-400 ring-offset-2 scale-110 shadow-lg shadow-green-200'
                  : ''
              } ${isTrump && !isWinner ? 'ring-2 ring-amber-300' : ''}`}
            >
              <CardComponent card={play.card} disabled />
            </div>
          </div>
        );
      })}
    </div>
  );
}
