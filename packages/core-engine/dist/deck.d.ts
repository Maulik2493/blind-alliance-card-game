import type { Card, Suit, Rank } from './card';
export interface DeckConfig {
    deckCount: 1 | 2;
    getCardPoints: (suit: Suit, rank: Rank) => number;
}
export declare function buildDeck(deckIndex: 0 | 1, getCardPoints?: (suit: Suit, rank: Rank) => number): Card[];
export declare function shuffleDeck<T>(array: T[]): T[];
//# sourceMappingURL=deck.d.ts.map