import type { Card, Suit } from './card';
import type { TeammateCondition } from './conditions';
import { checkCardPlayConditions, resolveFirstTrickWin } from './conditions';
import type { Trick } from './trick';
import { resolveTrick } from './trick';
import type { Player } from './player';
import { buildGameDeck } from './deck';
import { isValidBid, getMinBid, getMaxTeammateCount, getMaxBid, getCurrentBidder, advanceBidQueue, isBiddingOver, shouldReshuffle } from './bidding';
import { computeTeamScores, determineWinner } from './scoring';

// ─── Constants ───────────────────────────────────────────────────────────────

export const MAX_PLAYERS = 13;
export const MIN_PLAYERS = 3;

// ─── Types ───────────────────────────────────────────────────────────────────

export type GamePhase =
  | 'lobby'
  | 'dealing'
  | 'bidding'
  | 'trump_select'
  | 'teammate_select'
  | 'playing'
  | 'reveal'
  | 'finished';

export interface Bid {
  playerId: string;
  amount: number | null;  // null = pass
}

export interface GameState {
  phase: GamePhase;
  players: Player[];
  deckCount: 1 | 2;
  totalPoints: 250 | 500;
  minBid: 125 | 250;
  removedCards: Card[];

  bids: Bid[];
  highestBid: Bid | null;
  bidderId: string | null;
  biddingQueue: string[];

  trumpSuit: Suit | null;
  teammateConditions: TeammateCondition[];
  maxTeammateCount: number;

  cardInstanceTracker: Map<string, number>;

  tricks: Trick[];
  currentTrick: Trick | null;
  currentPlayerIndex: number;

  bidderTeamScore: number;
  oppositionTeamScore: number;
  winner: 'bidder_team' | 'opposition_team' | null;
}

// ─── Pure State Transition Functions ─────────────────────────────────────────

export function initGame(playerNames: string[]): GameState {
  const deckCount: 1 | 2 = playerNames.length <= 5 ? 1 : 2;

  return {
    phase: 'lobby',
    players: playerNames.map((name, i) => ({
      id: `player-${i}`,
      name,
      hand: [],
      collectedCards: [],
      team: 'unknown' as const,
      isRevealed: false,
      isConnected: true,
    })),
    deckCount,
    totalPoints: deckCount === 1 ? 250 : 500,
    minBid: getMinBid(deckCount),
    removedCards: [],

    bids: [],
    highestBid: null,
    bidderId: null,
    biddingQueue: [],

    trumpSuit: null,
    teammateConditions: [],
    maxTeammateCount: getMaxTeammateCount(playerNames.length),

    cardInstanceTracker: new Map(),

    tricks: [],
    currentTrick: null,
    currentPlayerIndex: 0,

    bidderTeamScore: 0,
    oppositionTeamScore: 0,
    winner: null,
  };
}

/** Backward-compat alias used by store */
export const createInitialGameState = initGame;

// ─── Lobby ──────────────────────────────────────────────────────────────────

export function addPlayerToLobby(state: GameState, playerId: string, playerName: string): GameState {
  if (state.phase !== 'lobby') {
    throw new Error('Cannot add players outside of lobby phase');
  }
  if (state.players.length >= MAX_PLAYERS) {
    throw new Error(`Room is full (max ${MAX_PLAYERS} players)`);
  }
  if (state.players.some((p) => p.id === playerId)) {
    throw new Error('Player already in lobby');
  }

  const newPlayers = [
    ...state.players,
    {
      id: playerId,
      name: playerName,
      hand: [] as Card[],
      collectedCards: [] as Card[],
      team: 'unknown' as const,
      isRevealed: false,
      isConnected: true,
    },
  ];

  const newDeckCount: 1 | 2 = newPlayers.length <= 5 ? 1 : 2;

  return {
    ...state,
    players: newPlayers,
    deckCount: newDeckCount,
    totalPoints: newDeckCount === 1 ? 250 : 500,
    minBid: getMinBid(newDeckCount),
    maxTeammateCount: getMaxTeammateCount(newPlayers.length),
  };
}

