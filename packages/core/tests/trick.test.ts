import { describe, it, expect } from 'vitest';
import { resolveTrick } from '@blind-alliance/core';
import type { Trick } from '@blind-alliance/core';
import type { Card, Suit } from '@blind-alliance/core';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function card(suit: Suit, rank: Card['rank'], deckIndex: 0 | 1 = 0): Card {
  return { suit, rank, points: 0, deckIndex };
}

function makeTrick(plays: { id: string; card: Card; order: number }[], ledSuit: Suit): Trick {
  return {
    id: 1,
    ledSuit,
    plays: plays.map((p) => ({ playerId: p.id, card: p.card, playOrder: p.order })),
    winnerId: null,
    pointsInTrick: 0,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('resolveTrick', () => {
  const trump: Suit = 'spades';

  it('single card played → that player wins', () => {
    const trick = makeTrick([{ id: 'p1', card: card('hearts', 7), order: 1 }], 'hearts');
    expect(resolveTrick(trick, trump)).toBe('p1');
  });

  it('highest led-suit card wins when no trump played', () => {
    const trick = makeTrick(
      [
        { id: 'p1', card: card('hearts', 5), order: 1 },
        { id: 'p2', card: card('hearts', 'K'), order: 2 },
        { id: 'p3', card: card('hearts', 9), order: 3 },
      ],
      'hearts',
    );
    expect(resolveTrick(trick, trump)).toBe('p2');
  });

  it('any trump beats highest led-suit card', () => {
    const trick = makeTrick(
      [
        { id: 'p1', card: card('hearts', 'A'), order: 1 },
        { id: 'p2', card: card('spades', 2), order: 2 },
      ],
      'hearts',
    );
    expect(resolveTrick(trick, trump)).toBe('p2');
  });

  it('highest trump wins when multiple trumps played', () => {
    const trick = makeTrick(
      [
        { id: 'p1', card: card('hearts', 'A'), order: 1 },
        { id: 'p2', card: card('spades', 5), order: 2 },
        { id: 'p3', card: card('spades', 'J'), order: 3 },
      ],
      'hearts',
    );
    expect(resolveTrick(trick, trump)).toBe('p3');
  });

  it('fuse cards never win', () => {
    const trick = makeTrick(
      [
        { id: 'p1', card: card('hearts', 3), order: 1 },
        { id: 'p2', card: card('diamonds', 'A'), order: 2 }, // fuse
        { id: 'p3', card: card('hearts', 5), order: 3 },
      ],
      'hearts',
    );
    expect(resolveTrick(trick, trump)).toBe('p3');
  });

  it('Ace beats King in same suit', () => {
    const trick = makeTrick(
      [
        { id: 'p1', card: card('hearts', 'K'), order: 1 },
        { id: 'p2', card: card('hearts', 'A'), order: 2 },
      ],
      'hearts',
    );
    expect(resolveTrick(trick, trump)).toBe('p2');
  });

  it('trump 2 beats Ace of led suit', () => {
    const trick = makeTrick(
      [
        { id: 'p1', card: card('hearts', 'A'), order: 1 },
        { id: 'p2', card: card('spades', 2), order: 2 },
      ],
      'hearts',
    );
    expect(resolveTrick(trick, trump)).toBe('p2');
  });

  it('[2-deck] two identical cards played → higher playOrder wins', () => {
    const trick = makeTrick(
      [
        { id: 'p1', card: card('hearts', 'K', 0), order: 1 },
        { id: 'p2', card: card('hearts', 'K', 1), order: 2 },
      ],
      'hearts',
    );
    expect(resolveTrick(trick, trump)).toBe('p2');
  });

  it('[2-deck] trump tie → higher playOrder wins', () => {
    const trick = makeTrick(
      [
        { id: 'p1', card: card('hearts', 3), order: 1 },
        { id: 'p2', card: card('spades', 'Q', 0), order: 2 },
        { id: 'p3', card: card('spades', 'Q', 1), order: 3 },
      ],
      'hearts',
    );
    expect(resolveTrick(trick, trump)).toBe('p3');
  });
});
