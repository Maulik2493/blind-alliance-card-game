import { useState, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { CardComponent } from '../shared/CardComponent';

export function PlayerHand({ disabled: forceDisabled }: { disabled?: boolean }) {
  const myHand = useGameStore((s) => s.myHand);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const validCards = useGameStore((s) => s.validCards);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const playCard = useGameStore((s) => s.playCard);

  const myTurn = forceDisabled ? false : isMyTurn();
  const valid = myTurn ? validCards() : [];
  const current = currentPlayer();

  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (myTurn) {
      setShowPulse(true);
      const t = setTimeout(() => setShowPulse(false), 3000);
      return () => clearTimeout(t);
    } else {
      setShowPulse(false);
    }
  }, [myTurn]);

  const isCardValid = (card: typeof myHand[0]) =>
    valid.some(
      (v) => v.suit === card.suit && v.rank === card.rank && v.deckIndex === card.deckIndex,
    );

  // Mobile fan offset calculation
  const CARD_WIDTH = 80;
  const MIN_VISIBLE = 28;
  const MAX_OFFSET = 56;
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth - 32 : 360;
  const naturalOffset = Math.floor(
    (screenWidth - CARD_WIDTH) / Math.max(myHand.length - 1, 1),
  );
  const offset = Math.min(MAX_OFFSET, Math.max(MIN_VISIBLE, naturalOffset));

  return (
    <div className="pb-16 md:pb-0">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-lg font-bold">Your Hand</h3>
        {!myTurn && current && !forceDisabled && (
          <span className="text-sm text-gray-400">
            Waiting for {current.name}...
          </span>
        )}
        {myTurn && (
          <span className="text-sm text-green-600 font-semibold">Your turn!</span>
        )}
      </div>

      {/* Mobile layout */}
      <div className="md:hidden w-full overflow-visible pb-2">
        <div
          className="relative mx-auto pt-6"
          style={{
            width: `${CARD_WIDTH + offset * Math.max(myHand.length - 1, 0)}px`,
            minWidth: '100%',
          }}
        >
          {myHand.map((card, index) => {
            const isValid = isCardValid(card);
            return (
              <div
                key={`${card.suit}-${card.rank}-${card.deckIndex}`}
                className={`transition-transform duration-150 ${
                  isValid && myTurn ? '-translate-y-4' : 'translate-y-0'
                } ${index === 0 ? '' : 'absolute'}`}
                style={index === 0
                  ? { position: 'relative', zIndex: 0 }
                  : { left: `${index * offset}px`, top: 0, zIndex: index }
                }
              >
                <CardComponent
                  card={card}
                  onClick={myTurn && isValid ? () => playCard(card) : undefined}
                  disabled={!myTurn || !isValid}
                  highlighted={myTurn && isValid}
                  animateHighlight={myTurn && isValid && showPulse}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop row layout */}
      <div className="hidden md:flex flex-wrap gap-2">
        {myHand.map((card, i) => (
          <CardComponent
            key={i}
            card={card}
            highlighted={myTurn && isCardValid(card)}
            disabled={!myTurn || !isCardValid(card)}
            onClick={myTurn && isCardValid(card) ? () => playCard(card) : undefined}
            animateHighlight={myTurn && isCardValid(card) && showPulse}
          />
        ))}
      </div>
    </div>
  );
}