export function removePlayerFromLobby(state: GameState, playerId: string): GameState {
  if (state.phase !== 'lobby') {
    throw new Error('Cannot remove players outside of lobby phase');
  }

  const newPlayers = state.players.filter((p) => p.id !== playerId);
  const newDeckCount: 1 | 2 = newPlayers.length <= 5 ? 1 : 2;

  return {
    ...state,
    players: newPlayers,
    deckCount: newDeckCount,
    totalPoints: newDeckCount === 1 ? 250 : 500,
    minBid: getMinBid(newDeckCount),
    maxTeammateCount: getMaxTeammateCount(newPlayers.length),
  };
}

// ─── Deal Cards ──────────────────────────────────────────────────────────────

export function dealCards(state: GameState): GameState {
  const playerCount = state.players.length;
  const { cards, removedCards } = buildGameDeck(playerCount);
  const cardsPerPlayer = Math.floor(cards.length / playerCount);

  const players = state.players.map((player, i) => ({
    ...player,
    hand: cards.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer),
    collectedCards: [],
    team: 'unknown' as const,
    isRevealed: false,
    isConnected: player.isConnected,
  }));

  return {
    ...state,
    phase: 'dealing',
    players,
    removedCards,
    deckCount: playerCount <= 5 ? 1 : 2,
    totalPoints: playerCount <= 5 ? 250 : 500,
    minBid: getMinBid(playerCount <= 5 ? 1 : 2),
    maxTeammateCount: getMaxTeammateCount(playerCount),
    bids: [],
    highestBid: null,
    bidderId: null,
    biddingQueue: players.map((p) => p.id),
    trumpSuit: null,
    teammateConditions: [],
    cardInstanceTracker: new Map(),
    tricks: [],
    currentTrick: null,
    currentPlayerIndex: 0,
    bidderTeamScore: 0,
    oppositionTeamScore: 0,
    winner: null,
  };
}

// ─── Bidding ─────────────────────────────────────────────────────────────────

export function placeBid(state: GameState, playerId: string, amount: number): GameState {
  // Validate it is this player's turn
  if (getCurrentBidder(state.biddingQueue) !== playerId) {
    throw new Error('It is not your turn to bid');
  }

  // Validate bid amount
  if (!isValidBid(amount, state.highestBid?.amount ?? null, state.deckCount)) {
    throw new Error(
      `Invalid bid. Must be a multiple of 5 and higher than ${state.highestBid?.amount ?? state.minBid - 5}`,
    );
  }

  const newBid: Bid = { playerId, amount };
  const newBids = [...state.bids, newBid];
  const newQueue = advanceBidQueue(state.biddingQueue, playerId, 'bid');

  const newState: GameState = {
    ...state,
    bids: newBids,
    highestBid: newBid,
    biddingQueue: newQueue,
  };

  // Check if bidding is over
  if (isBiddingOver(newQueue, newBid, state.deckCount)) {
    const players = state.players.map((p) => ({
      ...p,
      team: p.id === playerId ? ('bidder' as const) : p.team,
      isRevealed: p.id === playerId ? true : p.isRevealed,
    }));
    return {
      ...newState,
      bidderId: playerId,
      players,
      phase: 'trump_select',
    };
  }

  return newState;
}

