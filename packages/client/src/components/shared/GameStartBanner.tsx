import { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import type { Suit } from '@blind-alliance/core';
import type { GameStartInfo } from '../../store/gameStore';

const DURATION_MS = 10000;

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

function suitName(suit: Suit): string {
  return { spades: 'Spades', hearts: 'Hearts', diamonds: 'Diamonds', clubs: 'Clubs' }[suit];
}

function conditionLabel(c: GameStartInfo['conditions'][number]): string {
  if (c.type === 'first_trick_win') return 'Wins the first trick';
  const instance = c.instance === 2 ? '2nd' : '1st';
  const instanceLabel = c.instance ? `${instance} ` : '';
  return `Plays ${instanceLabel}${c.rank}${suitSymbol(c.suit!)}`;
}

export function GameStartBanner() {
  const info = useGameStore((s) => s.gameStartInfo);
  const show = useGameStore((s) => s.showGameStartBanner);
  const dismiss = useGameStore((s) => s.dismissGameStartBanner);

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!show || !info) return;

    // Trigger slide-in on next frame
    const showTimer = setTimeout(() => setVisible(true), 50);

    // Countdown progress bar
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining === 0) clearInterval(progressInterval);
    }, 50);

    // Slide out then dismiss
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(dismiss, 400);
    }, DURATION_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearInterval(progressInterval);
    };
  }, [show, info, dismiss]);

  if (!show || !info) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{
        transform: visible ? 'translateY(0)' : 'translateY(-110%)',
        transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
    >
      <div
        className="pointer-events-auto mx-4 mt-3 w-full bg-white rounded-2xl shadow-2xl border-2 border-amber-200 overflow-hidden"
        style={{ maxWidth: '32rem' }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-amber-100">
          <div
            className="h-full bg-amber-400"
            style={{ width: `${progress}%`, transition: 'none' }}
          />
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800" style={{ fontSize: '1.1rem' }}>
              Game Starting
            </h2>
            <span className="text-xs text-gray-400">{Math.ceil(progress / 10)}s</span>
          </div>

          {/* Trump suit */}
          <div className="flex items-center gap-3 bg-amber-50 rounded-xl px-4 py-3">
            <span
              className={`font-black ${suitColor(info.trumpSuit)}`}
              style={{ fontSize: '2.5rem', lineHeight: 1 }}
            >
              {suitSymbol(info.trumpSuit)}
            </span>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Trump Suit</p>
              <p className={`font-bold text-lg capitalize ${suitColor(info.trumpSuit)}`}>
                {suitName(info.trumpSuit)}
              </p>
            </div>
          </div>

          {/* Bidder + amount + teammate count */}
          <div className="flex gap-3">
            <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Bidder</p>
              <p className="font-bold text-gray-800 truncate">{info.bidderName}</p>
              <p className="text-sm text-amber-600 font-semibold">Bid: {info.bidAmount}</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Teammates</p>
              <p className="font-bold text-gray-800" style={{ fontSize: '1.5rem' }}>
                {info.teammateCount}
              </p>
              <p className="text-xs text-gray-500">
                secret {info.teammateCount === 1 ? 'ally' : 'allies'}
              </p>
            </div>
          </div>

          {/* Teammate conditions */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
              Teammate Conditions
            </p>
            <div className="space-y-1.5">
              {info.conditions.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2"
                >
                  <span className="text-yellow-500 text-sm">⚑</span>
                  <span className="text-sm text-gray-700 font-medium">{conditionLabel(c)}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 italic">
              Teammates are revealed when these conditions are met
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
