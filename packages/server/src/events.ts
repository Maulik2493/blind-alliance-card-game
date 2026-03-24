import type { Card, Suit, GamePhase, GameState, TeammateCondition, Trick, Bid, ScoreSummary } from '@blind-alliance/core';

// ─── Public Player (sanitized — no hand exposed) ────────────────────────────

export interface PublicPlayer {
  id: string;
  name: string;
  team: 'bidder' | 'opposition' | 'unknown';
  isRevealed: boolean;
  cardCount: number;
  collectedPoints: number;
  isConnected: boolean;
}

// ─── Client Game State (sanitized view for one player) ──────────────────────

export interface ClientGameState {
  phase: GamePhase;
  players: PublicPlayer[];
  myHand: Card[];
  deckCount: 1 | 2;
  totalPoints: 250 | 500;
  minBid: 125 | 250;
  removedCards: Card[];

  bids: Bid[];
  highestBid: Bid | null;
  bidderId: string | null;

  trumpSuit: Suit | null;
  teammateConditions: TeammateCondition[];
  maxTeammateCount: number;

  tricks: Trick[];
  currentTrick: Trick | null;
  currentPlayerIndex: number;
  biddingQueue: string[];

  bidderTeamScore: number;
  oppositionTeamScore: number;
  bidderTeamTotal: number;
  oppositionTeamTotal: number | null;
  winner: 'bidder_team' | 'opposition_team' | null;

  gameId: string;
  gameName: string;
}

// ─── Game Start Info ───────────────────────────────────────────────────────

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

// ─── Client → Server Events ─────────────────────────────────────────────────

export interface ClientToServerEvents {
  join_room: (data: { playerName: string; roomId?: string; gameId?: string }) => void;
  start_game: () => void;
  place_bid: (data: { amount: number }) => void;
  pass_bid: () => void;
  select_trump: (data: { suit: Suit }) => void;
  set_conditions: (data: { conditions: TeammateCondition[] }) => void;
  play_card: (data: { cardId: string }) => void;
  rematch: () => void;
}

// ─── Server → Client Events ─────────────────────────────────────────────────

export interface ServerToClientEvents {
  room_joined: (data: { roomId: string; playerId: string; players: PublicPlayer[]; gameId: string; gameName: string }) => void;
  player_joined: (data: { players: PublicPlayer[] }) => void;
  game_started: (data: { hand: Card[]; phase: GamePhase }) => void;
  state_update: (data: { state: ClientGameState }) => void;
  action_error: (data: { message: string }) => void;
  game_over: (data: { winner: 'bidder_team' | 'opposition_team'; summary: ScoreSummary }) => void;
  reconnected: (data: { playerId: string; state: ClientGameState }) => void;
  player_disconnected: (data: { playerId: string; playerName: string; reconnectWindowSeconds: number }) => void;
  player_reconnected: (data: { playerId: string; playerName: string }) => void;
  player_timed_out: (data: { playerId: string; playerName: string }) => void;
  game_start_info: (data: GameStartInfo) => void;
}
