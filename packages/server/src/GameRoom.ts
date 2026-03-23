import type { GameAdapter, BaseGameState, BaseClientGameState } from '@blind-alliance/core-engine';
import type { GameState } from '@blind-alliance/core';
import type { PublicPlayer, ClientGameState } from './events';
import { BlindAllianceAdapter } from './adapters/BlindAllianceAdapter';

// Default adapter instance
const defaultAdapter = new BlindAllianceAdapter();

export class GameRoom {
  roomId: string;
  hostId: string;
  state: GameState;
  adapter: GameAdapter<GameState, ClientGameState>;
  playerSocketMap: Map<string, string>; // playerId → socketId

  // Reconnection support
  disconnectedPlayers: Map<string, {
    playerId: string;
    playerName: string;
    disconnectedAt: number;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
  }> = new Map();
  RECONNECT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  // Auto-cleanup timer for finished rooms awaiting rematch
  finishedCleanupTimer: ReturnType<typeof setTimeout> | null = null;
  static FINISHED_CLEANUP_MS = 10 * 60 * 1000; // 10 minutes

  /** Reverse lookup: given a socket ID, find the game's player ID */
  getPlayerIdForSocket(socketId: string): string {
    for (const [playerId, sid] of this.playerSocketMap.entries()) {
      if (sid === socketId) return playerId;
    }
    return socketId; // fallback: socketId IS the playerId (normal case)
  }

  constructor(
    roomId: string,
    hostPlayerId: string,
    hostPlayerName: string,
    adapter: GameAdapter<GameState, ClientGameState> = defaultAdapter,
  ) {
    this.roomId = roomId;
    this.hostId = hostPlayerId;
    this.adapter = adapter;
    this.state = adapter.initGame([{ id: hostPlayerId, name: hostPlayerName }]);
    this.playerSocketMap = new Map();
    this.playerSocketMap.set(hostPlayerId, hostPlayerId);
  }

  // ─── Generic Event Dispatch ──────────────────────────────────────────────

  applyEvent(playerId: string, event: string, payload: unknown): void {
    this.state = this.adapter.handleEvent(this.state, playerId, event, payload);
  }

  // ─── Lobby Management (infrastructure, not game-specific) ────────────────

  addPlayer(playerId: string, playerName: string): void {
    if (this.state.phase !== 'lobby') {
      throw new Error('Cannot join — game has already started');
    }
    this.applyEvent(playerId, 'add_player', { playerId, playerName });
    this.playerSocketMap.set(playerId, playerId);
  }

  removePlayer(playerId: string): void {
    if (this.state.phase !== 'lobby') {
      throw new Error('Cannot remove players during a game');
    }
    this.applyEvent(playerId, 'remove_player', {});
    this.playerSocketMap.delete(playerId);
  }

  startGame(): void {
    if (this.state.phase !== 'lobby') {
      throw new Error('Game has already started');
    }
    if (this.state.players.length < 3) {
      throw new Error('Need at least 3 players to start');
    }
    this.applyEvent(this.hostId, 'start_game', {});
  }

  // ─── Game Event Methods (delegate to applyEvent) ─────────────────────────

  applyBid(playerId: string, amount: number): void {
    this.applyEvent(playerId, 'place_bid', { amount });
  }

  applyPass(playerId: string): void {
    this.applyEvent(playerId, 'pass_bid', {});
  }

  applyTrumpSelect(playerId: string, suit: string): void {
    if (playerId !== this.state.bidderId) {
      throw new Error('Only the bidder can select trump');
    }
    this.applyEvent(playerId, 'select_trump', { suit });
  }

  applySetConditions(playerId: string, conditions: unknown[]): void {
    if (playerId !== this.state.bidderId) {
      throw new Error('Only the bidder can set teammate conditions');
    }
    if (conditions.length !== this.state.maxTeammateCount) {
      throw new Error(
        `Must set exactly ${this.state.maxTeammateCount} teammate condition(s)`,
      );
    }
    this.applyEvent(playerId, 'set_conditions', { conditions });
  }

  applyPlayCard(playerId: string, cardId: string): void {
    // Validate current player turn
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }
    this.applyEvent(playerId, 'play_card', { cardId });
  }

  // ─── State Access ─────────────────────────────────────────────────────────

  getSanitizedStateFor(playerId: string): ClientGameState {
    return this.adapter.getSanitizedState(this.state, playerId);
  }

  getPublicPlayers(): PublicPlayer[] {
    return this.state.players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      isRevealed: p.isRevealed,
      cardCount: p.hand.length,
      collectedPoints: p.collectedCards.reduce((sum, c) => sum + c.points, 0),
      isConnected: p.isConnected,
    }));
  }

  isGameOver(): boolean {
    return this.adapter.isGameOver(this.state);
  }

  applyRematch(playerId: string): void {
    if (playerId !== this.hostId) {
      throw new Error('Only the host can start a rematch');
    }
    if (this.state.phase !== 'finished') {
      throw new Error('Rematch can only be triggered after game ends');
    }
    // Cancel the auto-cleanup timer since we're reusing the room
    if (this.finishedCleanupTimer) {
      clearTimeout(this.finishedCleanupTimer);
      this.finishedCleanupTimer = null;
    }
    this.state = this.adapter.resetForRematch(this.state);
  }

  // ─── Reconnection Infrastructure ──────────────────────────────────────────

  markPlayerDisconnected(playerId: string): void {
    const player = this.state.players.find((p) => p.id === playerId);
    if (player) {
      player.isConnected = false;
    }
  }

  markPlayerConnected(playerId: string): void {
    const player = this.state.players.find((p) => p.id === playerId);
    if (player) {
      player.isConnected = true;
    }
  }

  allPlayersDisconnected(): boolean {
    return this.state.players.every((p) => !p.isConnected);
  }
}
