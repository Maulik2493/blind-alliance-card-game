import type { Card, Suit, Rank } from './card';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CardRevealCondition {
  type: 'card_reveal';
  suit: Suit;
  rank: Rank;
  instance: 1 | 2;
  satisfied: boolean;
  collapsed: boolean;
  satisfiedByPlayerId: string | null;
}

export interface FirstTrickWinCondition {
  type: 'first_trick_win';
  satisfied: boolean;
  collapsed: boolean;
  satisfiedByPlayerId: string | null;
}

export type TeammateCondition = CardRevealCondition | FirstTrickWinCondition;

// ─── Condition Checking ──────────────────────────────────────────────────────

export function checkCardPlayConditions(
  play: { playerId: string; card: Card },
  bidderId: string,
  conditions: TeammateCondition[],
  cardInstanceTracker: Map<string, number>,
): TeammateCondition[] {
  const key = `${play.card.suit}-${play.card.rank}`;
  const currentInstance = (cardInstanceTracker.get(key) ?? 0) + 1;
  cardInstanceTracker.set(key, currentInstance);

  const updated = conditions.map((condition) => {
    if (condition.type !== 'card_reveal') return condition;
    if (condition.satisfied || condition.collapsed) return condition;

    if (
      condition.suit === play.card.suit &&
      condition.rank === play.card.rank &&
      condition.instance === currentInstance
    ) {
      if (play.playerId === bidderId) {
        return { ...condition, collapsed: true };
      } else {
        return { ...condition, satisfied: true, satisfiedByPlayerId: play.playerId };
      }
    }

    return condition;
  });

  return resolveCollapses(updated);
}

// ─── First Trick Win Resolution ──────────────────────────────────────────────

export function resolveFirstTrickWin(
  winnerId: string,
  bidderId: string,
  conditions: TeammateCondition[],
): TeammateCondition[] {
  const updated = conditions.map((condition) => {
    if (condition.type !== 'first_trick_win') return condition;
    if (condition.satisfied || condition.collapsed) return condition;

    if (winnerId === bidderId) {
      return { ...condition, collapsed: true };
    } else {
      return { ...condition, satisfied: true, satisfiedByPlayerId: winnerId };
    }
  });

  return resolveCollapses(updated);
}

// ─── Collapse Duplicates ─────────────────────────────────────────────────────

export function resolveCollapses(conditions: TeammateCondition[]): TeammateCondition[] {
  const seen = new Set<string>();
  return conditions.map((condition) => {
    if (!condition.satisfied || condition.collapsed || condition.satisfiedByPlayerId === null) {
      return condition;
    }

    if (seen.has(condition.satisfiedByPlayerId)) {
      return { ...condition, collapsed: true, satisfied: false };
    }

    seen.add(condition.satisfiedByPlayerId);
    return condition;
  });
}
