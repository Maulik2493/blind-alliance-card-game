# Blind Alliance — Copilot Prompts: Phase 3 (Frontend UI)

## Context
- Each browser tab = one player
- Tailwind CSS is already set up
- UI goal: functional and minimal — enough to test all game scenarios
- Debug aids: game log panel + all-players state panel
- gameStore.ts currently uses local core logic — Phase 3 replaces it with
  a socket-driven store while preserving the same method names

All files go inside `packages/client/src/` unless stated otherwise.

---

## Step 3.1 — Socket Service
```
Create packages/client/src/socket.ts

This is a singleton Socket.IO client instance shared across the entire app.

1. Import { io } from 'socket.io-client'
2. Create and export a single socket instance:
     export const socket = io(
       import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
       { autoConnect: false }   ← we connect manually after player enters name
     )
3. Export a helper: export const connectSocket = () => socket.connect()
4. Export a helper: export const disconnectSocket = () => socket.disconnect()

No logic here — just the socket instance and connection helpers.
This file is imported by the store and nowhere else.
```

---

## Step 3.2 — Replace gameStore.ts
```
Replace the entire contents of packages/client/src/gameStore.ts.

The new store is socket-driven. Keep the same export name (useGameStore)
and preserve these method names so no downstream files break:
  currentPlayer(), validCards(), isMyTurn(), availableConditionCards(), currentTrickPlays()

Import { socket, connectSocket } from './socket'
Import all types from '@blind-alliance/core'
Import { getValidCards, getAvailableConditionCards } from '@blind-alliance/core'

── New State Shape ──────────────────────────────────────────────────────────

interface GameStore {
  // Identity
  myPlayerId: string | null
  myPlayerName: string | null
  roomId: string | null

  // Server-driven game state (ClientGameState from events.ts)
  phase: GamePhase
  players: PublicPlayer[]
  myHand: Card[]
  deckCount: 1 | 2
  totalPoints: number
  minBid: number
  removedCards: Card[]
  bids: Bid[]
  highestBid: Bid | null
  bidderId: string | null
  trumpSuit: Suit | null
  teammateConditions: TeammateCondition[]
  maxTeammateCount: number
  tricks: Trick[]
  currentTrick: Trick | null
  currentPlayerIndex: number
  bidderTeamScore: number
  oppositionTeamScore: number
  winner: 'bidder_team' | 'opposition_team' | null

  // UI state
  lastError: string | null
  gameLog: GameLogEntry[]
  isConnected: boolean

  // Actions — emit to server
  connect: (playerName: string, roomId?: string) => void
  startGame: () => void
  placeBid: (amount: number) => void
  passBid: () => void
  selectTrump: (suit: Suit) => void
  setTeammateConditions: (conditions: TeammateCondition[]) => void
  playCard: (card: Card) => void
  clearError: () => void

  // Selectors (computed from local state)
  currentPlayer: () => PublicPlayer | undefined
  validCards: () => Card[]
  isMyTurn: () => boolean
  availableConditionCards: () => AvailableConditionCard[]
  currentTrickPlays: () => TrickPlay[]
  amIBidder: () => boolean
}

── GameLogEntry ─────────────────────────────────────────────────────────────

interface GameLogEntry {
  id: number          ← auto-incrementing
  timestamp: string   ← HH:MM:SS
  message: string
}

── Initial State ────────────────────────────────────────────────────────────

Set all game state fields to safe defaults:
  phase: 'lobby', players: [], myHand: [], removedCards: [],
  bids: [], tricks: [], currentTrick: null, currentPlayerIndex: 0,
  bidderId: null, trumpSuit: null, teammateConditions: [],
  highestBid: null, maxTeammateCount: 0, deckCount: 1, totalPoints: 250,
  minBid: 125, bidderTeamScore: 0, oppositionTeamScore: 0, winner: null,
  myPlayerId: null, myPlayerName: null, roomId: null,
  lastError: null, gameLog: [], isConnected: false

── Socket Listener Setup ────────────────────────────────────────────────────

Create a function setupSocketListeners() called once at store init.
Wire these socket events to store state updates:

socket.on('connect', () =>
  set({ isConnected: true })
  addLog('Connected to server')

socket.on('disconnect', () =>
  set({ isConnected: false })
  addLog('Disconnected from server')

socket.on('room_joined', ({ roomId, playerId, players }) =>
  set({ roomId, myPlayerId: playerId, players })
  addLog(`Joined room ${roomId} as ${playerId}`)

socket.on('player_joined', ({ players }) =>
  set({ players })
  addLog(`Player joined. Total: ${players.length}`)

socket.on('game_started', ({ hand, phase }) =>
  set({ myHand: hand, phase })
  addLog('Game started — cards dealt')

socket.on('state_update', (state: ClientGameState) =>
  set({ ...state })                  ← spread entire ClientGameState
  addLog(deriveLogMessage(state))    ← see helper below

socket.on('action_error', ({ message }) =>
  set({ lastError: message })
  addLog(`ERROR: ${message}`)

socket.on('game_over', ({ winner, summary }) =>
  set({ winner, phase: 'finished' })
  addLog(`Game over — winner: ${winner}`)

── deriveLogMessage helper ──────────────────────────────────────────────────

function deriveLogMessage(state: ClientGameState): string
  Switch on state.phase:
    'bidding'          → `Bidding — current high: ${state.highestBid?.amount ?? 'none'}`
    'trump_select'     → `Bidder selecting trump suit`
    'teammate_select'  → `Bidder selecting teammates`
    'playing'          → derive from currentTrick:
                         if currentTrick has plays:
                           last play: `${lastPlay.playerId} played ${lastPlay.card.rank}${lastPlay.card.suit}`
                         if trick just completed (winnerId set):
                           `Trick won by ${currentTrick.winnerId}`
    'finished'         → `Game finished`
    default            → `Phase: ${state.phase}`

── Actions ──────────────────────────────────────────────────────────────────

connect: (playerName, roomId?) =>
  set({ myPlayerName: playerName })
  connectSocket()
  socket.emit('join_room', { playerName, roomId })

startGame: () => socket.emit('start_game', {})
placeBid: (amount) => socket.emit('place_bid', { amount })
passBid: () => socket.emit('pass_bid', {})
selectTrump: (suit) => socket.emit('select_trump', { suit })
setTeammateConditions: (conditions) => socket.emit('set_conditions', { conditions })
playCard: (card) =>
  const cardId = `${card.suit}-${card.rank}-${card.deckIndex}`
  socket.emit('play_card', { cardId })
clearError: () => set({ lastError: null })

── Selectors ────────────────────────────────────────────────────────────────

currentPlayer: () =>
  get().players[get().currentPlayerIndex]

validCards: () =>
  const { myHand, trumpSuit, currentTrick } = get()
  if (!trumpSuit) return myHand
  const ledSuit = currentTrick?.ledSuit ?? null
  return getValidCards(myHand, ledSuit, trumpSuit)

isMyTurn: () =>
  get().players[get().currentPlayerIndex]?.id === get().myPlayerId

amIBidder: () =>
  get().bidderId === get().myPlayerId

availableConditionCards: () =>
  const { myHand, players, removedCards } = get()
  const allDealtCards = players.flatMap(p => [])  ← server doesn't send other hands
  NOTE: server must include allDealtCards in ClientGameState for this to work.
  Alternative: store availableConditionCards directly in ClientGameState on server
  and just return get().availableConditionCards here.
  Use whichever approach matches your server's ClientGameState shape.

currentTrickPlays: () =>
  get().currentTrick?.plays ?? []

── Initialization ───────────────────────────────────────────────────────────

Call setupSocketListeners() immediately at the bottom of the create() call,
before returning the store object. This ensures listeners are registered once.
```

