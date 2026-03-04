import { describe, it, expect } from 'vitest';
import { isValidBid, nextValidBid, getMinBid } from '../src/bidding';

describe('isValidBid', () => {
  it('rejects bids that are not multiples of 5', () => {
    expect(isValidBid(126, null, 1)).toBe(false);
    expect(isValidBid(131, null, 1)).toBe(false);
    expect(isValidBid(141, 140, 1)).toBe(false);
    expect(isValidBid(253, null, 2)).toBe(false);
  });

  it('accepts bids that are valid multiples of 5', () => {
    expect(isValidBid(125, null, 1)).toBe(true);
    expect(isValidBid(130, null, 1)).toBe(true);
    expect(isValidBid(145, 140, 1)).toBe(true);
    expect(isValidBid(250, null, 2)).toBe(true);
    expect(isValidBid(255, 250, 2)).toBe(true);
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

  it('result is always accepted by isValidBid', () => {
    const cases: [number | null, 1 | 2][] = [
      [null, 1], [125, 1], [130, 1], [140, 1], [245, 1],
      [null, 2], [250, 2], [255, 2], [300, 2],
    ];
    for (const [highest, deck] of cases) {
      const next = nextValidBid(highest, deck);
      expect(isValidBid(next, highest, deck)).toBe(true);
    }
  });
});
