# Blind Alliance — Game Design Document

## 1. Core Entities

### 1.1 Card
```ts
type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
  points: number;     // 0, 5, 10, or 30
  deckIndex: 0 | 1;  // 0 for single-deck games; 0 or 1 distinguishes duplicates in 2-deck games
}
```

**Point assignment logic:**
- `suit === 'spades' && rank === 3` → 30
- `rank === 5` → 5
- `rank === 10 || rank === 'J' || rank === 'Q' || rank === 'K' || rank === 'A'` → 10
- else → 0

**Rank order for comparison (low → high):** 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A (Ace = 14)

---

### 1.2 Player
```ts
interface Player {
  id: string;
  name: string;
  hand: Card[];
  collectedCards: Card[];
  team: 'bidder' | 'opposition' | 'unknown';
  isRevealed: boolean;
}
```

---

### 1.3 TeammateCondition
```ts
type ConditionType = 'card_reveal' | 'first_trick_win';

interface CardRevealCondition {
  type: 'card_reveal';
  suit: Suit;
  rank: Rank;
  instance: 1 | 2;            // Always 1 in single-deck games
  satisfied: boolean;
  collapsed: boolean;          // True if slot was voided
  satisfiedByPlayerId: string | null;
}

interface FirstTrickWinCondition {
  type: 'first_trick_win';
  satisfied: boolean;
  collapsed: boolean;
  satisfiedByPlayerId: string | null;
}

type TeammateCondition = CardRevealCondition | FirstTrickWinCondition;
```

---

### 1.4 RemovedCards Registry
```ts
// Tracks which cards were removed during setup balancing
// Used to filter options shown to Bidder during teammate condition setup
interface RemovedCardsRegistry {
  removedCards: Card[];   // Cards stripped during balancing
  isRemoved: (suit: Suit, rank: Rank, deckIndex: 0 | 1) => boolean;
  isCardAvailable: (suit: Suit, rank: Rank) => boolean; // True if at least one instance remains
}
```

---

### 1.5 Trick
```ts
interface TrickPlay {
  playerId: string;
  card: Card;
  playOrder: number;   // Clockwise sequence within the trick (1-indexed)
                       // Used for duplicate card tiebreaking in 2-deck games
}

interface Trick {
  id: number;
  ledSuit: Suit;
  plays: TrickPlay[];
  winnerId: string | null;
  pointsInTrick: number;
}
```

---

### 1.6 GameState
```ts
type GamePhase =
  | 'lobby'
  | 'dealing'
  | 'bidding'
  | 'trump_select'
  | 'teammate_select'
  | 'playing'
  | 'reveal'
  | 'finished';

interface GameState {
  phase: GamePhase;
  players: Player[];
  deckCount: 1 | 2;
  totalPoints: 250 | 500;
  minBid: 125 | 250;
  removedCards: Card[];           // Cards removed during balancing

  bids: Bid[];
  highestBid: Bid | null;
  bidderId: string | null;

  trumpSuit: Suit | null;
  teammateConditions: TeammateCondition[];
  maxTeammateCount: number;

  cardInstanceTracker: Map<string, number>;  // key: "suit-rank", value: count played so far

  tricks: Trick[];
  currentTrick: Trick | null;
  currentPlayerIndex: number;

  bidderTeamScore: number;
  oppositionTeamScore: number;
  winner: 'bidder_team' | 'opposition_team' | null;
}
```

---

## 2. Game Phase State Machine
```
lobby
  └─> dealing
        └─> bidding
              └─> trump_select
                    └─> teammate_select
                          └─> playing
                                └─> reveal
                                      └─> finished
```

---

## 3. Key Business Rules as Functions

### 3.1 Deck Setup
```
function buildDeck(deckIndex: 0 | 1): Card[]
  Creates 52 cards. Assigns points via getCardPoints(). Tags with deckIndex.

function removeBalancingCards(cards: Card[], playerCount: number): Card[]
  Goal: cards.length % playerCount === 0
  Sort candidates by rank ascending (2 first), then by deckIndex ascending.
  NEVER remove the 3 of Spades (suit='spades', rank=3).
  Remove cards one by one from lowest rank until count is divisible.
  Return remaining cards and log removed cards into removedCards[].

function buildGameDeck(playerCount: number): { cards: Card[], removedCards: Card[] }
  Builds 1 or 2 decks, shuffles, balances, returns both.
```

