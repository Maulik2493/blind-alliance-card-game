// ─── Blind Alliance Store Types ───────────────────────────────────────────────
// State and actions specific to the Blind Alliance game.

import type { Card, Suit, Bid, Trick, TrickPlay, TeammateCondition } from '@blind-alliance/core';
import type { AvailableConditionCard } from '@blind-alliance/core';
import type { PublicPlayer } from './sharedStore';

// ─── Game Start Info ─────────────────────────────────────────────────────────

export interface GameStartInfo {
  trumpSuit: Suit;
  bidderName: string;
  bidAmount: number;
  teammateCount: number;
  conditions: {
    type: 'card_reveal' | 'first_trick_win';
    suit: Suit | null;
    rank: string | null;
    instance: number | null;
  }[];
}

// ─── Blind Alliance State ────────────────────────────────────────────────────

export interface BlindAllianceState {
  // Hand
  myHand: Card[];

  // Deck info
  deckCount: 1 | 2;
  totalPoints: number;
  minBid: number;
  removedCards: Card[];

  // Bidding
  biddingQueue: string[];
  bids: Bid[];
  highestBid: Bid | null;
  bidderId: string | null;

  // Trump and conditions
  trumpSuit: Suit | null;
  teammateConditions: TeammateCondition[];
  maxTeammateCount: number;

  // Trick play
  currentTrick: Trick | null;
  tricks: Trick[];
  currentPlayerIndex: number;

  // Scoring
  bidderTeamScore: number;
  oppositionTeamScore: number;
  bidderTeamTotal: number;
  oppositionTeamTotal: number | null;
  winner: 'bidder_team' | 'opposition_team' | null;

  // Game start info (for banner)
  gameStartInfo: GameStartInfo | null;
  showGameStartBanner: boolean;
}

// ─── Blind Alliance Actions ──────────────────────────────────────────────────

export interface BlindAllianceActions {
  placeBid: (amount: number) => void;
  passBid: () => void;
  selectTrump: (suit: Suit) => void;
  setTeammateConditions: (conditions: TeammateCondition[]) => void;
  playCard: (card: Card) => void;
  dismissGameStartBanner: () => void;

  // Selectors
  currentPlayer: () => PublicPlayer | undefined;
  validCards: () => Card[];
  isMyTurn: () => boolean;
  availableConditionCards: () => AvailableConditionCard[];
  currentTrickPlays: () => TrickPlay[];
  amIBidder: () => boolean;
}

// ─── Initial Blind Alliance State ────────────────────────────────────────────

export const initialBlindAllianceState: BlindAllianceState = {
  myHand: [],
  deckCount: 1,
  totalPoints: 250,
  minBid: 125,
  removedCards: [],
  biddingQueue: [],
  bids: [],
  highestBid: null,
  bidderId: null,
  trumpSuit: null,
  teammateConditions: [],
  maxTeammateCount: 0,
  currentTrick: null,
  tricks: [],
  currentPlayerIndex: 0,
  bidderTeamScore: 0,
  oppositionTeamScore: 0,
  bidderTeamTotal: 0,
  oppositionTeamTotal: null,
  winner: null,
  gameStartInfo: null,
  showGameStartBanner: false,
};
