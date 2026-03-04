import { describe, it, expect } from 'vitest';
import {
  setTeammateConditions,
  selectTrump,
  addPlayerToLobby,
  initGame,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from '../src/gameState';
import type { GameState } from '../src/gameState';
import type { CardRevealCondition, FirstTrickWinCondition } from '../src/conditions';
import type { Player } from '../src/player';

function makeMinimalState(overrides: Partial<GameState> = {}): GameState {
  const players: Player[] = [
    { id: 'p1', name: 'Alice', hand: [], team: null, collectedCards: [] },
    { id: 'p2', name: 'Bob', hand: [], team: null, collectedCards: [] },
    { id: 'p3', name: 'Carol', hand: [], team: null, collectedCards: [] },
    { id: 'p4', name: 'Dave', hand: [], team: null, collectedCards: [] },
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
    bidderId: 'p3',
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

describe('setTeammateConditions', () => {
  it('sets currentPlayerIndex to the bidder index', () => {
    // Bidder is p3 at index 2, currentPlayerIndex starts at 0
    const state = makeMinimalState({ bidderId: 'p3', currentPlayerIndex: 0 });
    const condition: CardRevealCondition = {
      type: 'card_reveal',
      suit: 'hearts',
      rank: 'A',
      instance: 1,
      satisfied: false,
      collapsed: false,
      satisfiedByPlayerId: null,
    };
    const result = setTeammateConditions(state, [condition]);
    expect(result.phase).toBe('playing');
    expect(result.currentPlayerIndex).toBe(2); // p3 is at index 2
  });

  it('throws if more than one FirstTrickWin condition is provided', () => {
    const state = makeMinimalState({ bidderId: 'p3', maxTeammateCount: 2 });
    const ftw1: FirstTrickWinCondition = {
      type: 'first_trick_win',
      satisfied: false,
      collapsed: false,
      satisfiedByPlayerId: null,
    };
    const ftw2: FirstTrickWinCondition = {
      type: 'first_trick_win',
      satisfied: false,
      collapsed: false,
      satisfiedByPlayerId: null,
    };
    expect(() => setTeammateConditions(state, [ftw1, ftw2])).toThrow(
      'Only one FirstTrickWin condition is allowed per game',
    );
  });
});

describe('selectTrump', () => {
  it('sets currentPlayerIndex to bidder when maxTeammateCount === 0 (3-player)', () => {
    const players: Player[] = [
      { id: 'p1', name: 'Alice', hand: [], team: null, collectedCards: [] },
      { id: 'p2', name: 'Bob', hand: [], team: null, collectedCards: [] },
      { id: 'p3', name: 'Carol', hand: [], team: null, collectedCards: [] },
    ];
    const state: GameState = {
      phase: 'trump_select',
      players,
      deckCount: 1,
      totalPoints: 250,
      minBid: 125,
      removedCards: [],
      bids: [],
      highestBid: { playerId: 'p2', amount: 130 },
      bidderId: 'p2',
      trumpSuit: null,
      teammateConditions: [],
      maxTeammateCount: 0,
      cardInstanceTracker: new Map(),
      tricks: [],
      currentTrick: null,
      currentPlayerIndex: 0, // stale from bidding
      bidderTeamScore: 0,
      oppositionTeamScore: 0,
      winner: null,
    };
    const result = selectTrump(state, 'hearts');
    expect(result.phase).toBe('playing');
    expect(result.currentPlayerIndex).toBe(1); // p2 is at index 1
  });
});

// ─── Player Limits ──────────────────────────────────────────────────────────

describe('player limits', () => {
  function makeLobbyState(playerCount: number): GameState {
    const names = Array.from({ length: playerCount }, (_, i) => `Player${i + 1}`);
    return initGame(names);
  }

  it('MAX_PLAYERS is 13', () => {
    expect(MAX_PLAYERS).toBe(13);
  });

  it('MIN_PLAYERS is 3', () => {
    expect(MIN_PLAYERS).toBe(3);
  });

  it('allows adding players up to MAX_PLAYERS', () => {
    let state = makeLobbyState(1);
    // Add players until we reach MAX_PLAYERS
    for (let i = 2; i <= MAX_PLAYERS; i++) {
      state = addPlayerToLobby(state, `p${i}`, `Player${i}`);
    }
    expect(state.players.length).toBe(MAX_PLAYERS);
  });

  it('rejects adding a player beyond MAX_PLAYERS', () => {
    let state = makeLobbyState(1);
    for (let i = 2; i <= MAX_PLAYERS; i++) {
      state = addPlayerToLobby(state, `p${i}`, `Player${i}`);
    }
    expect(() => addPlayerToLobby(state, 'extra', 'ExtraPlayer')).toThrow(
      `Room is full (max ${MAX_PLAYERS} players)`,
    );
  });

  it('correctly sets deckCount to 2 for 6+ players', () => {
    const state6 = makeLobbyState(6);
    expect(state6.deckCount).toBe(2);

    let state = makeLobbyState(1);
    for (let i = 2; i <= 13; i++) {
      state = addPlayerToLobby(state, `p${i}`, `Player${i}`);
    }
    expect(state.deckCount).toBe(2);
  });

  it('correctly computes maxTeammateCount for 13 players', () => {
    // maxTeammateCount = Math.floor(13 / 2) - 1 = 6 - 1 = 5
    let state = makeLobbyState(1);
    for (let i = 2; i <= 13; i++) {
      state = addPlayerToLobby(state, `p${i}`, `Player${i}`);
    }
    expect(state.maxTeammateCount).toBe(5);
  });

  it('correctly computes maxTeammateCount for 11 players', () => {
    // maxTeammateCount = Math.floor(11 / 2) - 1 = 5 - 1 = 4
    let state = makeLobbyState(1);
    for (let i = 2; i <= 11; i++) {
      state = addPlayerToLobby(state, `p${i}`, `Player${i}`);
    }
    expect(state.maxTeammateCount).toBe(4);
  });
});
