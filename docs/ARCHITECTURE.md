# Blind Alliance — Architecture Guide

## Recommended Tech Stack

| Layer       | Suggestion                                          |
|-------------|-----------------------------------------------------|
| Frontend    | React + TypeScript                                  |
| State Mgmt  | Zustand or Redux Toolkit                            |
| Real-time   | Socket.IO (multiplayer) or local state (pass-and-play) |
| Styling     | Tailwind CSS                                        |
| Testing     | Vitest + React Testing Library                      |
| Backend     | Node.js + Express + Socket.IO (for multiplayer)     |

---

## Folder Structure
```
blind-alliance/
├── src/
│   ├── core/                      # Pure game logic — no UI, no framework
│   │   ├── card.ts                # Card type, getCardPoints(), getRankValue()
│   │   ├── deck.ts                # buildDeck(), removeBalancingCards(), buildGameDeck()
│   │   ├── bidding.ts             # isValidBid(), getMinBid(), getMaxTeammateCount()
│   │   ├── conditions.ts          # TeammateCondition types + all condition logic
│   │   ├── trick.ts               # Trick type, resolveTrick(), isFuseCard(), getValidCards()
│   │   ├── scoring.ts             # computeTeamScores(), determineWinner()
│   │   └── gameState.ts           # GameState type + all phase transition functions
│   │
│   ├── store/
│   │   ├── gameStore.ts           # Zustand store wrapping core functions
│   │   └── actions/
│   │       ├── dealActions.ts
│   │       ├── bidActions.ts
│   │       ├── setupActions.ts    # Trump + teammate condition selection
│   │       └── playActions.ts     # Card play, trick resolution, reveals
│   │
│   ├── components/
│   │   ├── Lobby/
│   │   ├── BiddingTable/
│   │   ├── TrumpSelector/
│   │   ├── TeammateSelector/      # Filtered to only show non-removed cards
│   │   ├── GameTable/
│   │   │   ├── PlayerHand.tsx
│   │   │   ├── TrickArea.tsx
│   │   │   ├── ScoreBoard.tsx
│   │   │   └── TeamReveal.tsx
│   │   └── Results/
│   │
│   ├── hooks/
│   │   ├── useGameState.ts
│   │   ├── useCurrentPlayer.ts
│   │   └── useValidMoves.ts
│   │
│   └── App.tsx
│
├── tests/
│   ├── core/
│   └── integration/
│
├── README.md
├── GAME_RULES.md
├── GAME_DESIGN.md
├── ARCHITECTURE.md
└── COPILOT_PROMPTS.md
```

---

## Module Dependency Rules
```
UI components → store → core logic

core/  has NO dependency on store/ or components/
store/ has NO dependency on components/
```

All game logic is pure and independently testable.

---

## Critical Design Notes

### Removed Cards Must Flow Through the Entire Stack
```
buildGameDeck()
  → returns { cards, removedCards }
  → stored in GameState.removedCards
  → passed to getAvailableConditionCards()
  → used to filter TeammateSelector UI options
```
The removed cards list must be available at every layer.

### playOrder Is Critical for 2-Deck Tiebreaking
Every `TrickPlay` must record its `playOrder` (clockwise sequence within the trick).
This is the sole mechanism for resolving duplicate card ties — the second played card wins.

### Condition Instance Tracking
`cardInstanceTracker` in GameState is a running `Map<string, number>`.
Key format: `"suit-rank"` (e.g. `"spades-A"`).
Incremented every time a card of that suit+rank is played, across all tricks.
This is how the system knows whether the current play is the 1st or 2nd instance.

---

## Data Flow: Card Play
```
Player selects a card
  → useValidMoves() confirms it's legal (follow suit / trump / fuse rules)
  → dispatch(playCard(card))
  → playOrder assigned = current plays.length + 1
  → card added to currentTrick.plays
  → cardInstanceTracker updated
  → checkCardPlayConditions() run → teammate reveals updated
  → if all players have played:
      resolveTrick() → winnerId determined (with duplicate tiebreak)
      if trick 1: resolveFirstTrickWin()
      resolveCollapses()
      points awarded to winner's collectedCards
      if cards remain in hands → start new trick (winner leads)
      else → computeTeamScores() → determineWinner() → phase = 'finished'
```

---

## Multiplayer (Optional)
```
Client                             Server
  |── joinGame(gameId) ──────────> |
  |<─ gameState ─────────────────  |
  |── placeBid(amount) ──────────> |── validate ──> update state
  |<─ bidResult ─────────────────  |
  |<─ broadcastState ────────────  | (to all players)
  |── playCard(cardId) ──────────> |── validate ──> resolveTrick()
  |<─ trickResult ───────────────  | (to all players)
```