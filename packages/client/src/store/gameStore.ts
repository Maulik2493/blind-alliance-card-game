import { create } from 'zustand';
import type { Card, Suit, GamePhase, Bid, Trick, TrickPlay, TeammateCondition } from '@blind-alliance/core';
import type { AvailableConditionCard } from '@blind-alliance/core';
import { getValidCards, getAvailableConditionCards, buildDeck, sortHand } from '@blind-alliance/core';
import { socket, connectSocket } from '../socket';

// ─── Types (mirrored from server/src/events.ts) ─────────────────────────────

export interface PublicPlayer {
  id: string;
  name: string;
  team: 'bidder' | 'opposition' | 'unknown';
  isRevealed: boolean;
  cardCount: number;
  collectedPoints: number;
  isConnected: boolean;
}

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
  winner: 'bidder_team' | 'opposition_team' | null;
}

// ─── Game Log Entry ──────────────────────────────────────────────────────────

export interface GameLogEntry {
  id: number;
  timestamp: string;
  message: string;
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface GameStore {
  // Identity
  myPlayerId: string | null;
  myPlayerName: string | null;
  roomId: string | null;

  // Server-driven game state
  phase: GamePhase;
  players: PublicPlayer[];
  myHand: Card[];
  deckCount: 1 | 2;
  totalPoints: number;
  minBid: number;
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
  winner: 'bidder_team' | 'opposition_team' | null;

  // UI state
  lastError: string | null;
  gameLog: GameLogEntry[];
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempt: number;
  disconnectedPlayers: { playerId: string; playerName: string }[];

  // Actions
  connect: (playerName: string, roomId?: string) => void;
  startGame: () => void;
  placeBid: (amount: number) => void;
  passBid: () => void;
  selectTrump: (suit: Suit) => void;
  setTeammateConditions: (conditions: TeammateCondition[]) => void;
  playCard: (card: Card) => void;
  clearError: () => void;
  clearLog: () => void;

  // Selectors
  currentPlayer: () => PublicPlayer | undefined;
  validCards: () => Card[];
  isMyTurn: () => boolean;
  availableConditionCards: () => AvailableConditionCard[];
  currentTrickPlays: () => TrickPlay[];
  amIBidder: () => boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let logIdCounter = 0;

function createLogEntry(message: string): GameLogEntry {
  const now = new Date();
  const timestamp = now.toTimeString().slice(0, 8);
  return { id: ++logIdCounter, timestamp, message };
}

function deriveLogMessage(state: ClientGameState): string {
  switch (state.phase) {
    case 'bidding':
      return `Bidding — current high: ${state.highestBid?.amount ?? 'none'}`;
    case 'trump_select':
      return `Bidder selecting trump suit`;
    case 'teammate_select':
      return `Bidder selecting teammates`;
    case 'playing': {
      if (state.currentTrick?.winnerId) {
        return `Trick won by ${state.currentTrick.winnerId}`;
      }
      if (state.currentTrick && state.currentTrick.plays.length > 0) {
        const lastPlay = state.currentTrick.plays[state.currentTrick.plays.length - 1];
        if (lastPlay) {
          return `${lastPlay.playerId} played ${lastPlay.card.rank} of ${lastPlay.card.suit}`;
        }
      }
      return `Playing — trick in progress`;
    }
    case 'finished':
      return `Game finished`;
    default:
      return `Phase: ${state.phase}`;
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set, get) => {
  // ── Socket Listener Setup ────────────────────────────────────────────────

  function addLog(message: string) {
    set((s) => ({ gameLog: [...s.gameLog, createLogEntry(message)] }));
  }

  socket.on('connect', () => {
    set({ isConnected: true });
    addLog('Connected to server');
  });

  socket.on('disconnect', () => {
    set({ isConnected: false });
    addLog('Disconnected from server');
  });

  socket.on('room_joined', ({ roomId, playerId, players }) => {
    set({ roomId, myPlayerId: playerId, players });
    addLog(`Joined room ${roomId} as ${playerId}`);
  });

  socket.on('player_joined', ({ players }) => {
    set({ players });
    addLog(`Player joined. Total: ${players.length}`);
  });

  socket.on('game_started', ({ hand, phase }) => {
    set({ myHand: sortHand(hand), phase });
    addLog('Game started — cards dealt');
  });

  socket.on('state_update', ({ state }) => {
    const prevPhase = get().phase;
    set({ ...state, myHand: sortHand(state.myHand) });
    // Temporary debug: log phase transitions involving 'playing'
    if (prevPhase !== state.phase || state.phase === 'playing') {
      const currentP = state.players[state.currentPlayerIndex];
      console.log(
        `[STATE_UPDATE] ${prevPhase} → ${state.phase} | currentPlayerIndex=${state.currentPlayerIndex} → ${currentP?.name} (${currentP?.id}) | bidderId=${state.bidderId} | myPlayerId=${get().myPlayerId}`
      );
    }
    addLog(deriveLogMessage(state));
  });

  socket.on('action_error', ({ message }) => {
    set({ lastError: message });
    addLog(`ERROR: ${message}`);
  });

  socket.on('game_over', ({ winner }) => {
    set({ winner, phase: 'finished' });
    addLog(`Game over — winner: ${winner}`);
  });

  // ── Reconnection Events ───────────────────────────────────────────────

  socket.io.on('reconnect_attempt', (attempt: number) => {
    set({ isReconnecting: true, reconnectAttempt: attempt });
    addLog(`Reconnecting... attempt ${attempt}`);
  });

  socket.io.on('reconnect', () => {
    set({ isReconnecting: false, reconnectAttempt: 0 });
    addLog('Reconnected to server');

    // If we were in a game, attempt to rejoin
    const { myPlayerName, roomId } = get();
    if (myPlayerName && roomId) {
      socket.emit('join_room', { playerName: myPlayerName, roomId });
      addLog(`Rejoining room ${roomId}...`);
    }
  });

  socket.io.on('reconnect_failed', () => {
    set({ isReconnecting: false });
    set({ lastError: 'Could not reconnect. Please refresh the page.' });
    addLog('Reconnection failed after 10 attempts');
  });

  socket.on('reconnected' as any, ({ playerId, state }: { playerId: string; state: ClientGameState }) => {
    set({ myPlayerId: playerId, ...state, myHand: sortHand(state.myHand) });
    addLog('Successfully rejoined game');
  });

  socket.on('player_disconnected' as any, ({ playerName, reconnectWindowSeconds }: { playerName: string; reconnectWindowSeconds: number }) => {
    addLog(`${playerName} disconnected. ${reconnectWindowSeconds}s to reconnect.`);
    set((s) => ({
      disconnectedPlayers: [
        ...s.disconnectedPlayers,
        { playerId: '', playerName },
      ],
    }));
  });

  socket.on('player_reconnected' as any, ({ playerName }: { playerName: string }) => {
    addLog(`${playerName} reconnected`);
    set((s) => ({
      disconnectedPlayers: s.disconnectedPlayers.filter(
        (p) => p.playerName !== playerName,
      ),
    }));
  });

  socket.on('player_timed_out' as any, ({ playerName }: { playerName: string }) => {
    set({ lastError: `${playerName} timed out and has left the game.` });
    addLog(`${playerName} timed out`);
  });

  // ── Initial State + Actions ──────────────────────────────────────────────

  return {
    // Identity
    myPlayerId: null,
    myPlayerName: null,
    roomId: null,

    // Server-driven game state
    phase: 'lobby' as GamePhase,
    players: [],
    myHand: [],
    deckCount: 1 as 1 | 2,
    totalPoints: 250,
    minBid: 125,
    removedCards: [],
    bids: [],
    highestBid: null,
    bidderId: null,
    trumpSuit: null,
    teammateConditions: [],
    maxTeammateCount: 0,
    tricks: [],
    currentTrick: null,
    currentPlayerIndex: 0,
    biddingQueue: [],
    bidderTeamScore: 0,
    oppositionTeamScore: 0,
    winner: null,

    // UI state
    lastError: null,
    gameLog: [],
    isConnected: false,
    isReconnecting: false,
    reconnectAttempt: 0,
    disconnectedPlayers: [],

    // ── Actions ──────────────────────────────────────────────────────────

    connect: (playerName, roomId) => {
      set({ myPlayerName: playerName });
      connectSocket();
      socket.emit('join_room', { playerName, roomId: roomId || undefined });
    },

    startGame: () => {
      socket.emit('start_game');
    },

    placeBid: (amount) => {
      socket.emit('place_bid', { amount });
    },

    passBid: () => {
      socket.emit('pass_bid');
    },

    selectTrump: (suit) => {
      socket.emit('select_trump', { suit });
    },

    setTeammateConditions: (conditions) => {
      socket.emit('set_conditions', { conditions });
    },

    playCard: (card) => {
      const cardId = `${card.suit}-${card.rank}-${card.deckIndex}`;
      socket.emit('play_card', { cardId });
    },

    clearError: () => set({ lastError: null }),

    clearLog: () => set({ gameLog: [] }),

    // ── Selectors ────────────────────────────────────────────────────────

    currentPlayer: () => {
      const s = get();
      return s.players[s.currentPlayerIndex];
    },

    validCards: () => {
      const { myHand, trumpSuit, currentTrick } = get();
      if (!trumpSuit) return myHand;
      const ledSuit = currentTrick?.ledSuit ?? null;
      return getValidCards(myHand, ledSuit, trumpSuit);
    },

    isMyTurn: () => {
      const s = get();
      if (s.phase === 'bidding') {
        return s.biddingQueue[0] === s.myPlayerId;
      }
      return s.players[s.currentPlayerIndex]?.id === s.myPlayerId;
    },

    amIBidder: () => {
      return get().bidderId === get().myPlayerId;
    },

    availableConditionCards: () => {
      const { deckCount, removedCards } = get();
      // Reconstruct all dealt cards: full deck(s) minus removed cards
      const fullDeck = deckCount === 2
        ? [...buildDeck(0), ...buildDeck(1)]
        : buildDeck(0);
      const allDealtCards = fullDeck.filter(
        (c) => !removedCards.some(
          (r) => r.suit === c.suit && r.rank === c.rank && r.deckIndex === c.deckIndex,
        ),
      );
      return getAvailableConditionCards(allDealtCards, removedCards);
    },

    currentTrickPlays: () => {
      return get().currentTrick?.plays ?? [];
    },
  };
});
