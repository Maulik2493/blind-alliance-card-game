import { describe, it, expect } from 'vitest';
import {
  isValidBid,
  nextValidBid,
  getMinBid,
  getMaxBid,
  getCurrentBidder,
  advanceBidQueue,
  isBiddingOver,
  shouldReshuffle,
} from '../src/bidding';
import { initGame, dealCards, placeBid, passBid } from '../src/gameState';
import type { GameState } from '../src/gameState';

// ─── Unit tests for bidding helpers ──────────────────────────────────────────

describe('isValidBid', () => {
  it('rejects bids that are not multiples of 5', () => {
    expect(isValidBid(126, null, 1)).toBe(false);
    expect(isValidBid(141, 140, 1)).toBe(false);
  });

  it('accepts valid bids', () => {
    expect(isValidBid(125, null, 1)).toBe(true);
    expect(isValidBid(145, 140, 1)).toBe(true);
    expect(isValidBid(250, null, 2)).toBe(true);
  });

  it('rejects bids below minimum', () => {
    expect(isValidBid(120, null, 1)).toBe(false);
    expect(isValidBid(245, null, 2)).toBe(false);
  });

  it('rejects bids not strictly greater than current highest', () => {
    expect(isValidBid(140, 140, 1)).toBe(false);
    expect(isValidBid(135, 140, 1)).toBe(false);
  });
});

describe('nextValidBid', () => {
  it('returns minimum bid when no current highest', () => {
    expect(nextValidBid(null, 1)).toBe(125);
    expect(nextValidBid(null, 2)).toBe(250);
  });

  it('returns next multiple of 5 above current highest', () => {
    expect(nextValidBid(140, 1)).toBe(145);
    expect(nextValidBid(150, 1)).toBe(155);
    expect(nextValidBid(250, 2)).toBe(255);
  });
});

describe('getMaxBid', () => {
  it('returns total points for given deck count', () => {
    expect(getMaxBid(1)).toBe(250);
    expect(getMaxBid(2)).toBe(500);
  });
});

describe('getCurrentBidder', () => {
  it('returns first player in queue', () => {
    expect(getCurrentBidder(['p1', 'p2', 'p3'])).toBe('p1');
  });

  it('returns null for empty queue', () => {
    expect(getCurrentBidder([])).toBe(null);
  });
});

describe('advanceBidQueue', () => {
  it('removes player on pass', () => {
    const result = advanceBidQueue(['p1', 'p2', 'p3'], 'p1', 'pass');
    expect(result).toEqual(['p2', 'p3']);
  });

  it('moves bidder to back on bid', () => {
    const result = advanceBidQueue(['p1', 'p2', 'p3'], 'p1', 'bid');
    expect(result).toEqual(['p2', 'p3', 'p1']);
  });
});

describe('isBiddingOver', () => {
  it('returns true when only one player left', () => {
    expect(isBiddingOver(['p1'], { amount: 125 }, 1)).toBe(true);
  });

  it('returns true when max bid placed', () => {
    expect(isBiddingOver(['p1', 'p2'], { amount: 250 }, 1)).toBe(true);
  });

  it('returns false when multiple players and no max bid', () => {
    expect(isBiddingOver(['p1', 'p2'], { amount: 125 }, 1)).toBe(false);
  });
});

describe('shouldReshuffle', () => {
  it('returns true when all bids are passes', () => {
    expect(shouldReshuffle([{ amount: null }, { amount: null }])).toBe(true);
  });

  it('returns false when any bid has an amount', () => {
    expect(shouldReshuffle([{ amount: 125 }, { amount: null }])).toBe(false);
  });
});

// ─── Queue-based bidding integration tests ───────────────────────────────────

describe('Queue-based bidding', () => {
  function makeGameState(): GameState {
    let state = initGame(['Alice', 'Bob', 'Carol', 'Dave']);
    state = dealCards(state);
    state = { ...state, phase: 'bidding', biddingQueue: state.players.map((p) => p.id) };
    return state;
  }

  it('biddingQueue initializes with all players in order', () => {
    const state = makeGameState();
    expect(state.biddingQueue).toHaveLength(4);
  });

  it('passing removes player from queue', () => {
    let state = makeGameState();
    const firstPlayer = state.biddingQueue[0]!;
    state = passBid(state, firstPlayer);
    expect(state.biddingQueue).not.toContain(firstPlayer);
    expect(state.biddingQueue).toHaveLength(3);
  });

  it('bidding moves player to back of queue', () => {
    let state = makeGameState();
    const firstPlayer = state.biddingQueue[0]!;
    state = placeBid(state, firstPlayer, 125);
    expect(state.biddingQueue[0]).not.toBe(firstPlayer);
    expect(state.biddingQueue[state.biddingQueue.length - 1]).toBe(firstPlayer);
  });

  it('last player remaining in queue wins bid automatically', () => {
    let state = makeGameState();
    const [p1, p2, p3, p4] = state.biddingQueue;
    state = placeBid(state, p1!, 125); // p1 bids → goes to back
    state = passBid(state, p2!);       // p2 passes → removed
    state = passBid(state, p3!);       // p3 passes → removed
    state = passBid(state, p4!);       // p4 passes → removed, p1 alone
    expect(state.phase).toBe('trump_select');
    expect(state.bidderId).toBe(p1);
  });

  it('bidding max points ends bidding immediately', () => {
    let state = makeGameState();
    const p1 = state.biddingQueue[0]!;
    state = placeBid(state, p1, 250); // max for 1 deck
    expect(state.phase).toBe('trump_select');
    expect(state.bidderId).toBe(p1);
  });

  it('all players passing with no bids triggers reshuffle', () => {
    let state = makeGameState();
    const [p1, p2, p3, p4] = state.biddingQueue;
    state = passBid(state, p1!);
    state = passBid(state, p2!);
    state = passBid(state, p3!);
    state = passBid(state, p4!);
    expect(state.phase).toBe('dealing');
  });

  it('bidding out of turn throws error', () => {
    const state = makeGameState();
    const secondPlayer = state.biddingQueue[1]!;
    expect(() => placeBid(state, secondPlayer, 125)).toThrow('It is not your turn');
  });

  it('multi-round bidding resolves correctly', () => {
    let state = makeGameState();
    const [p1, p2, p3, p4] = state.biddingQueue;
    state = placeBid(state, p1!, 125);  // p1 bids → back
    state = placeBid(state, p2!, 130);  // p2 bids → back
    state = placeBid(state, p3!, 135);  // p3 bids → back
    state = passBid(state, p4!);        // p4 passes → removed
    state = placeBid(state, p1!, 140);  // p1 bids again → back
    state = passBid(state, p2!);        // p2 passes → removed
    state = passBid(state, p3!);        // p3 passes → removed, p1 alone
    expect(state.phase).toBe('trump_select');
    expect(state.bidderId).toBe(p1);
    expect(state.highestBid?.amount).toBe(140);
  });

  it('bid not multiple of 5 throws', () => {
    const state = makeGameState();
    const p1 = state.biddingQueue[0]!;
    expect(() => placeBid(state, p1, 127)).toThrow();
  });

  it('bid below minimum throws', () => {
    const state = makeGameState();
    const p1 = state.biddingQueue[0]!;
    expect(() => placeBid(state, p1, 100)).toThrow();
  });

  it('bid not higher than current highest throws', () => {
    let state = makeGameState();
    const p1 = state.biddingQueue[0]!;
    state = placeBid(state, p1, 150);
    const p2 = state.biddingQueue[0]!;
    expect(() => placeBid(state, p2, 150)).toThrow();
  });
});