### 3.2 Bidding
```
function getMinBid(deckCount: 1 | 2): number
  return deckCount === 1 ? 125 : 250

function isValidBid(amount: number, currentHighest: number | null, deckCount: 1 | 2): boolean
  amount >= getMinBid(deckCount) && amount > (currentHighest ?? 0)

function getMaxTeammateCount(playerCount: number): number
  return Math.floor(playerCount / 2) - 1
```

### 3.3 Available Cards for Teammate Conditions
```
function getAvailableConditionCards(allCards: Card[], removedCards: Card[]): AvailableCard[]
  Returns cards that exist in the deck after balancing.
  For 2-deck games: tracks how many instances of each card exist (1 or 2).
  This list is used to populate the Bidder's UI — removed cards are NEVER shown.

  For each unique (suit, rank) combination:
    count = number of non-removed instances
    if count === 0: exclude entirely
    if count === 1: only instance '1st' is available
    if count === 2: both '1st' and '2nd' are available
```

### 3.4 Trick Resolution
```
function resolveTrick(trick: Trick, trumpSuit: Suit): string  // returns winnerId

  Step 1: Collect all trump plays
    trumpPlays = trick.plays.filter(p => p.card.suit === trumpSuit)

  Step 2: If any trump plays exist:
    Find highest rank among trumpPlays.
    If tie in rank (same suit+rank, 2-deck): the play with higher playOrder wins.
    Return that play's playerId.

  Step 3: If no trump plays:
    ledPlays = trick.plays.filter(p => p.card.suit === trick.ledSuit)
    Find highest rank among ledPlays.
    If tie in rank (same suit+rank, 2-deck): the play with higher playOrder wins.
    Return that play's playerId.

  Note: Fuse cards (not trump, not led suit) can never win and are ignored in resolution.

function isFuseCard(card: Card, ledSuit: Suit, trumpSuit: Suit): boolean
  return card.suit !== ledSuit && card.suit !== trumpSuit
```

### 3.5 Duplicate Card Tiebreak (2-Deck)
```
When two plays have identical suit and rank:
  The play with the HIGHER playOrder value wins.
  playOrder is assigned in clockwise sequence within the trick (first player = 1, last = N).
  So "second played" = higher playOrder = wins.
```

### 3.6 Teammate Condition Checking
```
function checkCardPlayConditions(
  play: TrickPlay,
  bidderId: string,
  conditions: TeammateCondition[],
  cardInstanceTracker: Map<string, number>
): TeammateCondition[]

  key = `${play.card.suit}-${play.card.rank}`
  increment cardInstanceTracker[key]
  currentInstance = cardInstanceTracker[key]

  For each unsatisfied CardRevealCondition:
    if condition.suit === play.card.suit
    && condition.rank === play.card.rank
    && condition.instance === currentInstance:
      if play.playerId === bidderId:
        mark condition.collapsed = true  // Bidder played own card
      else:
        mark condition.satisfied = true
        condition.satisfiedByPlayerId = play.playerId

  Then call resolveCollapses(conditions)
  Return updated conditions

function resolveFirstTrickWin(winnerId: string, bidderId: string, conditions: TeammateCondition[])
  For each unsatisfied FirstTrickWinCondition:
    if winnerId === bidderId:
      mark collapsed = true
    else:
      mark satisfied = true, satisfiedByPlayerId = winnerId
  Then call resolveCollapses(conditions)

function resolveCollapses(conditions: TeammateCondition[])
  Group satisfied conditions by satisfiedByPlayerId.
  For any player who satisfies more than one condition:
    keep the first satisfied condition, collapse all subsequent ones.
```

### 3.7 Scoring
```
function computeTeamScores(players: Player[]): { bidderTeam: number, opposition: number }
  bidderTeam = sum of collectedCards[].points for players where team === 'bidder'
  opposition = sum for players where team === 'opposition'

function determineWinner(bidderTeamScore: number, bid: number): 'bidder_team' | 'opposition_team'
  return bidderTeamScore >= bid ? 'bidder_team' : 'opposition_team'
```

---

## 4. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| 3 of Spades is never removed during balancing | Hard-coded guard in removeBalancingCards() |
| Bidder names a card that was removed | Impossible — UI only shows available cards |
| Bidder plays their own named card | Condition collapses; no teammate gained |
| Two conditions resolve to same player | First stands; second collapses |
| In 2-deck game, two players play same card | Second played (higher playOrder) wins |
| All players pass in bidding | Re-deal and restart |
| Player has no led-suit and no trump cards | Must play a fuse card |
| Only 1 instance of a card exists (other was removed) | Only '1st' instance available in condition picker |