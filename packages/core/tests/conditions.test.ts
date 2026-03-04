import { describe, it, expect } from 'vitest';
import {
  checkCardPlayConditions,
  resolveFirstTrickWin,
} from '@blind-alliance/core';
import type { TeammateCondition, CardRevealCondition, FirstTrickWinCondition } from '@blind-alliance/core';
import type { Card } from '@blind-alliance/core';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function card(suit: Card['suit'], rank: Card['rank'], deckIndex: 0 | 1 = 0): Card {
  return { suit, rank, points: 0, deckIndex };
}

function cardReveal(
  suit: Card['suit'],
  rank: Card['rank'],
  instance: 1 | 2 = 1,
): CardRevealCondition {
  return {
    type: 'card_reveal',
    suit,
    rank,
    instance,
    satisfied: false,
    collapsed: false,
    satisfiedByPlayerId: null,
  };
}

function firstTrickWin(): FirstTrickWinCondition {
  return {
    type: 'first_trick_win',
    satisfied: false,
    collapsed: false,
    satisfiedByPlayerId: null,
  };
}

// ─── checkCardPlayConditions ─────────────────────────────────────────────────

describe('checkCardPlayConditions', () => {
  it('correct card played by another player → condition satisfied', () => {
    const conditions: TeammateCondition[] = [cardReveal('hearts', 'A')];
    const tracker = new Map<string, number>();
    const result = checkCardPlayConditions(
      { playerId: 'p2', card: card('hearts', 'A') },
      'p1',
      conditions,
      tracker,
    );
    expect(result[0]!.satisfied).toBe(true);
    expect(result[0]!.satisfiedByPlayerId).toBe('p2');
  });

  it('bidder plays their own named card → condition collapses', () => {
    const conditions: TeammateCondition[] = [cardReveal('hearts', 'A')];
    const tracker = new Map<string, number>();
    const result = checkCardPlayConditions(
      { playerId: 'p1', card: card('hearts', 'A') },
      'p1',
      conditions,
      tracker,
    );
    expect(result[0]!.collapsed).toBe(true);
    expect(result[0]!.satisfied).toBe(false);
  });

  it('two conditions both resolve to same player → second collapses', () => {
    const conditions: TeammateCondition[] = [
      { ...cardReveal('hearts', 'A'), satisfied: true, satisfiedByPlayerId: 'p2' },
      cardReveal('diamonds', 'K'),
    ];
    const tracker = new Map<string, number>();
    const result = checkCardPlayConditions(
      { playerId: 'p2', card: card('diamonds', 'K') },
      'p1',
      conditions,
      tracker,
    );
    expect(result[0]!.satisfied).toBe(true);
    expect(result[1]!.collapsed).toBe(true);
  });

  it('instance tracking: 1st and 2nd plays tracked separately', () => {
    const conditions: TeammateCondition[] = [
      cardReveal('hearts', 'A', 1),
      cardReveal('hearts', 'A', 2),
    ];
    const tracker = new Map<string, number>();

    // 1st play of hearts-A
    const after1 = checkCardPlayConditions(
      { playerId: 'p2', card: card('hearts', 'A', 0) },
      'p1',
      conditions,
      tracker,
    );
    expect(after1[0]!.satisfied).toBe(true);
    expect(after1[1]!.satisfied).toBe(false);

    // 2nd play of hearts-A
    const after2 = checkCardPlayConditions(
      { playerId: 'p3', card: card('hearts', 'A', 1) },
      'p1',
      after1,
      tracker,
    );
    expect(after2[1]!.satisfied).toBe(true);
    expect(after2[1]!.satisfiedByPlayerId).toBe('p3');
  });

  it('already-satisfied condition is not overwritten', () => {
    const conditions: TeammateCondition[] = [
      { ...cardReveal('hearts', 'A'), satisfied: true, satisfiedByPlayerId: 'p2' },
    ];
    const tracker = new Map<string, number>();
    const result = checkCardPlayConditions(
      { playerId: 'p3', card: card('hearts', 'A') },
      'p1',
      conditions,
      tracker,
    );
    expect(result[0]!.satisfiedByPlayerId).toBe('p2');
  });
});

// ─── resolveFirstTrickWin ────────────────────────────────────────────────────

describe('resolveFirstTrickWin', () => {
  it('non-bidder wins trick 1 → teammate assigned', () => {
    const conditions: TeammateCondition[] = [firstTrickWin()];
    const result = resolveFirstTrickWin('p2', 'p1', conditions);
    expect(result[0]!.satisfied).toBe(true);
    expect(result[0]!.satisfiedByPlayerId).toBe('p2');
  });

  it('bidder wins trick 1 → condition collapses', () => {
    const conditions: TeammateCondition[] = [firstTrickWin()];
    const result = resolveFirstTrickWin('p1', 'p1', conditions);
    expect(result[0]!.collapsed).toBe(true);
    expect(result[0]!.satisfied).toBe(false);
  });
});
