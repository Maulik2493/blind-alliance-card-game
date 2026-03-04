// ─── Bidding and Team Size ────────────────────────────────────────────────────

export function getMinBid(deckCount: 1 | 2): 125 | 250 {
  return deckCount === 1 ? 125 : 250;
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
