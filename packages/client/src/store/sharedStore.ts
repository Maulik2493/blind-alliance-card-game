// ─── Shared Store Types ──────────────────────────────────────────────────────
// Connection state, room metadata, and player list shared across ALL games.

import type { GamePhase } from '@blind-alliance/core';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PublicPlayer {
  id: string;
  name: string;
  team: 'bidder' | 'opposition' | 'unknown';
  isRevealed: boolean;
  cardCount: number;
  collectedPoints: number;
  isConnected: boolean;
}

export interface GameLogEntry {
  id: number;
  timestamp: string;
  message: string;
}

export interface GameListItem {
  gameId: string;
  gameName: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

// ─── Shared State Interface ──────────────────────────────────────────────────

export interface SharedState {
  // Identity
  myPlayerId: string | null;
  myPlayerName: string | null;
  roomId: string | null;

  // Phase — generic string for cross-game compatibility, each game defines its own phases
  phase: GamePhase;

  // Players
  players: PublicPlayer[];

  // Connection
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  disconnectedPlayers: { playerId: string; playerName: string }[];

  // Error + Log
  lastError: string | null;
  gameLog: GameLogEntry[];

  // Game registry
  gameList: GameListItem[];
  gameListLoading: boolean;
  activeGameId: string | null;
  activeGameName: string | null;
}

// ─── Shared Actions ──────────────────────────────────────────────────────────

export interface SharedActions {
  connect: (playerName: string, roomId?: string) => void;
  createRoom: (playerName: string, gameId: string) => void;
  startGame: () => void;
  clearError: () => void;
  clearLog: () => void;
  requestRematch: () => void;
  fetchGameList: () => Promise<void>;
}

// ─── Initial Shared State ────────────────────────────────────────────────────

export const initialSharedState: SharedState = {
  myPlayerId: null,
  myPlayerName: null,
  roomId: null,
  phase: 'lobby',
  players: [],
  isConnected: false,
  isReconnecting: false,
  reconnectAttempt: 0,
  disconnectedPlayers: [],
  lastError: null,
  gameLog: [],
  gameList: [],
  gameListLoading: false,
  activeGameId: null,
  activeGameName: null,
};
