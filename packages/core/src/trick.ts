import type { Card, Suit } from './card';
import { getRankValue } from './card';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrickPlay {
  playerId: string;
  card: Card;
  playOrder: number; // Clockwise sequence within the trick (1 = first, N = last)
}

export interface Trick {
  id: number;
  ledSuit: Suit;
  plays: TrickPlay[];
  winnerId: string | null;
  pointsInTrick: number;
}

// ─── Fuse Card Check ─────────────────────────────────────────────────────────

export function isFuseCard(card: Card, ledSuit: Suit, trumpSuit: Suit): boolean {
  return card.suit !== ledSuit && card.suit !== trumpSuit;
}

// ─── Valid Cards for a Player ────────────────────────────────────────────────

export function getValidCards(hand: Card[], ledSuit: Suit | null, _trumpSuit: Suit): Card[] {
  // First play of trick — any card is valid
  if (ledSuit === null) return hand;

  // Must follow suit if possible
  const suitCards = hand.filter((c) => c.suit === ledSuit);
  if (suitCards.length > 0) return suitCards;

  // No led-suit cards — any card (trump or fuse)
  return hand;
}

// ─── Trick Resolution ────────────────────────────────────────────────────────

export function resolveTrick(trick: Trick, trumpSuit: Suit): string {
  const trumpPlays = trick.plays.filter((p) => p.card.suit === trumpSuit);

  if (trumpPlays.length > 0) {
    return findWinningPlay(trumpPlays).playerId;
  }

  const ledPlays = trick.plays.filter((p) => p.card.suit === trick.ledSuit);
  return findWinningPlay(ledPlays).playerId;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findWinningPlay(plays: TrickPlay[]): TrickPlay {
  return plays.reduce((best, current) => {
    const bestRank = getRankValue(best.card.rank);
    const currentRank = getRankValue(current.card.rank);

    if (currentRank > bestRank) return current;
    if (currentRank === bestRank && current.playOrder > best.playOrder) return current;
    return best;
  });
}
