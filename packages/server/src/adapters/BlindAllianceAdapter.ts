import type { GameAdapter } from '@blind-alliance/core-engine';
import type {
  GameState,
  Suit,
  TeammateCondition,
  Card,
  Trick,
  Bid,
} from '@blind-alliance/core';
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
  getBidderTeamTotal,
  getOppositionTeamTotal,
  resetForRematch,
  getMinBid,
  getMaxTeammateCount,
} from '@blind-alliance/core';
import type { PublicPlayer, ClientGameState } from '../events';

// ─── Blind Alliance Game Adapter ─────────────────────────────────────────────

export class BlindAllianceAdapter
  implements GameAdapter<GameState, ClientGameState>
{
  gameId = 'blind-alliance';
  gameName = 'Blind Alliance';

  initGame(
    players: { id: string; name: string }[],
    _options?: Record<string, unknown>,
  ): GameState {
    // Build state from player names, then override IDs
    const state = initGame(players.map((p) => p.name));
    return {
      ...state,
      players: state.players.map((p, i) => ({
        ...p,
        id: players[i]!.id,
      })),
    };
  }

  handleEvent(
    state: GameState,
    playerId: string,
    event: string,
    payload: unknown,
  ): GameState {
    const data = (payload ?? {}) as Record<string, unknown>;

    switch (event) {
      case 'start_game':
      case 'deal_cards': {
        const dealt = dealCards(state);
        return {
          ...dealt,
          phase: 'bidding',
          biddingQueue: dealt.players.map((p) => p.id),
          bids: [],
          highestBid: null,
          bidderId: null,
        };
      }

      case 'add_player':
        return addPlayerToLobby(state, data.playerId as string, data.playerName as string);

      case 'remove_player':
        return removePlayerFromLobby(state, playerId);

      case 'place_bid':
        return placeBid(state, playerId, data.amount as number);

      case 'pass_bid':
        return passBid(state, playerId);

      case 'select_trump':
        return selectTrump(state, data.suit as Suit);

      case 'set_conditions':
        return setTeammateConditions(state, data.conditions as TeammateCondition[]);

      case 'play_card': {
        const cardId = data.cardId as string;
        const { suit, rank, deckIndex } = parseCardId(cardId);
        const player = state.players.find((p) => p.id === playerId);
        if (!player) throw new Error('Player not found');

        const card = player.hand.find(
          (c) => c.suit === suit && c.rank === rank && c.deckIndex === deckIndex,
        );
        if (!card) throw new Error('Card not in hand');

        const ledSuit = state.currentTrick?.ledSuit ?? null;
        const validCards = getValidCards(player.hand, ledSuit, state.trumpSuit!);
        const isValid = validCards.some(
          (c) => c.suit === card.suit && c.rank === card.rank && c.deckIndex === card.deckIndex,
        );
        if (!isValid) throw new Error('Invalid card play — must follow suit');

        return playCard(state, playerId, card);
      }

      default:
        throw new Error(`Unknown event: ${event}`);
    }
  }

  getSanitizedState(state: GameState, playerId: string): ClientGameState {
    const player = state.players.find((p) => p.id === playerId);
    return {
      phase: state.phase,
      players: getPublicPlayers(state),
      myHand: player?.hand ?? [],
      deckCount: state.deckCount,
      totalPoints: state.totalPoints,
      minBid: state.minBid,
      removedCards: state.removedCards,
      bids: state.bids,
      highestBid: state.highestBid,
      bidderId: state.bidderId,
      trumpSuit: state.trumpSuit,
      teammateConditions: state.teammateConditions,
      maxTeammateCount: state.maxTeammateCount,
      tricks: state.tricks,
      currentTrick: state.currentTrick,
      currentPlayerIndex: state.currentPlayerIndex,
      biddingQueue: state.biddingQueue,
      bidderTeamScore: state.bidderTeamScore,
      oppositionTeamScore: state.oppositionTeamScore,
      bidderTeamTotal: getBidderTeamTotal(state),
      oppositionTeamTotal: getOppositionTeamTotal(state),
      winner: state.winner,
    };
  }

  isGameOver(state: GameState): boolean {
    return state.phase === 'finished';
  }

  resetForRematch(state: GameState): GameState {
    return resetForRematch(state);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPublicPlayers(state: GameState): PublicPlayer[] {
  return state.players.map((p) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    isRevealed: p.isRevealed,
    cardCount: p.hand.length,
    collectedPoints: p.collectedCards.reduce((sum, c) => sum + c.points, 0),
    isConnected: p.isConnected,
  }));
}

type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A';

function parseCardId(cardId: string): { suit: Suit; rank: Rank; deckIndex: 0 | 1 } {
  const parts = cardId.split('-');
  if (parts.length < 3) {
    throw new Error(`Invalid cardId format: ${cardId}`);
  }

  const suit = parts[0] as Suit;
  const deckIndex = parseInt(parts[parts.length - 1]!, 10) as 0 | 1;
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
