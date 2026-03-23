"use strict";
// ─── Core Card Types ─────────────────────────────────────────────────────────
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRankValue = getRankValue;
exports.getSuitOrder = getSuitOrder;
exports.sortHand = sortHand;
// ─── Rank Ordering ───────────────────────────────────────────────────────────
const FACE_RANK_VALUES = {
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
};
function getRankValue(rank) {
    if (typeof rank === 'number')
        return rank;
    return FACE_RANK_VALUES[rank];
}
// ─── Suit Ordering ───────────────────────────────────────────────────────────
const SUIT_ORDER = {
    spades: 0,
    hearts: 1,
    diamonds: 2,
    clubs: 3,
};
function getSuitOrder(suit) {
    return SUIT_ORDER[suit];
}
// ─── Hand Sorting ────────────────────────────────────────────────────────────
function sortHand(cards) {
    return [...cards].sort((a, b) => {
        const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
        if (suitDiff !== 0)
            return suitDiff;
        return getRankValue(b.rank) - getRankValue(a.rank);
    });
}
//# sourceMappingURL=card.js.map