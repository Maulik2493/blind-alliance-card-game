import type { GameAdapter } from '@blind-alliance/core-engine';
import { BlindAllianceAdapter } from './adapters/BlindAllianceAdapter';

// ─── Game Metadata ───────────────────────────────────────────────────────────

export interface GameMeta {
  gameId: string;
  gameName: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  adapter: GameAdapter<any, any>;
}

// ─── Game Registry ───────────────────────────────────────────────────────────
// Add new games here — server picks them up automatically.

export const GAME_REGISTRY: Record<string, GameMeta> = {
  'blind-alliance': {
    gameId: 'blind-alliance',
    gameName: 'Blind Alliance',
    description:
      'A trick-taking game where the bidder secretly assigns ' +
      'teammates using card conditions. Collect enough points ' +
      'to meet your bid before your identity is revealed.',
    minPlayers: 3,
    maxPlayers: 10,
    adapter: new BlindAllianceAdapter(),
  },
};

export function getAdapter(gameId: string): GameMeta {
  const meta = GAME_REGISTRY[gameId];
  if (!meta) throw new Error(`Unknown game: ${gameId}`);
  return meta;
}

/** Serializable game list sent to clients (no adapter instance) */
export function getGameList(): Omit<GameMeta, 'adapter'>[] {
  return Object.values(GAME_REGISTRY).map(
    ({ adapter: _adapter, ...meta }) => meta,
  );
}
