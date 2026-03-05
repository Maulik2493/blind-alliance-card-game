import type { Card, Suit, Rank, GameState, TeammateCondition } from '@blind-alliance/core';
import {
  initGame,
  addPlayerToLobby,
  removePlayerFromLobby,
  dealCards,
  placeBid,
  passBid,
  selectTrump,
  setTeammateConditions,
  playCard,
  getValidCards,
} from '@blind-alliance/core';
import type { PublicPlayer, ClientGameState } from './events';

export class GameRoom {
  roomId: string;
  hostId: string;
  state: GameState;
  playerSocketMap: Map<string, string>; // playerId → socketId

  // Reconnection support
  disconnectedPlayers: Map<string, {
    playerId: string;
    playerName: string;
    disconnectedAt: number;
    reconnectTimer: ReturnType<typeof setTimeout> | null;
  }> = new Map();
  RECONNECT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  /** Reverse lookup: given a socket ID, find the game's player ID */
  getPlayerIdForSocket(socketId: string): string {
    for (const [playerId, sid] of this.playerSocketMap.entries()) {
      if (sid === socketId) return playerId;
    }
    return socketId; // fallback: socketId IS the playerId (normal case)
  }

  constructor(roomId: string, hostPlayerId: string, hostPlayerName: string) {
    this.roomId = roomId;
    this.hostId = hostPlayerId;
    this.state = initGame([hostPlayerName]);
    // Override the auto-generated id with the actual socket id
    this.state = {
      ...this.state,
      players: this.state.players.map((p) => ({ ...p, id: hostPlayerId })),
    };
    this.playerSocketMap = new Map();
    this.playerSocketMap.set(hostPlayerId, hostPlayerId);
  }

  addPlayer(playerId: string, playerName: string): void {
    if (this.state.phase !== 'lobby') {
      throw new Error('Cannot join — game has already started');
    }
    this.state = addPlayerToLobby(this.state, playerId, playerName);
    this.playerSocketMap.set(playerId, playerId);
  }

  removePlayer(playerId: string): void {
    if (this.state.phase !== 'lobby') {
      throw new Error('Cannot remove players during a game');
    }
    this.state = removePlayerFromLobby(this.state, playerId);
    this.playerSocketMap.delete(playerId);
  }

  startGame(): void {
    if (this.state.phase !== 'lobby') {
      throw new Error('Game has already started');
    }
    if (this.state.players.length < 3) {
      throw new Error('Need at least 3 players to start');
    }
    this.state = dealCards(this.state);
    // Transition from 'dealing' to 'bidding' phase
    this.state = { ...this.state, phase: 'bidding' };
  }

  applyBid(playerId: string, amount: number): void {
    this.validateCurrentPlayer(playerId);
    this.state = placeBid(this.state, playerId, amount);
  }

  applyPass(playerId: string): void {
    this.validateCurrentPlayer(playerId);
    this.state = passBid(this.state, playerId);
  }

  applyTrumpSelect(playerId: string, suit: Suit): void {
    if (playerId !== this.state.bidderId) {
      throw new Error('Only the bidder can select trump');
    }
    this.state = selectTrump(this.state, suit);
  }

  applySetConditions(playerId: string, conditions: TeammateCondition[]): void {
    if (playerId !== this.state.bidderId) {
      throw new Error('Only the bidder can set teammate conditions');
    }
    if (conditions.length !== this.state.maxTeammateCount) {
      throw new Error(
        `Must set exactly ${this.state.maxTeammateCount} teammate condition(s)`,
      );
    }
    this.state = setTeammateConditions(this.state, conditions);
  }

  applyPlayCard(playerId: string, cardId: string): void {
    this.validateCurrentPlayer(playerId);

    const { suit, rank, deckIndex } = parseCardId(cardId);
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const card = player.hand.find(
      (c) => c.suit === suit && c.rank === rank && c.deckIndex === deckIndex,
    );
    if (!card) {
      throw new Error('Card not in hand');
    }

    const ledSuit = this.state.currentTrick?.ledSuit ?? null;
    const validCards = getValidCards(player.hand, ledSuit, this.state.trumpSuit!);
    const isValid = validCards.some(
      (c) => c.suit === card.suit && c.rank === card.rank && c.deckIndex === card.deckIndex,
    );
    if (!isValid) {
      throw new Error('Invalid card play — must follow suit');
    }

    this.state = playCard(this.state, playerId, card);
  }

  getSanitizedStateFor(playerId: string): ClientGameState {
    const player = this.state.players.find((p) => p.id === playerId);
    return {
      phase: this.state.phase,
      players: this.getPublicPlayers(),
      myHand: player?.hand ?? [],
      deckCount: this.state.deckCount,
      totalPoints: this.state.totalPoints,
      minBid: this.state.minBid,
      removedCards: this.state.removedCards,
      bids: this.state.bids,
      highestBid: this.state.highestBid,
      bidderId: this.state.bidderId,
      trumpSuit: this.state.trumpSuit,
      teammateConditions: this.state.teammateConditions,
      maxTeammateCount: this.state.maxTeammateCount,
      tricks: this.state.tricks,
      currentTrick: this.state.currentTrick,
      currentPlayerIndex: this.state.currentPlayerIndex,
      bidderTeamScore: this.state.bidderTeamScore,
      oppositionTeamScore: this.state.oppositionTeamScore,
      winner: this.state.winner,
    };
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

  private validateCurrentPlayer(playerId: string): void {
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }
  }
}

// ─── Card ID Parsing ─────────────────────────────────────────────────────────

function parseCardId(cardId: string): { suit: Suit; rank: Rank; deckIndex: 0 | 1 } {
  // Format: "suit-rank-deckIndex" e.g. "spades-A-0" or "hearts-10-1"
  const parts = cardId.split('-');
  if (parts.length < 3) {
    throw new Error(`Invalid cardId format: ${cardId}`);
  }

  const suit = parts[0] as Suit;
  const deckIndex = parseInt(parts[parts.length - 1]!, 10) as 0 | 1;
  // Rank is everything between first and last part (handles "10" which doesn't split)
  const rankStr = parts.slice(1, -1).join('-');

  const validSuits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  if (!validSuits.includes(suit)) {
    throw new Error(`Invalid suit: ${suit}`);
  }

  let rank: Rank;
  const numRank = parseInt(rankStr, 10);
  if (!isNaN(numRank) && numRank >= 2 && numRank <= 10) {
    rank = numRank as Rank;
  } else if (['J', 'Q', 'K', 'A'].includes(rankStr)) {
    rank = rankStr as Rank;
  } else {
    throw new Error(`Invalid rank: ${rankStr}`);
  }

  if (deckIndex !== 0 && deckIndex !== 1) {
    throw new Error(`Invalid deckIndex: ${deckIndex}`);
  }

  return { suit, rank, deckIndex };
}