---

## Step 3.3 — App Router
```
Replace packages/client/src/App.tsx

App.tsx is the top-level router — it renders the correct screen based on phase.
It has no logic of its own, only reads phase from the store.

import { useGameStore } from './gameStore'
import { LobbyScreen } from './components/Lobby/LobbyScreen'
import { BiddingScreen } from './components/Bidding/BiddingScreen'
import { TrumpSelectScreen } from './components/TrumpSelect/TrumpSelectScreen'
import { TeammateSelectScreen } from './components/TeammateSelect/TeammateSelectScreen'
import { GameTableScreen } from './components/GameTable/GameTableScreen'
import { ResultsScreen } from './components/Results/ResultsScreen'
import { DebugPanel } from './components/Debug/DebugPanel'
import { GameLog } from './components/Debug/GameLog'
import { ErrorToast } from './components/shared/ErrorToast'

export default function App() {
  const phase = useGameStore(s => s.phase)

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <ErrorToast />
      <div className="flex h-screen">

        {/* Main game area */}
        <div className="flex-1 overflow-auto p-4">
          { phase === 'lobby'            && <LobbyScreen /> }
          { phase === 'dealing'          && <LobbyScreen /> }  ← show lobby while dealing
          { phase === 'bidding'          && <BiddingScreen /> }
          { phase === 'trump_select'     && <TrumpSelectScreen /> }
          { phase === 'teammate_select'  && <TeammateSelectScreen /> }
          { phase === 'playing'          && <GameTableScreen /> }
          { phase === 'reveal'           && <GameTableScreen /> }
          { phase === 'finished'         && <ResultsScreen /> }
        </div>

        {/* Debug sidebar — always visible */}
        <div className="w-80 border-l border-gray-700 flex flex-col">
          <DebugPanel />
          <GameLog />
        </div>

      </div>
    </div>
  )
}
```

