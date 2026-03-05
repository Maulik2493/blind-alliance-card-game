// ─── Core Card Types ─────────────────────────────────────────────────────────

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  points: number; // 0, 5, 10, or 30
  deckIndex: 0 | 1; // Distinguishes duplicate cards in 2-deck games
}

// ─── Point Assignment ────────────────────────────────────────────────────────

export function getCardPoints(suit: Suit, rank: Rank): number {
  if (suit === 'spades' && rank === 3) return 30;
  if (rank === 5) return 5;
  if (rank === 10 || rank === 'J' || rank === 'Q' || rank === 'K' || rank === 'A') return 10;
  return 0;
}

// ─── Rank Ordering ───────────────────────────────────────────────────────────

const FACE_RANK_VALUES: Record<string, number> = {
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function getRankValue(rank: Rank): number {
  if (typeof rank === 'number') return rank;
  return FACE_RANK_VALUES[rank]!;
}

// ─── Hand Sorting ─────────────────────────────────────────────────────────────────────

const SUIT_ORDER: Record<Suit, number> = {
  spades: 0,
  hearts: 1,
  diamonds: 2,
  clubs: 3,
};

export function sortHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return getRankValue(b.rank) - getRankValue(a.rank);
  });
}
