import { useGameStore } from '../../store/gameStore';
import { CardComponent } from '../shared/CardComponent';

export function PlayerHand() {
  const myHand = useGameStore((s) => s.myHand);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const validCards = useGameStore((s) => s.validCards);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const playCard = useGameStore((s) => s.playCard);

  const myTurn = isMyTurn();
  const valid = myTurn ? validCards() : [];
  const current = currentPlayer();

  const isCardValid = (card: typeof myHand[0]) =>
    valid.some(
      (v) => v.suit === card.suit && v.rank === card.rank && v.deckIndex === card.deckIndex,
    );

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-lg font-bold">Your Hand</h3>
        {!myTurn && current && (
          <span className="text-sm text-gray-400">
            Waiting for {current.name}...
          </span>
        )}
        {myTurn && (
          <span className="text-sm text-green-400 font-semibold">Your turn!</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
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
