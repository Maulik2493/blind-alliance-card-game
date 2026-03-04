# Blind Alliance — Copilot Instructions

## Project Summary
Blind Alliance is a trick-taking, points-based card game for 3–10 players built in React + TypeScript.
One player (the Bidder) wins a bidding round, declares a trump suit, and secretly assigns teammates
using card-reveal conditions. Teammates are exposed mid-game as cards are played. The Bidder's team
wins if their collected points meet or exceed the bid.

---

## Folder Structure
- `packages/core/`      — Pure game logic. No framework imports. Fully unit-testable.
- `packages/server/`    — Node.js + Express + Socket.IO server. Imports from core only.
- `packages/client/`    — React + Vite + Zustand frontend. Reads from store only.
- `packages/core/tests/` — Unit tests for all core logic using Vitest.

Module dependency rule:
  UI components → store → core logic
  core/ has NO dependency on store/ or components/
  store/ has NO dependency on components/

---

## Key Types
```ts
type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
  points: number;      // 0, 5, 10, or 30
  deckIndex: 0 | 1;   // Distinguishes the two physical cards in 2-deck games
                       // deckIndex is ONLY used for physical card identity
                       // it is NEVER used for instance tracking or condition logic
}

interface TrickPlay {
  playerId: string;
  card: Card;
  playOrder: number;   // Clockwise position within the trick (1 = first played, N = last)
                       // Used exclusively for duplicate card tiebreaking
}

interface Trick {
  id: number;
  ledSuit: Suit;
  plays: TrickPlay[];
  winnerId: string | null;
  pointsInTrick: number;
}

interface CardRevealCondition {
  type: 'card_reveal';
  suit: Suit;
  rank: Rank;
  instance: 1 | 2;             // Which chronological play of this suit+rank triggers this
  satisfied: boolean;
  collapsed: boolean;
  satisfiedByPlayerId: string | null;
}

interface FirstTrickWinCondition {
  type: 'first_trick_win';
  satisfied: boolean;
  collapsed: boolean;
  satisfiedByPlayerId: string | null;
}

type TeammateCondition = CardRevealCondition | FirstTrickWinCondition;

type GamePhase =
  | 'lobby' | 'dealing' | 'bidding' | 'trump_select'
  | 'teammate_select' | 'playing' | 'reveal' | 'finished';

interface GameState {
  phase: GamePhase;
  players: Player[];
  deckCount: 1 | 2;
  totalPoints: 250 | 500;
  minBid: 125 | 250;
  removedCards: Card[];
  bids: Bid[];
  highestBid: Bid | null;
  bidderId: string | null;
  trumpSuit: Suit | null;
  teammateConditions: TeammateCondition[];
  maxTeammateCount: number;
  cardInstanceTracker: Map<string, number>;  // key: "suit-rank" ONLY — never includes deckIndex
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
- ALL bids must be exact multiples of 5 (125, 130, 135 ... never 126, 141, etc.)
- Each new bid must be strictly greater than the current highest AND a multiple of 5
- nextValidBid(currentHighest, deckCount):
    if currentHighest is null → return getMinBid(deckCount)
    else → return Math.ceil((currentHighest + 1) / 5) * 5
  Examples: nextValidBid(140, 1) → 145, nextValidBid(150, 1) → 155
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

### No Hand Restriction
The Bidder may name ANY card that exists in the dealt deck as a condition,
including cards they currently hold in their own hand.
There is no exclusion based on the Bidder's hand.
The UI shows all available (non-removed) cards freely.

### Available Cards for Conditions
A card is available to name if at least one instance was not removed during balancing:
- Both instances of a card exist in dealt deck → instances [1, 2] available
- Only one instance exists (other was removed during balancing) → instance [1] only
- deckIndex is never used to determine availability — only removal status matters

### Card Reveal Condition
The player who plays the named card (matching suit+rank+instance) becomes
the Bidder's teammate at the exact moment they play it.

- 1-deck games: name a card by suit + rank (instance is always 1)
- 2-deck games: name a card by suit + rank + instance (1st or 2nd)
- Instance means: the Nth time that suit+rank is played chronologically in the game
  by ANY player including the Bidder
- Example: Bidder names "2nd A♠"
    Trick 3: Bidder plays A♠ → 1st instance → condition not triggered, tracker increments
    Trick 7: Player B plays A♠ → 2nd instance → condition triggers → Player B is teammate

### First Trick Win Condition
Whoever wins trick 1 becomes the Bidder's teammate.
- MAXIMUM ONE FirstTrickWin condition allowed per game regardless of deck count
  or number of teammate slots
- Core must reject conditions arrays with more than one FirstTrickWin entry
- UI must disable the FirstTrickWin option on all other slots once one slot uses it

### Turn Order After Teammate Selection
After setTeammateConditions() completes and phase transitions to 'playing':
  currentPlayerIndex = players.findIndex(p => p.id === bidderId)
The Bidder ALWAYS leads the first trick. This overrides any previous currentPlayerIndex.

---

## Instance Tracking

cardInstanceTracker: Map<string, number>
key format: `"suit-rank"` — e.g. "spades-A", "hearts-5"
**NEVER include deckIndex in the key**

- Incremented every time that suit+rank is played by ANYONE including the Bidder
- Tracks cumulative play count across ALL tricks
- 1st instance = first time that suit+rank is played in the entire game
- 2nd instance = second time that suit+rank is played in the entire game

On every card play:
  1. Increment tracker: cardInstanceTracker["suit-rank"]++
  2. currentInstance = cardInstanceTracker["suit-rank"]
  3. Check each unsatisfied, non-collapsed CardRevealCondition:
       if condition.suit === card.suit
       && condition.rank === card.rank
       && condition.instance === currentInstance:
         → condition is triggered (see collapse rules below)
       if condition.suit === card.suit
       && condition.rank === card.rank
       && condition.instance !== currentInstance:
         → tracker already incremented, condition untouched, wait silently

---

## Collapse Rules

A collapse sets condition.collapsed = true and grants no teammate for that slot.
The Bidder must accept all collapses — team size shrinks accordingly.

**Collapse Trigger 1 — Bidder self-play:**
  Condition's suit+rank+instance matches AND playerId === bidderId
  → condition collapses

**Collapse Trigger 2 — Duplicate player:**
  Two or more conditions resolve to the same satisfiedByPlayerId
  → keep the first satisfied condition, collapse all subsequent ones for that player
  → includes the case where one player holds both copies of a card in a 2-deck game
     and plays both, satisfying two conditions the Bidder set on that same card

**Non-collapse case:**
  Card matches condition's suit+rank but instance does not match yet
  → tracker increments, condition is completely untouched

After any condition is satisfied or collapsed, always call resolveCollapses()
to catch Trigger 2 across all conditions.

---

## Trick Resolution (resolveTrick)
```
1. Collect all plays where card.suit === trumpSuit
2. If any trump plays exist:
     winner = highest rank among them
     on rank tie (same suit+rank) → higher playOrder wins  ← SECOND PLAYED WINS