---

## Step 3.4 — Shared Components
```
Create packages/client/src/components/shared/ErrorToast.tsx

Reads lastError from store. If set, shows a fixed red banner at top of screen.
Has an X button that calls clearError().
Auto-dismisses after 4 seconds (useEffect with setTimeout → clearError).

Tailwind: fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 flex justify-between
```
```
Create packages/client/src/components/shared/CardComponent.tsx

Props:
  card: Card
  onClick?: () => void
  disabled?: boolean      ← greyed out, not clickable
  highlighted?: boolean   ← glowing border — valid move indicator
  faceDown?: boolean      ← shows card back, used for other players

Display:
  Show rank + suit symbol (♠ ♥ ♦ ♣)
  Color: red for hearts/diamonds, white for spades/clubs
  Show points badge if card.points > 0 (e.g. "30pts" on 3♠, "10pts" on Aces)
  If faceDown: show a simple card back pattern instead
  If highlighted: bright green border ring
  If disabled: opacity-40 cursor-not-allowed

Tailwind: rounded-lg border-2 w-16 h-24 flex flex-col items-center justify-center
          text-sm font-bold cursor-pointer select-none transition-all
```
```
Create packages/client/src/components/shared/PhaseLabel.tsx

Props: phase: GamePhase
Returns a colored pill badge showing the current phase name in human-readable form:
  lobby → "Waiting for players"
  dealing → "Dealing cards"
  bidding → "Bidding"
  trump_select → "Trump Selection"
  teammate_select → "Teammate Selection"
  playing → "Playing"
  finished → "Game Over"
```

---

## Step 3.5 — Debug Panel
```
Create packages/client/src/components/Debug/DebugPanel.tsx

This panel is always visible in the right sidebar.
It shows the full state of ALL players simultaneously — essential for testing
from a single browser tab where you are one player but want to see everyone.

Reads from store: players, myPlayerId, phase, trumpSuit, bidderId,
                  highestBid, bidderTeamScore, oppositionTeamScore,
                  currentTrick, removedCards, teammateConditions

Display sections:

1. GAME INFO (compact row)
   Phase badge | Trump suit (if set) | Deck count | Min bid

2. REMOVED CARDS
   Small chips for each removed card: "2♠" "2♥" etc.
   Label: "Removed during setup balancing"
   If none: show "None removed"

3. PLAYERS TABLE
   One row per player with columns:
   Name | Team (color-coded: blue=bidder, red=opposition, grey=unknown)
   | Cards in hand (count) | Points collected | Is current turn (→ arrow indicator)
   | Is bidder (★ star) | Is revealed (✓ check)

4. CURRENT TRICK
   Show each TrickPlay in order: "PlayerName: rank suit (playOrder: N)"
   If trick is complete: show "Winner: PlayerName"

5. TEAMMATE CONDITIONS
   List each condition:
     CardReveal: "suit rank (Nth instance)" — satisfied/collapsed/pending status
     FirstTrickWin: "First trick winner" — status
   Color: green=satisfied, red=collapsed, yellow=pending

6. BID HISTORY
   List all bids: "PlayerName: amount" or "PlayerName: PASS"

Tailwind: overflow-y-auto p-3 text-xs font-mono bg-gray-800 space-y-4
Section headers: text-gray-400 uppercase text-xs tracking-wider mb-1
```
```
Create packages/client/src/components/Debug/GameLog.tsx

Shows the gameLog array from the store in reverse chronological order
(newest entry at top).

Each entry shows: [HH:MM:SS] message
Max height: 40% of sidebar. Scrollable.
Clear button at top that resets the log array in store (add clearLog action).

Tailwind: border-t border-gray-700 p-3 overflow-y-auto text-xs
          font-mono text-green-400 bg-gray-900
```

