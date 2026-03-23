"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDeck = buildDeck;
exports.shuffleDeck = shuffleDeck;
// ─── Constants ───────────────────────────────────────────────────────────────
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 'J', 'Q', 'K', 'A'];
// ─── Build a single 52-card deck ─────────────────────────────────────────────
function buildDeck(deckIndex, getCardPoints = () => 0) {
    const cards = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            cards.push({
                suit,
                rank,
                points: getCardPoints(suit, rank),
                deckIndex,
            });
        }
    }
    return cards;
}
// ─── Shuffle (Fisher-Yates) ──────────────────────────────────────────────────
function shuffleDeck(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
//# sourceMappingURL=deck.js.map