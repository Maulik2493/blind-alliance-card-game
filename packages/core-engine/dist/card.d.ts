export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A';
export interface Card {
    suit: Suit;
    rank: Rank;
    points: number;
    deckIndex: 0 | 1;
}
export declare function getRankValue(rank: Rank): number;
export declare function getSuitOrder(suit: Suit): number;
export declare function sortHand(cards: Card[]): Card[];
//# sourceMappingURL=card.d.ts.map