3. If no trump plays:
     winner = highest rank among plays where card.suit === trick.ledSuit
     on rank tie (same suit+rank) → higher playOrder wins  ← SECOND PLAYED WINS
4. Fuse cards (not led suit, not trump) are NEVER candidates to win
```

### Duplicate Card Tiebreak (2-deck games)
When two plays have identical suit AND rank:
- The play with the higher playOrder wins (second played takes priority)
- playOrder is assigned clockwise within the trick: 1 = first player, N = last
- deckIndex is not used for tiebreaking — only playOrder matters

### Fuse Card
Any card that is neither the led suit nor the trump suit.
Played when unable to follow suit. Can never win a trick.
`isFuseCard(card, ledSuit, trumpSuit): card.suit !== ledSuit && card.suit !== trumpSuit`

### Valid Card Rules (getValidCards)
1. ledSuit is null (first play of trick) → all cards valid
2. Player has any card matching ledSuit → must play one of those only
3. Player has no ledSuit card → any card valid (trump or fuse)

---

## Scoring
```ts
bidderTeamScore = sum of collectedCards[].points for players where team === 'bidder'
oppositionScore = sum of collectedCards[].points for players where team === 'opposition'
winner = bidderTeamScore >= bid ? 'bidder_team' : 'opposition_team'
```

---

## Socket Event Contract

CLIENT → SERVER:
  'join_room'       { playerName: string, roomId?: string }
  'start_game'      {}
  'place_bid'       { amount: number }
  'pass_bid'        {}
  'select_trump'    { suit: Suit }
  'set_conditions'  { conditions: TeammateCondition[] }
  'play_card'       { cardId: string }  ← format: "suit-rank-deckIndex" e.g. "spades-A-0"

SERVER → CLIENT:
  'room_joined'     { roomId, playerId, players: PublicPlayer[] }
  'player_joined'   { players: PublicPlayer[] }
  'game_started'    { hand: Card[], phase: GamePhase }
  'state_update'    { state: ClientGameState }  ← sanitized, no other players' hands
  'action_error'    { message: string }  ← only to the player who made the invalid action
  'game_over'       { winner, summary: ScoreSummary }

ClientGameState = full GameState with:
  players: PublicPlayer[]   ← no hands exposed
  myHand: Card[]            ← only this player's own cards

PublicPlayer = { id, name, team, isRevealed, cardCount }

---

## Invariants — Never Violate These
- 3 of Spades is never removed during setup balancing
- All bids must be exact multiples of 5
- nextValidBid() is used wherever the next valid bid amount is needed
- cardInstanceTracker key is ALWAYS "suit-rank" — never includes deckIndex
- deckIndex is ONLY used to distinguish physical cards — never for instance logic
- playOrder must always be set when adding a play to a trick
- cardInstanceTracker must be incremented BEFORE condition checking on every card play
- After setTeammateConditions(), currentPlayerIndex must be set to bidder's index
- Only one FirstTrickWin condition is allowed per game
- resolveCollapses() must be called after every condition satisfaction or collapse
- core/ functions are pure — no side effects, no store imports, no React imports
- All state lives in memory — never use localStorage or sessionStorage
- In TeammateSelectScreen, card options are derived exclusively from
  availableConditionCards() — never filtered by the bidder's hand.
  myHand is only used for displaying the bidder's own cards, not for
  restricting condition choices.