---

## Step 3.6 — Lobby Screen
```
Create packages/client/src/components/Lobby/LobbyScreen.tsx

This is the first screen. It has two modes:

── Mode 1: Not yet connected (myPlayerId is null) ──────────────────────────

Show a centered card with:
  - Title: "Blind Alliance"
  - Text input: "Your name" (required, max 20 chars)
  - Text input: "Room code (leave blank to create new room)" (optional, 6 chars uppercase)
  - Button: "Join Game"
  - On click: call store.connect(playerName, roomId || undefined)
  - Disable button while name is empty

── Mode 2: Connected, waiting in lobby (myPlayerId set, phase === 'lobby') ──

Show:
  - "Room Code: XXXXXX" — large, copyable (click to copy to clipboard)
  - "Share this code with other players"
  - List of players currently in the room (names + "HOST" badge for index 0)
  - Player count: "3 / 10 players"
  - If I am the host (players[0].id === myPlayerId):
      "Start Game" button — enabled only if players.length >= 3
      Hint: "Minimum 3 players required"
  - If I am not the host:
      "Waiting for host to start the game..."
  - Connection status dot (green/red) in corner

Tailwind: min-h-screen flex items-center justify-center bg-gray-900
```

---

## Step 3.7 — Bidding Screen
```
Create packages/client/src/components/Bidding/BiddingScreen.tsx

Reads from store: players, myPlayerId, bids, highestBid, minBid, isMyTurn(), myHand

Display layout (two columns):

── Left: My Hand (read-only during bidding) ─────────────────────────────────
Show all cards in myHand using CardComponent with disabled=true.
Label: "Your Hand"

── Right: Bidding Panel ──────────────────────────────────────────────────────
Show: "Current highest bid: 175" or "No bids yet"
Show: "Minimum bid: 125"

Bid history list — one row per bid in order:
  "PlayerName bid 150" or "PlayerName passed"
  Highlight the current highest bidder row in yellow.

If isMyTurn():
  Number input — starts at (highestBid?.amount ?? minBid - 1) + 1
  Enforce minimum = highestBid + 1 or minBid, whichever is higher
  "Place Bid" button → store.placeBid(amount)
  "Pass" button → store.passBid()
Else:
  "Waiting for [currentPlayer name] to bid..."

Show whose turn it is with a clear indicator.
```

---

## Step 3.8 — Trump Select Screen
```
Create packages/client/src/components/TrumpSelect/TrumpSelectScreen.tsx

Reads from store: amIBidder(), highestBid, myHand

── If I am the Bidder ───────────────────────────────────────────────────────
Show: "You won the bid with [amount] points! Choose your trump suit."
Show my hand (read-only) so I can make an informed decision.

4 large suit buttons in a row:
  ♠ Spades | ♥ Hearts | ♦ Diamonds | ♣ Clubs
  Red for hearts/diamonds, white for spades/clubs
  On click: store.selectTrump(suit)

── If I am NOT the Bidder ───────────────────────────────────────────────────
Show: "[BidderName] won the bid with [amount] points."
Show: "Waiting for [BidderName] to choose trump suit..."
Show my hand (read-only).
```

---

