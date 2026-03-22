import type { Player } from './player';
import type { GameState } from './gameState';
import type { TeammateCondition } from './conditions';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScoreSummary {
  bidderTeam: number;
  opposition: number;
  bid: number;
  winner: 'bidder_team' | 'opposition_team';
  playerBreakdown: { playerId: string; name: string; team: string; points: number }[];
}

// ─── Scoring Functions ───────────────────────────────────────────────────────

export function computeTeamScores(players: Player[]): { bidderTeam: number; opposition: number } {
  let bidderTeam = 0;
  let opposition = 0;

  for (const player of players) {
    const playerPoints = player.collectedCards.reduce((sum, card) => sum + card.points, 0);
    if (player.team === 'bidder') {
      bidderTeam += playerPoints;
    } else {
      opposition += playerPoints;
    }
  }

  return { bidderTeam, opposition };
}

export function determineWinner(
  bidderTeamScore: number,
  bid: number,
): 'bidder_team' | 'opposition_team' {
  return bidderTeamScore >= bid ? 'bidder_team' : 'opposition_team';
}

export function buildScoreSummary(state: GameState): ScoreSummary {
  const { bidderTeam, opposition } = computeTeamScores(state.players);
  const bid = state.highestBid?.amount ?? 0;
  const winner = determineWinner(bidderTeam, bid);

  const playerBreakdown = state.players.map((player) => ({
    playerId: player.id,
    name: player.name,
    team: player.team,
    points: player.collectedCards.reduce((sum, card) => sum + card.points, 0),
  }));

  return { bidderTeam, opposition, bid, winner, playerBreakdown };
}

// ─── Dynamic Team Totals ─────────────────────────────────────────────────────

function getBidderTeamPlayerIds(
  bidderId: string | null,
  conditions: TeammateCondition[],
): Set<string> {
  const ids = new Set<string>();
  if (bidderId) ids.add(bidderId);
  conditions
    .filter((c) => c.satisfied && !c.collapsed && c.satisfiedByPlayerId)
    .forEach((c) => ids.add(c.satisfiedByPlayerId!));
  return ids;
}

export function getBidderTeamTotal(state: GameState): number {
  const bidderTeamPlayerIds = getBidderTeamPlayerIds(
    state.bidderId,
    state.teammateConditions,
  );

  return state.players
    .filter((p) => bidderTeamPlayerIds.has(p.id))
    .reduce(
      (sum, p) => sum + p.collectedCards.reduce((s, c) => s + c.points, 0),
      0,
    );
}

export function getOppositionTeamTotal(state: GameState): number | null {
  const allResolved = state.teammateConditions.every(
    (c) => c.satisfied || c.collapsed,
  );

  if (!allResolved) return null;

  const bidderTeamPlayerIds = getBidderTeamPlayerIds(
    state.bidderId,
    state.teammateConditions,
  );

  return state.players
    .filter((p) => !bidderTeamPlayerIds.has(p.id))
    .reduce(
      (sum, p) => sum + p.collectedCards.reduce((s, c) => s + c.points, 0),
      0,
    );
}
