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

  // Pre-compute valid card keys for O(1) lookup
  const validCardKeys = new Set(
    valid.map((v) => `${v.suit}-${v.rank}-${v.deckIndex}`),
  );

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

      {/* Mobile layout: horizontal scroll */}
      <div className="md:hidden w-full">
        <div
          className="scroll-x w-full flex flex-row items-end"
          style={{
            paddingTop: '1.5rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            paddingBottom: '0.5rem',
          }}
        >
          {myHand.map((card, index) => {
            const cardKey = `${card.suit}-${card.rank}-${card.deckIndex}`;
            const isValid = validCardKeys.has(cardKey);
            const isLifted = myTurn && isValid;

            return (
              <div
                key={cardKey}
                className="transition-transform duration-200"
                style={{
                  '--card-width': '4.5rem',
                  marginLeft: index === 0 ? 0 : 'calc(var(--card-width) * -0.30)',
                  zIndex: isLifted ? index + 20 : index,
                  position: 'relative',
                  flexShrink: 0,
                  transform: isLifted ? 'translateY(-1rem)' : 'translateY(0)',
                } as React.CSSProperties}
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
          {/* Right padding spacer so last card scrolls fully into view */}
          <div style={{ minWidth: '1rem', flexShrink: 0 }} aria-hidden />
        </div>
      </div>

      {/* Desktop layout: flex-wrap row */}
      <div className="hidden md:flex flex-wrap" style={{ gap: '0.5rem' }}>
        {myHand.map((card) => {
          const cardKey = `${card.suit}-${card.rank}-${card.deckIndex}`;
          const isValid = validCardKeys.has(cardKey);
          const isLifted = myTurn && isValid;
          return (
            <div
              key={cardKey}
              className="transition-transform duration-200"
              style={{
                '--card-width': '5rem',
                transform: isLifted ? 'translateY(-0.75rem)' : 'translateY(0)',
              } as React.CSSProperties}
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
  );
}
