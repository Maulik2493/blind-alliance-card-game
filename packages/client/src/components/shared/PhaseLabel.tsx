import type { GamePhase } from '@blind-alliance/core';

const phaseLabels: Record<GamePhase, string> = {
  lobby: 'Waiting for players',
  dealing: 'Dealing cards',
  bidding: 'Bidding',
  trump_select: 'Trump Selection',
  teammate_select: 'Teammate Selection',
  playing: 'Playing',
  reveal: 'Reveal',
  finished: 'Game Over',
};

const phaseColors: Record<GamePhase, string> = {
  lobby: 'bg-gray-600',
  dealing: 'bg-yellow-600',
  bidding: 'bg-blue-600',
  trump_select: 'bg-purple-600',
  teammate_select: 'bg-indigo-600',
  playing: 'bg-green-600',
  reveal: 'bg-orange-600',
  finished: 'bg-red-600',
};

interface PhaseLabelProps {
  phase: GamePhase;
}

export function PhaseLabel({ phase }: PhaseLabelProps) {
  return (
    <span className={`${phaseColors[phase]} text-white text-xs font-semibold px-2 py-1 rounded-full`}>
      {phaseLabels[phase]}
    </span>
  );
}
