import { describe, it, expect } from 'vitest';
import { buildDeck, removeBalancingCards } from '@blind-alliance/core';

// ─── removeBalancingCards ────────────────────────────────────────────────────

describe('removeBalancingCards', () => {
  it('result length is always divisible by playerCount', () => {
    for (const playerCount of [3, 4, 5, 7]) {
      const deck = buildDeck(0);
      const { remaining } = removeBalancingCards(deck, playerCount);
      expect(remaining.length % playerCount).toBe(0);
    }
  });

  it('3 of Spades is NEVER removed regardless of player count', () => {
    for (const playerCount of [3, 4, 5, 7]) {
      const deck = buildDeck(0);
      const { removed } = removeBalancingCards(deck, playerCount);
      const has3S = removed.some((c) => c.suit === 'spades' && c.rank === 3);
      expect(has3S).toBe(false);
    }
  });

  it('lowest rank cards are removed first', () => {
    const deck = buildDeck(0);
    const { removed } = removeBalancingCards(deck, 5); // 52 % 5 = 2 → remove 2 cards
    // Removed cards should be rank 2 (the lowest)
    for (const card of removed) {
      expect(card.rank).toBe(2);
    }
  });

  it('lowest deckIndex removed first when two decks present', () => {
    const deck = [...buildDeck(0), ...buildDeck(1)]; // 104 cards
    const { removed } = removeBalancingCards(deck, 7); // 104 % 7 = 6 → remove 6 cards
    // First removals should prefer deckIndex 0
    const firstRemoved = removed[0]!;
    expect(firstRemoved.deckIndex).toBe(0);
  });

  it('no removal needed if already balanced', () => {
    const deck = buildDeck(0); // 52 cards
    const { remaining, removed } = removeBalancingCards(deck, 4); // 52 % 4 = 0
    expect(removed.length).toBe(0);
    expect(remaining.length).toBe(52);
  });
});
