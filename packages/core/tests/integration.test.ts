import { describe, it, expect } from 'vitest';
import {
  isValidBid,
  nextValidBid,
  checkCardPlayConditions,
  setTeammateConditions,
} from '../src';
import type {
  GameState,
  CardRevealCondition,
  FirstTrickWinCondition,
  TeammateCondition,
} from '../src';
import type { Player } from '../src/player';
import type { Card } from '../src/card';

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

function makeState(overrides: Partial<GameState> = {}): GameState {
  const players: Player[] = [
    { id: 'p0', name: 'Alice', hand: [], team: null, collectedCards: [] },
    { id: 'p1', name: 'Bob', hand: [], team: null, collectedCards: [] },
    { id: 'p2', name: 'Carol', hand: [], team: null, collectedCards: [] },
    { id: 'p3', name: 'Dave', hand: [], team: null, collectedCards: [] },
  ];
  return {
    phase: 'teammate_select',
    players,
    deckCount: 1,
    totalPoints: 250,
    minBid: 125,
    removedCards: [],
    bids: [],
    highestBid: null,
    bidderId: 'p2',
    biddingQueue: [],
    trumpSuit: 'spades',
    teammateConditions: [],
    maxTeammateCount: 1,
    cardInstanceTracker: new Map(),
    tricks: [],
    currentTrick: null,
    currentPlayerIndex: 0,
    bidderTeamScore: 0,
    oppositionTeamScore: 0,
    winner: null,
    ...overrides,
  };
}

// ─── Integration Test ────────────────────────────────────────────────────────

describe('integration — 4-player 1-deck game with all fixes', () => {
  // 1. Bid multiples of 5
  it('rejects non-multiple-of-5 bids and accepts valid bids', () => {
    expect(isValidBid(126, 125, 1)).toBe(false);
    expect(isValidBid(130, 125, 1)).toBe(true);
    expect(nextValidBid(130, 1)).toBe(135);
  });

  // 2. Instance tracking ignores deckIndex
  it('satisfied condition when non-bidder plays named card (1st A♠)', () => {
    const conditions: TeammateCondition[] = [cardReveal('spades', 'A', 1)];
    const tracker = new Map<string, number>();

    const result = checkCardPlayConditions(
      { playerId: 'p1', card: card('spades', 'A', 0) },
      'p2',
      conditions,
      tracker,
    );
    expect(tracker.get('spades-A')).toBe(1);
    expect(result[0]!.satisfied).toBe(true);
    expect(result[0]!.satisfiedByPlayerId).toBe('p1');
  });

  // 3. Non-matching instance is silent
  it('bidder plays 1st instance of 2nd-instance condition: silent, then player triggers 2nd', () => {
    const conditions: TeammateCondition[] = [cardReveal('spades', 'A', 2)];
    const tracker = new Map<string, number>();

    // Bidder plays 1st instance — not matching instance 2, no collapse
    const after1 = checkCardPlayConditions(
      { playerId: 'p2', card: card('spades', 'A', 0) },
      'p2',
      conditions,
      tracker,
    );
    expect(tracker.get('spades-A')).toBe(1);
    expect(after1[0]!.satisfied).toBe(false);
    expect(after1[0]!.collapsed).toBe(false);

    // Player B plays 2nd instance — triggers condition
    const after2 = checkCardPlayConditions(
      { playerId: 'p1', card: card('spades', 'A', 1) },
      'p2',
      after1,
      tracker,
    );
    expect(tracker.get('spades-A')).toBe(2);
    expect(after2[0]!.satisfied).toBe(true);
    expect(after2[0]!.satisfiedByPlayerId).toBe('p1');
  });

  // 4. Both instances to same player → collapse + currentPlayerIndex
  it('same player satisfies both instances → second collapses; bidder leads first trick', () => {
    const conditions: TeammateCondition[] = [
      cardReveal('spades', 'A', 1),
      cardReveal('spades', 'A', 2),
    ];
    const tracker = new Map<string, number>();

    // p1 plays 1st A♠
    const after1 = checkCardPlayConditions(
      { playerId: 'p1', card: card('spades', 'A', 0) },
      'p2',
      conditions,
      tracker,
    );
    expect(after1[0]!.satisfied).toBe(true);
    expect(after1[0]!.satisfiedByPlayerId).toBe('p1');

    // p1 plays 2nd A♠ → duplicate player → collapses
    const after2 = checkCardPlayConditions(
      { playerId: 'p1', card: card('spades', 'A', 1) },
      'p2',
      after1,
      tracker,
    );
    expect(after2[1]!.collapsed).toBe(true);

    // currentPlayerIndex after setTeammateConditions === 2 (bidder p2's index)
    const state = makeState({ bidderId: 'p2', currentPlayerIndex: 0 });
    const result = setTeammateConditions(state, [cardReveal('hearts', 'K')]);
    expect(result.currentPlayerIndex).toBe(2);
  });

  // 5. FirstTrickWin limit
  it('rejects two FirstTrickWin conditions but allows one mixed', () => {
    const state = makeState({ maxTeammateCount: 2 });
    expect(() => setTeammateConditions(state, [firstTrickWin(), firstTrickWin()])).toThrow(
      'Only one FirstTrickWin condition is allowed per game',
    );
    const result = setTeammateConditions(state, [firstTrickWin(), cardReveal('hearts', 'K')]);
    expect(result.phase).toBe('playing');
    expect(result.teammateConditions).toHaveLength(2);
  });
});
