// ─── Bidding and Team Size ────────────────────────────────────────────────────

export function getMinBid(deckCount: 1 | 2): 125 | 250 {
  return deckCount === 1 ? 125 : 250;
}

export function isValidBid(amount: number, currentHighest: number | null, deckCount: 1 | 2): boolean {
  return amount >= getMinBid(deckCount) && amount > (currentHighest ?? 0);
}

export function getMaxTeammateCount(playerCount: number): number {
  return Math.floor(playerCount / 2) - 1;
}
