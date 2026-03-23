import type { Card, Suit, Rank } from './card';

// ─── Constants ───────────────────────────────────────────────────────────────

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];

// ─── Deck Configuration ─────────────────────────────────────────────────────

export interface DeckConfig {
  deckCount: 1 | 2;
  getCardPoints: (suit: Suit, rank: Rank) => number;
}

// ─── Build a single 52-card deck ─────────────────────────────────────────────

export function buildDeck(
  deckIndex: 0 | 1,
  getCardPoints: (suit: Suit, rank: Rank) => number = () => 0,
): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        suit,
        rank,
        points: getCardPoints(suit, rank),
        deckIndex,
      });
    }
  }
  return cards;
}

// ─── Shuffle (Fisher-Yates) ──────────────────────────────────────────────────

export function shuffleDeck<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
