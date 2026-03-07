import type { Card, Suit } from '@blind-alliance/core';

const suitSymbols: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const suitColors: Record<Suit, string> = {
  spades: 'text-gray-900',
  hearts: 'text-red-500',
  diamonds: 'text-orange-500',
  clubs: 'text-emerald-700',
};

interface CardComponentProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  faceDown?: boolean;
  animateHighlight?: boolean;
}

export function CardComponent({ card, onClick, disabled, highlighted, faceDown, animateHighlight }: CardComponentProps) {
  if (faceDown) {
    return (
      <div className="rounded-xl border border-gray-200 shadow-md bg-white w-20 h-28 select-none overflow-hidden">
        <div className="w-full h-full rounded-lg bg-blue-700 bg-[repeating-linear-gradient(45deg,#1d4ed8,#1d4ed8_2px,#1e40af_2px,#1e40af_8px)]" />
      </div>
    );
  }

  const suitColor = suitColors[card.suit];
  const symbol = suitSymbols[card.suit] ?? '';

  const highlightClass = highlighted
    ? 'ring-2 ring-blue-400 ring-offset-1 -translate-y-2 shadow-blue-200'
    : '';

  const disabledClass = disabled
    ? 'opacity-40 cursor-not-allowed hover:shadow-md hover:translate-y-0'
    : 'cursor-pointer hover:shadow-lg hover:-translate-y-1';

  const bounceClass = animateHighlight ? 'animate-bounce' : '';

  return (
    <div
      className={`rounded-xl border border-gray-200 shadow-md bg-white w-20 h-28 flex flex-col justify-between p-1.5 select-none transition-all duration-150 ${suitColor} ${highlightClass} ${disabledClass} ${bounceClass}`}
      onClick={!disabled ? onClick : undefined}
    >
      <div className="flex flex-col h-full">
        <span className="text-base font-bold leading-none">{card.rank}</span>
        <span className="text-xs leading-none">{symbol}</span>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-3xl">{symbol}</span>
        </div>
        {card.points > 0 && (
          <span className="text-xs font-bold text-amber-600 text-right">
            {card.points}pts
          </span>
        )}
      </div>
    </div>
  );
}
