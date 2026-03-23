import { type Card, type Suit, type Rank, getCardPoints, getRankValue } from './card';
import { buildDeck as baseBuildDeck, shuffleDeck } from '@blind-alliance/core-engine';

// Re-export shuffleDeck for external use
export { shuffleDeck };

// ─── Build a single 52-card deck (with BA point values) ──────────────────────

export function buildDeck(deckIndex: 0 | 1): Card[] {
  return baseBuildDeck(deckIndex, getCardPoints);
}

// ─── Remove balancing cards ──────────────────────────────────────────────────

export function removeBalancingCards(
  cards: Card[],
  playerCount: number,
): { remaining: Card[]; removed: Card[] } {
  const remaining = [...cards];
  const removed: Card[] = [];

  // Build removal candidates sorted by rank value asc, then deckIndex asc
  const candidates = [...remaining]
    .filter((c) => !(c.suit === 'spades' && c.rank === 3)) // Never remove 3♠
    .sort((a, b) => {
      const rankDiff = getRankValue(a.rank) - getRankValue(b.rank);
      if (rankDiff !== 0) return rankDiff;
      return a.deckIndex - b.deckIndex;
    });

  let candidateIdx = 0;
  while (remaining.length % playerCount !== 0 && candidateIdx < candidates.length) {
    const target = candidates[candidateIdx]!;
    const idx = remaining.findIndex(
      (c) => c.suit === target.suit && c.rank === target.rank && c.deckIndex === target.deckIndex,
    );
    if (idx !== -1) {
      removed.push(remaining.splice(idx, 1)[0]!);
    }
    candidateIdx++;
  }

  return { remaining, removed };
}

// ─── Build complete game deck ────────────────────────────────────────────────

export function buildGameDeck(playerCount: number): { cards: Card[]; removedCards: Card[] } {
  const deckCount = playerCount <= 5 ? 1 : 2;
  let allCards = buildDeck(0);
  if (deckCount === 2) {
    allCards = allCards.concat(buildDeck(1));
  }

  const shuffled = shuffleDeck(allCards);
  const { remaining, removed } = removeBalancingCards(shuffled, playerCount);

  return { cards: remaining, removedCards: removed };
}
