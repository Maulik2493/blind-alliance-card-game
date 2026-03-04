import type { Card } from '@blind-alliance/core';

const suitSymbols: Record<string, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

interface CardComponentProps {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  highlighted?: boolean;
  faceDown?: boolean;
}

export function CardComponent({ card, onClick, disabled, highlighted, faceDown }: CardComponentProps) {
  if (faceDown) {
    return (
      <div className="rounded-lg border-2 border-gray-500 w-16 h-24 flex flex-col items-center justify-center bg-blue-900 text-gray-400 text-sm font-bold select-none">
        <span className="text-2xl">🂠</span>
      </div>
    );
  }

  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const textColor = isRed ? 'text-red-400' : 'text-white';
  const symbol = suitSymbols[card.suit] ?? '';

  const borderClass = highlighted
    ? 'border-green-400 ring-2 ring-green-400'
    : 'border-gray-500';

  const opacityClass = disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105';

  return (
    <div
      className={`rounded-lg border-2 w-16 h-24 flex flex-col items-center justify-center text-sm font-bold select-none transition-all bg-gray-800 ${textColor} ${borderClass} ${opacityClass}`}
      onClick={!disabled ? onClick : undefined}
    >
      <span className="text-lg">{card.rank}</span>
      <span className="text-xl">{symbol}</span>
      {card.points > 0 && (
        <span className="text-[10px] text-yellow-400 mt-0.5">{card.points}pts</span>
      )}
    </div>
  );
}