## Step 3.9 — Teammate Select Screen
```
Create packages/client/src/components/TeammateSelect/TeammateSelectScreen.tsx

Reads from store: amIBidder(), maxTeammateCount, deckCount,
                  availableConditionCards(), trumpSuit, myHand

── If I am the Bidder ───────────────────────────────────────────────────────
Show: "Trump: [suit symbol]"
Show: "Choose [N] teammate condition(s)"
Show my hand (read-only).

Render N condition slots (N = maxTeammateCount).
If maxTeammateCount === 0: skip this screen automatically by calling
  store.setTeammateConditions([]) immediately on mount (useEffect).

Each condition slot has:
  Mode toggle: "Card Reveal" | "First Trick Win"

  If Card Reveal mode:
    Suit dropdown: ♠ ♥ ♦ ♣
    Rank dropdown: filtered to ranks available for selected suit
                   using availableConditionCards()
    Instance dropdown: "1st" | "2nd"
                       Only shown if deckCount === 2 AND selected card
                       has availableInstances.length === 2
    Removed cards never appear in dropdowns.

  If First Trick Win mode:
    No further inputs needed — just a label "Whoever wins trick 1"

Validation:
  Prevent duplicate conditions (same suit + rank + instance).
  Show inline error per slot if duplicate detected.

"Confirm Teammates" button:
  Disabled until all N slots are filled with valid conditions.
  On click: store.setTeammateConditions(conditions)

── If I am NOT the Bidder ───────────────────────────────────────────────────
Show: "Waiting for [BidderName] to select teammate conditions..."
Show my hand (read-only).
```

---

## Step 3.10 — Game Table Screen
```
Create packages/client/src/components/GameTable/GameTableScreen.tsx

This is the main playing screen. Three sections:

── Top Bar ──────────────────────────────────────────────────────────────────
Left:  "Trump: ♠" (suit symbol, colored)
Center: "Trick [N] of [total]" | whose turn it is
Right: "Bid: [amount]" | "Bidder: [name]"

── Center: Trick Area ───────────────────────────────────────────────────────
Create GameTableScreen/TrickArea.tsx

Shows cards played in the current trick.
For each TrickPlay: show CardComponent + player name label below.
Arrange in a horizontal row centered on screen.
If trick is complete (all players played): show "Trick won by [name]!" banner
  for 1.5 seconds before the next trick begins (useEffect + setTimeout).
If no trick in progress: show "Waiting for first card..."

── Bottom: My Hand ──────────────────────────────────────────────────────────
Create GameTableScreen/PlayerHand.tsx

Shows all cards in myHand using CardComponent.
If isMyTurn():
  highlighted=true for cards in validCards()
  disabled=true for cards NOT in validCards()
  onClick: store.playCard(card)
Else:
  All cards disabled=true
  Show: "Waiting for [currentPlayer name]..."

── Teammate Reveal Toast ─────────────────────────────────────────────────────
Create GameTableScreen/TeammateRevealToast.tsx

Watch for changes in players where isRevealed flips from false to true.
When detected: show a temporary banner (3 seconds):
  "[PlayerName] is revealed as [Bidder's / Opposition] teammate!"
Color: blue for bidder team, red for opposition.
Use useEffect watching the players array.

── Score Bar ────────────────────────────────────────────────────────────────
Create GameTableScreen/ScoreBar.tsx

Fixed bar showing running totals:
  "Bidder Team: [score] / [bid]"   ← shows progress toward bid
  "Opposition: [score]"
  Progress bar for bidder team: fills as they collect points toward bid target.
  Color: green if on track (score / tricksPlayed >= bid / totalTricks), else red.
```

---

