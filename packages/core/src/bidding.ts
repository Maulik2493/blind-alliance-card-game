// ─── Bidding and Team Size ────────────────────────────────────────────────────

export function getMinBid(deckCount: 1 | 2): 125 | 250 {
  return deckCount === 1 ? 125 : 250;
}

export function getMaxBid(deckCount: 1 | 2): 250 | 500 {
  return deckCount === 1 ? 250 : 500;
}

export function isValidBid(amount: number, currentHighest: number | null, deckCount: 1 | 2): boolean {
  return (
    amount % 5 === 0 &&
    amount >= getMinBid(deckCount) &&
    amount > (currentHighest ?? 0)
  );
}

export function nextValidBid(currentHighest: number | null, deckCount: 1 | 2): number {
  if (currentHighest === null) return getMinBid(deckCount);
  return Math.ceil((currentHighest + 1) / 5) * 5;
}

export function getMaxTeammateCount(playerCount: number): number {
  return Math.floor(playerCount / 2) - 1;
}

// ─── Queue-Based Bidding Helpers ─────────────────────────────────────────────

export function getCurrentBidder(biddingQueue: string[]): string | null {
  return biddingQueue[0] ?? null;
}

export function advanceBidQueue(
  biddingQueue: string[],
  playerId: string,
  action: 'bid' | 'pass',
): string[] {
  if (action === 'pass') {
    return biddingQueue.filter((id) => id !== playerId);
  }
  // bid: remove from current position, push to back
  const without = biddingQueue.filter((id) => id !== playerId);
  return [...without, playerId];
}

export function isBiddingOver(
  biddingQueue: string[],
  highestBid: { amount: number | null } | null,
  deckCount: 1 | 2,
): boolean {
  return (
    biddingQueue.length <= 1 ||
    (highestBid !== null && highestBid.amount !== null && highestBid.amount === getMaxBid(deckCount))
  );
}

export function shouldReshuffle(bids: { amount: number | null }[]): boolean {
  return bids.length === 0 || bids.every((b) => b.amount === null);
}
