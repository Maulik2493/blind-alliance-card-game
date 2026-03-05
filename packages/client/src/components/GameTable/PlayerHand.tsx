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

  const isCardValid = (card: typeof myHand[0]) =>
    valid.some(
      (v) => v.suit === card.suit && v.rank === card.rank && v.deckIndex === card.deckIndex,
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

      {/* Mobile layout */}
      <div className="md:hidden w-full overflow-x-auto pb-2">
        <div
          className="relative mx-auto"
          style={{
            height: '132px',
            width: `${Math.min(
              64 + 48 * Math.max(myHand.length - 1, 0),
              myHand.length * 48 + 20,
            )}px`,
            minWidth: '100%',
          }}
        >
          {myHand.map((card, index) => {
            const isValid = isCardValid(card);
            const offset =
              myHand.length <= 8
                ? 48
                : Math.floor((window.innerWidth - 48) / (myHand.length - 1));
            return (
              <div
                key={`${card.suit}-${card.rank}-${card.deckIndex}`}
                className={`absolute transition-transform duration-150 ${
                  isValid && myTurn ? '-translate-y-3' : 'translate-y-0'
                }`}
                style={{ left: `${index * offset}px`, top: '22px', zIndex: index }}
              >
                <CardComponent
                  card={card}
                  onClick={myTurn && isValid ? () => playCard(card) : undefined}
                  disabled={!myTurn || !isValid}
                  highlighted={myTurn && isValid}
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
          />
        ))}
      </div>
    </div>
  );
}
