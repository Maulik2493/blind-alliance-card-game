import { useState, useCallback } from 'react';
import type { AvailableConditionCard } from '@blind-alliance/core';
import type { TeammateCondition, CardRevealCondition, FirstTrickWinCondition } from '@blind-alliance/core';
import type { Suit, Rank } from '@blind-alliance/core';

// ─── Props ───────────────────────────────────────────────────────────────────

interface TeammateSelectorProps {
  availableConditionCards: AvailableConditionCard[];
  maxCount: number;
  deckCount: 1 | 2;
  onSubmit: (conditions: TeammateCondition[]) => void;
}

// ─── Slot State ──────────────────────────────────────────────────────────────

interface ConditionSlot {
  mode: 'card_reveal' | 'first_trick_win';
  suit?: Suit;
  rank?: Rank;
  instance?: 1 | 2;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SUIT_LABELS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export default function TeammateSelector({
  availableConditionCards,
  maxCount,
  deckCount,
  onSubmit,
}: TeammateSelectorProps) {
  const [slots, setSlots] = useState<ConditionSlot[]>(() =>
    Array.from({ length: maxCount }, () => ({ mode: 'card_reveal' })),
  );

  const updateSlot = useCallback((index: number, patch: Partial<ConditionSlot>) => {
    setSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)),
    );
  }, []);

  const ranksForSuit = (suit: Suit) =>
    availableConditionCards.filter((c) => c.suit === suit).map((c) => c.rank);

  const instancesForCard = (suit: Suit, rank: Rank) =>
    availableConditionCards.find((c) => c.suit === suit && c.rank === rank)?.availableInstances ?? [];

  const isSlotComplete = (slot: ConditionSlot): boolean => {
    if (slot.mode === 'first_trick_win') return true;
    if (!slot.suit || !slot.rank) return false;
    if (deckCount === 2) {
      const instances = instancesForCard(slot.suit, slot.rank);
      if (instances.length === 2 && !slot.instance) return false;
    }
    return true;
  };

  const allComplete = slots.every(isSlotComplete);

  const hasDuplicate = (): boolean => {
    const seen = new Set<string>();
    for (const slot of slots) {
      let key: string;
      if (slot.mode === 'first_trick_win') {
        key = 'first_trick_win';
      } else {
        key = `${slot.suit}-${slot.rank}-${slot.instance ?? 1}`;
      }
      if (seen.has(key)) return true;
      seen.add(key);
    }
    return false;
  };

  const handleSubmit = () => {
    if (!allComplete || hasDuplicate()) return;

    const conditions: TeammateCondition[] = slots.map((slot) => {
      if (slot.mode === 'first_trick_win') {
        return {
          type: 'first_trick_win',
          satisfied: false,
          collapsed: false,
          satisfiedByPlayerId: null,
        } satisfies FirstTrickWinCondition;
      }
      return {
        type: 'card_reveal',
        suit: slot.suit!,
        rank: slot.rank!,
        instance: slot.instance ?? 1,
        satisfied: false,
        collapsed: false,
        satisfiedByPlayerId: null,
      } satisfies CardRevealCondition;
    });

    onSubmit(conditions);
  };

  if (maxCount === 0) return null;

  return (
    <div className="teammate-selector">
      <h3>Select Teammate Conditions</h3>
      {slots.map((slot, i) => (
        <div key={i} className="condition-slot">
          <label>
            <input
              type="radio"
              checked={slot.mode === 'card_reveal'}
              onChange={() => updateSlot(i, { mode: 'card_reveal', suit: undefined, rank: undefined, instance: undefined })}
            />
            Card Reveal
          </label>
          <label>
            <input
              type="radio"
              checked={slot.mode === 'first_trick_win'}
              onChange={() => updateSlot(i, { mode: 'first_trick_win' })}
            />
            First Trick Win
          </label>

          {slot.mode === 'card_reveal' && (
            <div className="card-reveal-inputs">
              <select
                value={slot.suit ?? ''}
                onChange={(e) =>
                  updateSlot(i, { suit: e.target.value as Suit, rank: undefined, instance: undefined })
                }
              >
                <option value="">Suit</option>
                {(['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]).map((s) => (
                  <option key={s} value={s}>{SUIT_LABELS[s]} {s}</option>
                ))}
              </select>

              {slot.suit && (
                <select
                  value={slot.rank != null ? String(slot.rank) : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const rank = (['J', 'Q', 'K', 'A'].includes(val) ? val : Number(val)) as Rank;
                    updateSlot(i, { rank, instance: undefined });
                  }}
                >
                  <option value="">Rank</option>
                  {ranksForSuit(slot.suit).map((r) => (
                    <option key={String(r)} value={String(r)}>{r}</option>
                  ))}
                </select>
              )}

              {deckCount === 2 && slot.suit && slot.rank && instancesForCard(slot.suit, slot.rank).length === 2 && (
                <select
                  value={slot.instance ?? ''}
                  onChange={(e) => updateSlot(i, { instance: Number(e.target.value) as 1 | 2 })}
                >
                  <option value="">Instance</option>
                  <option value="1">1st</option>
                  <option value="2">2nd</option>
                </select>
              )}
            </div>
          )}
        </div>
      ))}

      <button disabled={!allComplete || hasDuplicate()} onClick={handleSubmit}>
        Confirm Teammates
      </button>
    </div>
  );
}
