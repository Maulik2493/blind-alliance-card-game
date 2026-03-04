import type { Card, Suit, Rank } from './card';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AvailableConditionCard {
  suit: Suit;
  rank: Rank;
  availableInstances: (1 | 2)[];
}

// ─── Available Condition Cards ───────────────────────────────────────────────

export function getAvailableConditionCards(
  allDealtCards: Card[],
  removedCards: Card[],
): AvailableConditionCard[] {
  // Count removed instances per suit-rank
  const removedCounts = new Map<string, number>();
  for (const card of removedCards) {
    const key = `${card.suit}-${card.rank}`;
    removedCounts.set(key, (removedCounts.get(key) ?? 0) + 1);
  }

  // Count total instances per suit-rank from the full (pre-removal) deck
  const totalCounts = new Map<string, { suit: Suit; rank: Rank; count: number }>();
  for (const card of [...allDealtCards, ...removedCards]) {
    const key = `${card.suit}-${card.rank}`;
    const entry = totalCounts.get(key);
    if (entry) {
      entry.count++;
    } else {
      totalCounts.set(key, { suit: card.suit, rank: card.rank, count: 1 });
    }
  }

  const result: AvailableConditionCard[] = [];

  for (const [key, entry] of totalCounts) {
    const removed = removedCounts.get(key) ?? 0;
    const remaining = entry.count - removed;

    if (remaining <= 0) continue;

    const availableInstances: (1 | 2)[] = remaining >= 2 ? [1, 2] : [1];
    result.push({
      suit: entry.suit,
      rank: entry.rank,
      availableInstances,
    });
  }

  return result;
}
