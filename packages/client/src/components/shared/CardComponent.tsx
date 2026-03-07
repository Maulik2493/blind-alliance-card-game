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
      <div
        className="shadow-md bg-white select-none overflow-hidden"
        style={{
          width: 'var(--card-width, 5rem)',
          height: 'calc(var(--card-width, 5rem) * 1.4)',
          borderRadius: 'calc(var(--card-width, 5rem) * 0.12)',
          flexShrink: 0,
        }}
      >
        <div className="w-full h-full bg-blue-700 bg-[repeating-linear-gradient(45deg,#1d4ed8,#1d4ed8_2px,#1e40af_2px,#1e40af_8px)]" style={{ borderRadius: 'calc(var(--card-width, 5rem) * 0.10)' }} />
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
      className={`border border-gray-200 shadow-md bg-white flex flex-col justify-between select-none transition-all duration-150 ${suitColor} ${highlightClass} ${disabledClass} ${bounceClass}`}
      style={{
        width: 'var(--card-width, 5rem)',
        height: 'calc(var(--card-width, 5rem) * 1.4)',
        borderRadius: 'calc(var(--card-width, 5rem) * 0.12)',
        padding: 'calc(var(--card-width, 5rem) * 0.08)',
        flexShrink: 0,
      }}
      onClick={!disabled ? onClick : undefined}
    >
      <div className="flex flex-col h-full">
        <span className="font-bold leading-none" style={{ fontSize: 'calc(var(--card-width, 5rem) * 0.22)' }}>{card.rank}</span>
        <span className="leading-none" style={{ fontSize: 'calc(var(--card-width, 5rem) * 0.17)' }}>{symbol}</span>
        <div className="flex-1 flex items-center justify-center">
          <span style={{ fontSize: 'calc(var(--card-width, 5rem) * 0.45)', lineHeight: 1 }}>{symbol}</span>
        </div>
        {card.points > 0 && (
          <span className="font-bold text-amber-600 text-right" style={{ fontSize: 'calc(var(--card-width, 5rem) * 0.17)' }}>
            {card.points}pts
          </span>
        )}
      </div>
    </div>
  );
}
