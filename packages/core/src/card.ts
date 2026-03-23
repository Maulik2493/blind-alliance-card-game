// Re-export shared card types and utilities from core-engine
export { type Suit, type Rank, type Card, getRankValue, getSuitOrder, sortHand } from '@blind-alliance/core-engine';

import type { Suit, Rank } from '@blind-alliance/core-engine';

// ─── Blind Alliance Point Assignment ─────────────────────────────────────────

export function getCardPoints(suit: Suit, rank: Rank): number {
  if (suit === 'spades' && rank === 3) return 30;
  if (rank === 5) return 5;
  if (rank === 10 || rank === 'J' || rank === 'Q' || rank === 'K' || rank === 'A') return 10;
  return 0;
}
