import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CardComponent } from '../shared/CardComponent';
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
  const myHand = useGameStore((s) => s.myHand);
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
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Teammate Selection</h2>
          <p className="text-gray-400">Waiting for {bidderName} to select teammate conditions...</p>
        </div>
        <div>
          <h3 className="text-lg font-bold mb-3">Your Hand</h3>
          <div className="flex flex-wrap gap-2">
            {myHand.map((card, i) => (
              <CardComponent key={i} card={card} disabled />
            ))}
          </div>
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
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-1">Select Teammate Conditions</h2>
        <p className="text-gray-400">
          Trump: <span className="text-yellow-400">{trumpSuit && SUIT_LABELS[trumpSuit]}</span>
          {' · '}Choose {maxTeammateCount} condition{maxTeammateCount > 1 ? 's' : ''}
        </p>
      </div>

      {/* My hand */}
      <div>
        <h3 className="text-lg font-bold mb-3">Your Hand</h3>
        <div className="flex flex-wrap gap-2">
          {myHand.map((card, i) => (
            <CardComponent key={i} card={card} disabled />
          ))}
        </div>
      </div>

      {/* Condition slots */}
      <div className="space-y-4">
        {slots.map((slot, index) => {
          const dupError = getDuplicateError(index);
          const ftwUsedElsewhere = slots.some(
            (s, i) => i !== index && s.mode === 'first_trick_win',
          );
          return (
            <div key={index} className="bg-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 font-semibold">Slot {index + 1}</span>
                <select
                  value={slot.mode}
                  onChange={(e) =>
                    updateSlot(index, {
                      mode: e.target.value as 'card_reveal' | 'first_trick_win',
                      suit: undefined,
                      rank: undefined,
                      instance: undefined,
                    })
                  }
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                >
                  <option value="card_reveal">Card Reveal</option>
                  <option value="first_trick_win" disabled={ftwUsedElsewhere}>First Trick Win</option>
                </select>
              </div>

              {slot.mode === 'card_reveal' && (
                <div className="flex gap-3 flex-wrap items-center">
                  {/* Suit */}
                  <select
                    value={slot.suit ?? ''}
                    onChange={(e) =>
                      updateSlot(index, {
                        suit: e.target.value as Suit,
                        rank: undefined,
                        instance: undefined,
                      })
                    }
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                  >
                    <option value="">Suit...</option>
                    {ALL_SUITS.map((s) => (
                      <option key={s} value={s}>
                        {SUIT_LABELS[s]} {s}
                      </option>
                    ))}
                  </select>

                  {/* Rank */}
                  {slot.suit && (
                    <select
                      value={slot.rank?.toString() ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        const rank = isNaN(Number(v)) ? v : Number(v);
                        updateSlot(index, { rank: rank as Rank, instance: undefined });
                      }}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                    >
                      <option value="">Rank...</option>
                      {ranksForSuit(slot.suit).map((r) => (
                        <option key={String(r)} value={String(r)}>
                          {r}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Instance (2-deck only) */}
                  {slot.suit && slot.rank && deckCount === 2 && (() => {
                    const instances = instancesForCard(slot.suit, slot.rank);
                    if (instances.length < 2) return null;
                    return (
                      <select
                        value={slot.instance?.toString() ?? ''}
                        onChange={(e) =>
                          updateSlot(index, { instance: parseInt(e.target.value) as 1 | 2 })
                        }
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm"
                      >
                        <option value="">Instance...</option>
                        <option value="1">1st play</option>
                        <option value="2">2nd play</option>
                      </select>
                    );
                  })()}
                </div>
              )}

              {slot.mode === 'first_trick_win' && (
                <p className="text-gray-400 text-sm">Whoever wins trick 1 becomes your teammate</p>
              )}

              {dupError && (
                <p className="text-red-400 text-sm">{dupError}</p>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!allValid}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer"
      >
        Confirm Teammates
      </button>
    </div>
  );
}
