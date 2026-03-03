# Blind Alliance — Copilot Instructions

## Project Summary
Blind Alliance is a trick-taking, points-based card game for 3–10 players built in React + TypeScript.
One player (the Bidder) wins a bidding round, declares a trump suit, and secretly assigns teammates
using card-reveal conditions. Teammates are exposed mid-game as cards are played. The Bidder's team
wins if their collected points meet or exceed the bid.

---

## Folder Structure
- `src/core/`        — Pure game logic. No framework imports. Fully unit-testable.
- `src/store/`       — Zustand store. Wraps core functions. No direct UI logic.
- `src/components/`  — React UI. Reads from store only. Never imports from core/ directly.
- `tests/core/`      — Unit tests for all core logic using Vitest.

---

## Key Types
```ts
type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
  points: number;      // 0, 5, 10, or 30
  deckIndex: 0 | 1;   // Distinguishes duplicate cards in 2-deck games
}

interface TrickPlay {
  playerId: string;
  card: Card;
  playOrder: number;   // Clockwise position within the trick (1 = first played, N = last)
}

interface Trick {
  id: number;
  ledSuit: Suit;
  plays: TrickPlay[];
  winnerId: string | null;
  pointsInTrick: number;
}

interface TeammateCondition {
  type: 'card_reveal' | 'first_trick_win';
  suit?: Suit;
  rank?: Rank;
  instance?: 1 | 2;              // 1-deck games always use 1
  satisfied: boolean;
  collapsed: boolean;             // True when the slot is voided
  satisfiedByPlayerId: string | null;
}

type GamePhase =
  | 'lobby' | 'dealing' | 'bidding' | 'trump_select'
  | 'teammate_select' | 'playing' | 'reveal' | 'finished';

interface GameState {
  phase: GamePhase;
  players: Player[];
  deckCount: 1 | 2;
  totalPoints: 250 | 500;
  minBid: 125 | 250;
  removedCards: Card[];                        // Cards stripped during setup balancing
  bids: Bid[];
  highestBid: Bid | null;
  bidderId: string | null;
  trumpSuit: Suit | null;
  teammateConditions: TeammateCondition[];
  maxTeammateCount: number;
  cardInstanceTracker: Map<string, number>;   // key: "suit-rank", tracks play count per card type
  tricks: Trick[];
  currentTrick: Trick | null;
  currentPlayerIndex: number;
  bidderTeamScore: number;
  oppositionTeamScore: number;
  winner: 'bidder_team' | 'opposition_team' | null;
}
```

---

## Card Points
- 3 of Spades (`suit === 'spades' && rank === 3`) → **30 points**
- Any 5 (`rank === 5`) → **5 points**
- 10, J, Q, K, A (any suit) → **10 points each**
- All other cards → **0 points**
- Total per deck: **250 points**. Two decks: **500 points**.

## Card Rank Order (low → high)
2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A
getRankValue(): 2→2, 3→3, ... 10→10, J→11, Q→12, K→13, A→14

---

## Decks and Players
- 3–5 players → 1 deck
- 6–10 players → 2 decks

---

## Setup Balancing (removeBalancingCards)
Cards are removed before dealing so the total is evenly divisible by player count.
- Remove lowest-rank cards first (rank 2 first, then rank 3 of non-spade suits, etc.)
- Remove lowest deckIndex first when two decks are present
- **NEVER remove the 3 of Spades** (`suit === 'spades' && rank === 3`) — skip it and remove next
- Store all removed cards in `GameState.removedCards`

---

## Bidding Rules
- Minimum bid: `deckCount === 1 ? 125 : 250`
- Each new bid must be strictly greater than the current highest
- Players may pass
- If all players pass with no bid placed → re-deal
- Highest bidder becomes the Bidder

---

## Team Size Formula
```ts
maxBidderTeamSize = Math.floor(playerCount / 2)  // Bidder counts as 1
maxTeammateCount  = maxBidderTeamSize - 1
```

| Players | Max Team | Teammates |
|---------|----------|-----------|
| 3       | 1        | 0         |
| 4–5     | 2        | 1         |
| 6–7     | 3        | 2         |
| 8–9     | 4        | 3         |
| 10      | 5        | 4         |

---

## Teammate Conditions

### Card Reveal Condition
The player who plays the named card becomes the Bidder's teammate at the moment they play it.
- 1-deck games: name a card (suit + rank)
- 2-deck games: name a card + instance (1st or 2nd play of that card across all tricks)
- **Only cards present in the dealt deck may be named** — filter using `removedCards`
- `cardInstanceTracker` (Map, key: `"suit-rank"`) is incremented each time a card type is played
  and used to match the correct instance

### First Trick Win Condition
Whoever wins trick 1 becomes the Bidder's teammate.

### Collapse Rules (reduce teammate count)
1. Bidder plays their own named card → condition collapsed, no teammate gained
2. Bidder wins trick 1 with a first-trick-win condition → condition collapsed
3. Two conditions resolve to the same player → first stands, second collapses
4. All collapses result in a smaller Bidder team — this is accepted and not recoverable

---

## Trick Resolution (resolveTrick)
```
1. Collect all plays where card.suit === trumpSuit
2. If any trump plays exist:
     winner = highest rank among them
     on rank tie → higher playOrder wins  ← SECOND PLAYED WINS
3. If no trump plays:
     winner = highest rank among plays where card.suit === trick.ledSuit
     on rank tie → higher playOrder wins  ← SECOND PLAYED WINS
4. Fuse cards (not led suit, not trump) are NEVER candidates to win
```

### Fuse Card
A fuse card is any card that is neither the led suit nor the trump suit.
Played when a player cannot follow suit and chooses not to (or cannot) play trump.
`isFuseCard(card, ledSuit, trumpSuit): card.suit !== ledSuit && card.suit !== trumpSuit`

### Valid Card Rules (getValidCards)
1. If ledSuit is null (first play of trick) → all cards valid
2. If player has any card matching ledSuit → must play one of those only
3. If player has no ledSuit card → any card is valid (trump or fuse)

---

## Duplicate Card Tiebreak (2-deck games only)
When two plays have identical suit AND rank:
- The play with the **higher `playOrder`** wins (second played takes priority)
- `playOrder` is assigned in clockwise sequence within the trick: 1 = first player, N = last player
- This applies to both trump ties and led-suit ties

---

## Teammate Selector UI Rules
- Only shown to the Bidder, after trump is selected
- Card options are derived from `getAvailableConditionCards(dealtCards, removedCards)`
- A card is available if at least one instance was not removed during balancing
- Instance dropdown (1st / 2nd) is shown only when `deckCount === 2` AND both instances exist
- Removed cards must NEVER appear as selectable options
- Duplicate conditions (same suit + rank + instance) are not allowed
- Submit is disabled until all teammate slots are filled

---

## Scoring
```ts
bidderTeamScore = sum of collectedCards[].points for players where team === 'bidder'
oppositionScore = sum of collectedCards[].points for players where team === 'opposition'
winner = bidderTeamScore >= bid ? 'bidder_team' : 'opposition_team'
```

---

## Invariants (Never Violate These)
- 3 of Spades is never removed during setup balancing
- Removed cards are never shown as condition options in the UI
- `playOrder` must always be set when adding a play to a trick
- `cardInstanceTracker` must be updated before condition checking on every card play
- core/ functions are pure — no side effects, no store imports, no React imports
- All state lives in memory — never use localStorage or sessionStorage