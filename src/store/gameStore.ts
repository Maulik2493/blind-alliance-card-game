import { create } from 'zustand';
import type { Card, Suit } from '../core/card';
import type { TeammateCondition } from '../core/conditions';
import type { AvailableConditionCard } from '../core/conditionCards';
import type { TrickPlay } from '../core/trick';
import type { Player } from '../core/player';
import type { GameState } from '../core/gameState';
import {
  createInitialGameState,
  dealCards,
  placeBid as corePlaceBid,
  passBid as corePassBid,
  selectTrump as coreSelectTrump,
  setTeammateConditions as coreSetTeammateConditions,
  playCard as corePlayCard,
} from '../core/gameState';
import { getValidCards } from '../core/trick';
import { getAvailableConditionCards } from '../core/conditionCards';

// ─── Store Interface ─────────────────────────────────────────────────────────

interface GameStore extends GameState {
  // Actions
  joinGame: (playerNames: string[]) => void;
  startGame: () => void;
  placeBid: (playerId: string, amount: number) => void;
  passBid: (playerId: string) => void;
  selectTrump: (suit: Suit) => void;
  setTeammateConditions: (conditions: TeammateCondition[]) => void;
  playCard: (playerId: string, card: Card) => void;

  // Selectors
  currentPlayer: () => Player | undefined;
  validCards: (playerId: string) => Card[];
  isMyTurn: (playerId: string) => boolean;
  availableConditionCards: () => AvailableConditionCard[];
  currentTrickPlays: () => TrickPlay[];
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  ...createInitialGameState([]),

  // ── Actions ──────────────────────────────────────────────────────────────

  joinGame: (playerNames) => {
    set(createInitialGameState(playerNames));
  },

  startGame: () => {
    const state = get();
    const newState = dealCards(state);
    // Move to bidding phase after dealing
    set({ ...newState, phase: 'bidding' });
  },

  placeBid: (playerId, amount) => {
    set(corePlaceBid(get(), playerId, amount));
  },

  passBid: (playerId) => {
    set(corePassBid(get(), playerId));
  },

  selectTrump: (suit) => {
    set(coreSelectTrump(get(), suit));
  },

  setTeammateConditions: (conditions) => {
    set(coreSetTeammateConditions(get(), conditions));
  },

  playCard: (playerId, card) => {
    set(corePlayCard(get(), playerId, card));
  },

  // ── Selectors ────────────────────────────────────────────────────────────

  currentPlayer: () => {
    const state = get();
    return state.players[state.currentPlayerIndex];
  },

  validCards: (playerId) => {
    const state = get();
    const player = state.players.find((p) => p.id === playerId);
    if (!player || !state.trumpSuit) return [];
    const ledSuit = state.currentTrick?.ledSuit ?? null;
    return getValidCards(player.hand, ledSuit, state.trumpSuit);
  },

  isMyTurn: (playerId) => {
    const state = get();
    const current = state.players[state.currentPlayerIndex];
    return current?.id === playerId;
  },

  availableConditionCards: () => {
    const state = get();
    const allDealtCards = state.players.flatMap((p) => p.hand);
    return getAvailableConditionCards(allDealtCards, state.removedCards);
  },

  currentTrickPlays: () => {
    return get().currentTrick?.plays ?? [];
  },
}));