## Step 3.11 — Results Screen
```
Create packages/client/src/components/Results/ResultsScreen.tsx

Reads from store: winner, bidderTeamScore, oppositionTeamScore,
                  highestBid, players, myPlayerId

── Header ───────────────────────────────────────────────────────────────────
Large banner:
  If winner === 'bidder_team': "🏆 Bidder's Team Wins!"  (green)
  If winner === 'opposition_team': "Bidder's Team Failed" (red)

── Score Summary ─────────────────────────────────────────────────────────────
Two columns side by side:

Bidder's Team                  Opposition Team
──────────────                 ───────────────
[PlayerName]  [points]         [PlayerName]  [points]
[PlayerName]  [points]
──────────────                 ───────────────
Total: [N]                     Total: [N]
Bid:   [N]                     
Result: Met / Failed

── My Result ────────────────────────────────────────────────────────────────
Personalized line: "You were on the [winning/losing] team"
Show which team this player was on (bidder or opposition).

── Play Again ───────────────────────────────────────────────────────────────
"Play Again" button → reloads the page (window.location.reload())
This brings player back to lobby to start a new session.
```

---

## Step 3.12 — Wire Up and Verify
```
Verify the complete client setup:

1. Run both server and client:
     npm run dev --workspace=packages/server
     npm run dev --workspace=packages/client

2. Test Scenario 1 — Basic 3-player game:
   Open 3 browser tabs, all pointing to http://localhost:5173
   Tab 1: Enter name, click "Join Game" (creates room, gets room code)
   Tab 2: Enter name + room code, click "Join Game"
   Tab 3: Enter name + room code, click "Join Game"
   Tab 1 (host): Click "Start Game"
   Verify: all tabs show their own hand, debug panel shows all 3 players

3. Test Scenario 2 — Bidding:
   Each tab places a bid or passes in turn.
   Verify: bid history updates across all tabs simultaneously.
   Verify: invalid bid (too low) shows error toast on that tab only.

4. Test Scenario 3 — Trump + Teammate selection:
   Winning bidder selects trump.
   Verify: non-bidder tabs show "waiting" state.
   Bidder sets teammate conditions.
   Verify: TeammateSelector only shows non-removed cards.
   Verify: instance dropdown only appears in 2-deck games.

5. Test Scenario 4 — Playing tricks:
   Players take turns playing cards.
   Verify: only valid cards are highlighted on active player's tab.
   Verify: played cards appear in TrickArea on all tabs.
   Verify: teammate reveal toast fires when condition is satisfied.
   Verify: debug panel shows condition status updating (pending→satisfied/collapsed).

6. Test Scenario 5 — Collapse scenarios:
   Set up a condition where the bidder will play their own named card.
   Verify: condition shows as collapsed in debug panel.
   Set up two conditions pointing to the same player.
   Verify: second condition collapses correctly.

7. Test Scenario 6 — 6-player game (2 decks):
   Open 6 tabs. Verify 2-deck dealing, instance dropdown in TeammateSelector,
   and duplicate card tiebreak (second played wins) in trick resolution.

8. Test Scenario 7 — Game over:
   Play until all cards exhausted.
   Verify: Results screen appears on all tabs with correct winner.
   Verify: "Play Again" reloads to lobby correctly.
```

---

# TESTING CHECKLIST

Use the debug panel and game log to verify these after Phase 3 is complete:

## Setup
- [ ] 3 of Spades never appears in removed cards list
- [ ] Removed cards never appear in TeammateSelector dropdowns
- [ ] Card count per player is equal across all players

## Bidding
- [ ] Bids below minimum are rejected (error toast, no state change)
- [ ] Bids below current highest are rejected
- [ ] All-pass triggers re-deal
- [ ] Highest bidder transitions to trump_select phase

## Teammate Conditions
- [ ] Instance dropdown only shown for 2-deck games with 2 instances available
- [ ] Duplicate conditions blocked with inline error
- [ ] maxTeammateCount === 0 skips teammate select automatically

## Trick Resolution
- [ ] Trump beats led suit regardless of rank
- [ ] Highest trump wins among multiple trumps
- [ ] Fuse cards never win
- [ ] [2-deck] Second identical card played beats first (check playOrder in debug panel)

## Teammate Reveals
- [ ] Reveal toast fires at correct moment
- [ ] Bidder playing own named card → collapse shown in debug panel
- [ ] Two conditions resolving to same player → second collapses
- [ ] Revealed team shown correctly in debug panel player table

## Scoring
- [ ] Points accumulate correctly in score bar during play
- [ ] Final scores match sum of collected point cards
- [ ] Winner determined correctly (bidder team score ≥ bid)