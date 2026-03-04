import type { Card } from './card';

// ─── Player Type ─────────────────────────────────────────────────────────────

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  collectedCards: Card[];
  team: 'bidder' | 'opposition' | 'unknown';
  isRevealed: boolean;
}