export function passBid(state: GameState, playerId: string): GameState {
  // Validate it is this player's turn
  if (getCurrentBidder(state.biddingQueue) !== playerId) {
    throw new Error('It is not your turn to bid');
  }

  const newBid: Bid = { playerId, amount: null };
  const newBids = [...state.bids, newBid];
  const newQueue = advanceBidQueue(state.biddingQueue, playerId, 'pass');

  // Check if everyone passed with no bids placed → reshuffle
  if (newQueue.length === 0) {
    if (shouldReshuffle(newBids)) {
      return dealCards(state);
    }
  }

  const newState: GameState = {
    ...state,
    bids: newBids,
    biddingQueue: newQueue,
  };

  // Check if bidding is over (one player left in queue)
  if (isBiddingOver(newQueue, state.highestBid, state.deckCount)) {
    const winnerId = newQueue[0]!;
    const players = state.players.map((p) => ({
      ...p,
      team: p.id === winnerId ? ('bidder' as const) : p.team,
      isRevealed: p.id === winnerId ? true : p.isRevealed,
    }));
    return {
      ...newState,
      bidderId: winnerId,
      players,
      phase: 'trump_select',
    };
  }

  return newState;
}

// ─── Trump Selection ─────────────────────────────────────────────────────────

export function selectTrump(state: GameState, suit: Suit): GameState {
  const goDirectToPlaying = state.maxTeammateCount === 0;
  const bidderIndex = state.players.findIndex(p => p.id === state.bidderId);
  return {
    ...state,
    trumpSuit: suit,
    phase: goDirectToPlaying ? 'playing' : 'teammate_select',
    ...(goDirectToPlaying ? { currentPlayerIndex: bidderIndex } : {}),
  };
}

// ─── Teammate Conditions ─────────────────────────────────────────────────────

export function setTeammateConditions(state: GameState, conditions: TeammateCondition[]): GameState {
  const ftwCount = conditions.filter(c => c.type === 'first_trick_win').length;
  if (ftwCount > 1) {
    throw new Error('Only one FirstTrickWin condition is allowed per game');
  }

  const bidderIndex = state.players.findIndex(p => p.id === state.bidderId);
  return {
    ...state,
    teammateConditions: conditions,
    phase: 'playing',
    currentPlayerIndex: bidderIndex,
  };
}

// ─── Play Card ───────────────────────────────────────────────────────────────

export function playCard(state: GameState, playerId: string, card: Card): GameState {
  // Find the player and remove the card from their hand
  const playerIndex = state.players.findIndex((p) => p.id === playerId);
  if (playerIndex === -1) return state;

  const player = state.players[playerIndex]!;
  const cardIdx = player.hand.findIndex(
    (c) => c.suit === card.suit && c.rank === card.rank && c.deckIndex === card.deckIndex,
  );
  if (cardIdx === -1) return state;

  const newHand = [...player.hand];
  newHand.splice(cardIdx, 1);

  const updatedPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: newHand } : p,
  );

  // Initialize or continue current trick
  const isFirstPlay = state.currentTrick === null;
  const currentTrick: Trick = isFirstPlay
    ? { id: state.tricks.length + 1, ledSuit: card.suit, plays: [], winnerId: null, pointsInTrick: 0 }
    : { ...state.currentTrick! };

  const playOrder = currentTrick.plays.length + 1;
  const newPlays = [...currentTrick.plays, { playerId, card, playOrder }];
  currentTrick.plays = newPlays;

  // Update cardInstanceTracker and check conditions
  const tracker = new Map(state.cardInstanceTracker);
  let conditions = checkCardPlayConditions(
    { playerId, card },
    state.bidderId!,
    state.teammateConditions,
    tracker,
  );

  // Sum points in trick
  currentTrick.pointsInTrick = newPlays.reduce((sum, p) => sum + p.card.points, 0);

  // Check if trick is complete (all players played)
  const isTrickComplete = newPlays.length === state.players.length;

  let nextState: GameState = {
    ...state,
    players: updatedPlayers,
    currentTrick,
    cardInstanceTracker: tracker,
    teammateConditions: conditions,
  };

  if (isTrickComplete) {
    // Resolve trick winner
    const winnerId = resolveTrick(currentTrick, state.trumpSuit!);
    const completedTrick: Trick = { ...currentTrick, winnerId };

    // Award collected cards to the winner
    const trickCards = completedTrick.plays.map((p) => p.card);
    const playersAfterCollection = nextState.players.map((p) =>
      p.id === winnerId
        ? { ...p, collectedCards: [...p.collectedCards, ...trickCards] }
        : p,
    );

    // Handle first-trick-win condition
    const isFirstTrick = state.tricks.length === 0;
    if (isFirstTrick) {
      conditions = resolveFirstTrickWin(winnerId, state.bidderId!, conditions);
    }

    // Update team assignments based on satisfied conditions
    const playersAfterTeams = updateTeamAssignments(playersAfterCollection, conditions, state.bidderId!);

    // Find next player index (winner leads next trick)
    const winnerIndex = playersAfterTeams.findIndex((p) => p.id === winnerId);

    const completedTricks = [...state.tricks, completedTrick];

    // Check if game is over (all cards played)
    const allCardsPlayed = playersAfterTeams.every((p) => p.hand.length === 0);

    if (allCardsPlayed) {
      nextState = computeFinalScores({
        ...nextState,
        players: playersAfterTeams,
        tricks: completedTricks,
        currentTrick: null,
        currentPlayerIndex: winnerIndex,
        teammateConditions: conditions,
      });
    } else {
      nextState = {
        ...nextState,
        players: playersAfterTeams,
        tricks: completedTricks,
        currentTrick: null,
        currentPlayerIndex: winnerIndex,
        teammateConditions: conditions,
      };
    }
  } else {
    // Move to the next player clockwise
    const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    nextState = {
      ...nextState,
      currentPlayerIndex: nextPlayerIndex,
    };
  }

  return nextState;
}

