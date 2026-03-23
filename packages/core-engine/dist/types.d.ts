import type { Card } from './card';
export interface BasePlayer {
    id: string;
    name: string;
    isConnected: boolean;
}
export interface BaseGameState {
    phase: string;
    players: BasePlayer[];
}
export interface BaseClientGameState {
    phase: string;
    myHand: Card[];
}
/**
 * The interface every game adapter must implement.
 * The server calls methods on this interface — never game-specific code directly.
 */
export interface GameAdapter<TState extends BaseGameState = BaseGameState, TClientState extends BaseClientGameState = BaseClientGameState> {
    /** Unique identifier e.g. 'blind-alliance' */
    gameId: string;
    /** Display name shown in lobby e.g. 'Blind Alliance' */
    gameName: string;
    /** Initialize fresh game state for a set of players */
    initGame(players: Pick<BasePlayer, 'id' | 'name'>[], options?: Record<string, unknown>): TState;
    /**
     * Handle any client event — returns new state.
     * All game-specific events (bid, playCard etc) go through here.
     */
    handleEvent(state: TState, playerId: string, event: string, payload: unknown): TState;
    /** Strip hidden info (other players' hands) before sending to client */
    getSanitizedState(state: TState, playerId: string): TClientState;
    /** Whether game has ended */
    isGameOver(state: TState): boolean;
    /** Reset to lobby for rematch, preserving players and room metadata */
    resetForRematch(state: TState): TState;
}
//# sourceMappingURL=types.d.ts.map