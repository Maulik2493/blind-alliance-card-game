import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { PlayerHand } from '../GameTable/PlayerHand';
import type { Suit, Rank } from '@blind-alliance/core';
import type { TeammateCondition, CardRevealCondition, FirstTrickWinCondition } from '@blind-alliance/core';

const SUIT_LABELS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const ALL_SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

interface ConditionSlot {
  mode: 'card_reveal' | 'first_trick_win';
  suit?: Suit;
  rank?: Rank;
  instance?: 1 | 2;
}

export function TeammateSelectScreen() {
  const amIBidder = useGameStore((s) => s.amIBidder);
  const maxTeammateCount = useGameStore((s) => s.maxTeammateCount);
  const deckCount = useGameStore((s) => s.deckCount);
  const availableConditionCards = useGameStore((s) => s.availableConditionCards);
  const trumpSuit = useGameStore((s) => s.trumpSuit);
  const players = useGameStore((s) => s.players);
  const bidderId = useGameStore((s) => s.bidderId);
  const setTeammateConditions = useGameStore((s) => s.setTeammateConditions);

  const isBidder = amIBidder();
  const bidderName = players.find((p) => p.id === bidderId)?.name ?? 'Bidder';
  const available = availableConditionCards();

  const [slots, setSlots] = useState<ConditionSlot[]>(() =>
    Array.from({ length: maxTeammateCount }, () => ({ mode: 'card_reveal' })),
  );

  // Auto-skip if 0 teammates needed
  useEffect(() => {
    if (isBidder && maxTeammateCount === 0) {
      setTeammateConditions([]);
    }
  }, [isBidder, maxTeammateCount, setTeammateConditions]);

  const updateSlot = useCallback((index: number, patch: Partial<ConditionSlot>) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  }, []);

  const ranksForSuit = (suit: Suit) =>
    available.filter((c) => c.suit === suit).map((c) => c.rank);

  const instancesForCard = (suit: Suit, rank: Rank) => {
    const card = available.find((c) => c.suit === suit && c.rank === rank);
    return card?.availableInstances ?? [];
  };

  // Check for duplicate conditions
  const getDuplicateError = (index: number): string | null => {
    const slot = slots[index];
    if (!slot || slot.mode !== 'card_reveal' || !slot.suit || !slot.rank) return null;
    for (let i = 0; i < slots.length; i++) {
      if (i === index) continue;
      const other = slots[i];
      if (!other) continue;
      if (
        other.mode === 'card_reveal' &&
        other.suit === slot.suit &&
        other.rank === slot.rank &&
        other.instance === slot.instance
      ) {
        return 'Duplicate condition';
      }
    }
    return null;
  };

  const isSlotValid = (slot: ConditionSlot, index: number): boolean => {
    if (slot.mode === 'first_trick_win') return true;
    if (!slot.suit || !slot.rank) return false;
    if (deckCount === 2) {
      const instances = instancesForCard(slot.suit, slot.rank);
      if (instances.length === 2 && !slot.instance) return false;
    }
    return !getDuplicateError(index);
  };

  const allValid = slots.every((s, i) => isSlotValid(s, i));

  const handleSubmit = () => {
    const conditions: TeammateCondition[] = slots.map((slot) => {
      if (slot.mode === 'first_trick_win') {
        return {
          type: 'first_trick_win',
          satisfied: false,
          collapsed: false,
          satisfiedByPlayerId: null,
        } as FirstTrickWinCondition;
      }
      return {
        type: 'card_reveal',
        suit: slot.suit!,
        rank: slot.rank!,
        instance: slot.instance ?? 1,
        satisfied: false,
        collapsed: false,
        satisfiedByPlayerId: null,
      } as CardRevealCondition;
    });
    setTeammateConditions(conditions);
  };

  if (!isBidder) {
    return (
      <div className="space-y-6 pb-16 md:pb-0">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Teammate Selection</h2>
          <p className="text-gray-400">Waiting for {bidderName} to select teammate conditions...</p>
        </div>
        <div>
          <PlayerHand disabled />
        </div>
      </div>
    );
  }

  if (maxTeammateCount === 0) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">No Teammates</h2>
        <p className="text-gray-400">You're playing solo (3-player game)</p>
      </div>
    );
  }

  return (
    <div className="pb-16 md:pb-0 space-y-4 overflow-hidden w-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Select Teammate Conditions</h2>
        <p className="text-gray-500">
          Trump: <span className="text-amber-600">{trumpSuit && SUIT_LABELS[trumpSuit]}</span>
          {' · '}Choose {maxTeammateCount} condition{maxTeammateCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* My hand */}
      <div>
        <PlayerHand disabled />
      </div>

      {/* Condition slots */}
      <div className="space-y-4">
        {slots.map((slot, index) => {
          const dupError = getDuplicateError(index);
          const ftwUsedElsewhere = slots.some(
            (s, i) => i !== index && s.mode === 'first_trick_win',
          );
          return (
            <div key={index} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 font-semibold">Slot {index + 1}</span>
              </div>

              {/* Mode toggle — large tap-friendly buttons */}
              <div className="flex rounded-xl overflow-hidden border-2 border-amber-200">
                <button
                  onClick={() =>
                    updateSlot(index, {
                      mode: 'card_reveal',
                      suit: undefined,
                      rank: undefined,
                      instance: undefined,
                    })
                  }
                  className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                    slot.mode === 'card_reveal'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-gray-600'
                  }`}
                >
                  Card Reveal
                </button>
                <button
                  onClick={() =>
                    updateSlot(index, {
                      mode: 'first_trick_win',
                      suit: undefined,
                      rank: undefined,
                      instance: undefined,
                    })
                  }
                  disabled={ftwUsedElsewhere}
                  className={`flex-1 py-3 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    slot.mode === 'first_trick_win'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-gray-600'
                  }`}
                >
                  First Trick Win
                </button>
              </div>

              {slot.mode === 'card_reveal' && (
                <div className="space-y-3 w-full overflow-hidden">
                  {/* Suit */}
                  <div className="w-full">
                    <label className="text-xs text-gray-500 mb-1 block">Suit</label>
                    <select
                      value={slot.suit ?? ''}
                      onChange={(e) =>
                        updateSlot(index, {
                          suit: e.target.value as Suit,
                          rank: undefined,
                          instance: undefined,
                        })
                      }
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                      size={1}
                    >
                      <option value="" disabled>Select suit...</option>
                      {ALL_SUITS.map((s) => (
                        <option key={s} value={s}>
                          {SUIT_LABELS[s]} {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Rank */}
                  {slot.suit && (
                    <div className="w-full">
                      <label className="text-xs text-gray-500 mb-1 block">Rank</label>
                      <select
                        value={slot.rank?.toString() ?? ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          const rank = isNaN(Number(v)) ? v : Number(v);
                          updateSlot(index, { rank: rank as Rank, instance: undefined });
                        }}
                        className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                        size={1}
                      >
                        <option value="" disabled>Select rank...</option>
                        {ranksForSuit(slot.suit).map((r) => (
                          <option key={String(r)} value={String(r)}>
                            {r}{r === 'A' ? ' (Ace)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Instance (2-deck only) */}
                  {slot.suit && slot.rank && deckCount === 2 && (() => {
                    const instances = instancesForCard(slot.suit, slot.rank);
                    if (instances.length < 2) return null;
                    return (
                      <div className="w-full">
                        <label className="text-xs text-gray-500 mb-1 block">Instance</label>
                        <select
                          value={slot.instance?.toString() ?? ''}
                          onChange={(e) =>
                            updateSlot(index, { instance: parseInt(e.target.value) as 1 | 2 })
                          }
                          className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-base bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                          size={1}
                        >
                          <option value="" disabled>Select instance...</option>
                          <option value="1">1st play</option>
                          <option value="2">2nd play</option>
                        </select>
                      </div>
                    );
                  })()}
                </div>
              )}

              {slot.mode === 'first_trick_win' && (
                <p className="text-gray-500 text-sm">Whoever wins trick 1 becomes your teammate</p>
              )}

              {dupError && (
                <p className="text-red-500 text-sm">{dupError}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-14 md:static px-0 py-3">
        <button
          onClick={handleSubmit}
          disabled={!allValid}
          className="w-full md:w-auto py-4 md:py-2 px-6 text-base font-bold text-white rounded-xl transition-colors bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Confirm Teammates
        </button>
      </div>
    </div>
  );
}
