import { describe, test, expect } from 'vitest';
import { sortHand, getCardPoints } from '../src/card';
import type { Card } from '../src/card';

function card(suit: Card['suit'], rank: Card['rank'], deckIndex: 0 | 1 = 0): Card {
  return { suit, rank, points: getCardPoints(suit, rank), deckIndex };
}

describe('sortHand', () => {
  test('groups by suit then ranks high to low', () => {
    const hand: Card[] = [
      card('hearts', 2),
      card('spades', 'A'),
      card('hearts', 'K'),
      card('clubs', 5),
      card('spades', 3),
    ];
    const sorted = sortHand(hand);
    // spades first: A then 3
    expect(sorted[0]).toMatchObject({ suit: 'spades', rank: 'A' });
    expect(sorted[1]).toMatchObject({ suit: 'spades', rank: 3 });
    // hearts next: K then 2
    expect(sorted[2]).toMatchObject({ suit: 'hearts', rank: 'K' });
    expect(sorted[3]).toMatchObject({ suit: 'hearts', rank: 2 });
    // clubs last
    expect(sorted[4]).toMatchObject({ suit: 'clubs', rank: 5 });
  });

  test('does not mutate original array', () => {
    const hand: Card[] = [card('clubs', 'A'), card('spades', 2)];
    const sorted = sortHand(hand);
    expect(sorted).not.toBe(hand);
    expect(hand[0].suit).toBe('clubs');
  });

  test('handles all four suits in order', () => {
    const hand: Card[] = [
      card('clubs', 10),
      card('diamonds', 'J'),
      card('hearts', 'Q'),
      card('spades', 'K'),
    ];
    const sorted = sortHand(hand);
    expect(sorted.map((c) => c.suit)).toEqual(['spades', 'hearts', 'diamonds', 'clubs']);
  });

  test('sorts within same suit by rank descending', () => {
    const hand: Card[] = [
      card('hearts', 2),
      card('hearts', 'A'),
      card('hearts', 7),
      card('hearts', 'J'),
    ];
    const sorted = sortHand(hand);
    expect(sorted.map((c) => c.rank)).toEqual(['A', 'J', 7, 2]);
  });

  test('handles empty hand', () => {
    expect(sortHand([])).toEqual([]);
  });
});
