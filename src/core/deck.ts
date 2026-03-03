import { type Card, type Suit, type Rank, getCardPoints, getRankValue } from './card';

// ─── Constants ───────────────────────────────────────────────────────────────

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];

// ─── Build a single 52-card deck ─────────────────────────────────────────────

export function buildDeck(deckIndex: 0 | 1): Card[] {
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

// ─── Shuffle (Fisher-Yates) ──────────────────────────────────────────────────

function shuffle<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ─── Build complete game deck ────────────────────────────────────────────────

export function buildGameDeck(playerCount: number): { cards: Card[]; removedCards: Card[] } {
  const deckCount = playerCount <= 5 ? 1 : 2;
  let allCards = buildDeck(0);
  if (deckCount === 2) {
    allCards = allCards.concat(buildDeck(1));
  }

  const shuffled = shuffle(allCards);
  const { remaining, removed } = removeBalancingCards(shuffled, playerCount);

  return { cards: remaining, removedCards: removed };
}