// ─── Scoring & Final State ───────────────────────────────────────────────────

export function computeFinalScores(state: GameState): GameState {
  // Any player still 'unknown' at end is on opposition
  const players = state.players.map((p) => ({
    ...p,
    team: p.team === 'unknown' ? ('opposition' as const) : p.team,
    isRevealed: true,
  }));

  const { bidderTeam, opposition } = computeTeamScores(players);
  const bid = state.highestBid?.amount ?? 0;
  const winner = determineWinner(bidderTeam, bid);

  return {
    ...state,
    players,
    phase: 'finished',
    bidderTeamScore: bidderTeam,
    oppositionTeamScore: opposition,
    winner,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function resetForRematch(state: GameState): GameState {
  const deckCount = state.deckCount;
  return {
    phase: 'lobby',
    players: state.players.map((p) => ({
      ...p,
      hand: [],
      collectedCards: [],
      team: 'unknown' as const,
      isRevealed: false,
    })),
    deckCount,
    totalPoints: deckCount === 1 ? 250 : 500,
    minBid: getMinBid(deckCount),
    removedCards: [],

    bids: [],
    highestBid: null,
    bidderId: null,
    biddingQueue: [],

    trumpSuit: null,
    teammateConditions: [],
    maxTeammateCount: getMaxTeammateCount(state.players.length),

    cardInstanceTracker: new Map(),

    tricks: [],
    currentTrick: null,
    currentPlayerIndex: 0,

    bidderTeamScore: 0,
    oppositionTeamScore: 0,
    winner: null,
  };
}

function updateTeamAssignments(
  players: Player[],
  conditions: TeammateCondition[],
  bidderId: string,
): Player[] {
  // Collect player IDs from satisfied, non-collapsed conditions
  const teammateIds = new Set<string>();
  for (const condition of conditions) {
    if (condition.satisfied && !condition.collapsed && condition.satisfiedByPlayerId) {
      teammateIds.add(condition.satisfiedByPlayerId);
    }
  }

  return players.map((p) => {
    if (p.id === bidderId) {
      return { ...p, team: 'bidder' as const, isRevealed: true };
    }
    if (teammateIds.has(p.id)) {
      return { ...p, team: 'bidder' as const, isRevealed: true };
    }
    return p;
  });
}
