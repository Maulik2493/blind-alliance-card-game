# PHASE 0.5 — Bug Fixes

Apply in order. Each prompt is a surgical patch to one specific area.

---

## Fix 1 — Bid validation: multiples of 5 only
```
Fix isValidBid() and add nextValidBid() in packages/core/src/bidding.ts

Replace isValidBid() with:
  function isValidBid(amount: number, currentHighest: number | null, deckCount: 1 | 2): boolean
    Returns true only if ALL three conditions are met:
    1. amount % 5 === 0               ← must be exact multiple of 5
    2. amount >= getMinBid(deckCount) ← must meet minimum (125 or 250)
    3. amount > (currentHighest ?? 0) ← must strictly beat current highest

Add new exported function:
  function nextValidBid(currentHighest: number | null, deckCount: 1 | 2): number
    Returns the lowest amount that would pass isValidBid().
    If currentHighest is null: return getMinBid(deckCount)
    Else: return Math.ceil((currentHighest + 1) / 5) * 5

Export nextValidBid from packages/core/src/index.ts

Add unit tests in packages/core/tests/bidding.test.ts:
  isValidBid(141, 135, 1) → false  (not a multiple of 5)
  isValidBid(140, 140, 1) → false  (not strictly greater)
  isValidBid(140, 135, 1) → true
  isValidBid(145, 140, 1) → true
  nextValidBid(null, 1)   → 125
  nextValidBid(null, 2)   → 250
  nextValidBid(140, 1)    → 145
  nextValidBid(150, 1)    → 155
  nextValidBid(245, 2)    → 250
  nextValidBid(250, 2)    → 255
```

---

## Fix 2 — REMOVED: no hand exclusion rule applies
```
The previous Fix 2 (excluding cards the bidder holds from condition picker)
has been removed. There is no restriction on which cards the bidder can name.

Action required:
1. If you already applied the old Fix 2, revert these changes:
   - In conditionCards.ts: remove the bidderHand parameter entirely
     Restore original signature:
       getAvailableConditionCards(allDealtCards: Card[], removedCards: Card[]): AvailableConditionCard[]
     Remove all bidderHand filtering logic from the function body.
   - In gameStore.ts availableConditionCards() selector:
       Remove bidderHand from the getAvailableConditionCards() call.
   - Remove any related unit tests that tested hand exclusion.

2. For 2-deck games, instance availability rule is simple:
   - If both copies of a card exist in the dealt deck → instances [1, 2] available
   - If only one copy exists (other was removed during balancing) → instance [1] only
   - deckIndex is irrelevant — never use it for instance logic

3. The UI should show all non-removed cards freely with no hand-based filtering.
```

---

## Fix 3 — Instance tracking: deckIndex is irrelevant
```
Fix checkCardPlayConditions() in packages/core/src/conditions.ts

Current tracker key may include deckIndex (e.g. "spades-A-0"). Fix this.

1. Change cardInstanceTracker key format to "suit-rank" ONLY:
   key = `${card.suit}-${card.rank}`
   Never include deckIndex in the key.

2. The tracker counts total plays of that suit+rank by ANY player across
   ALL tricks. It does not distinguish which physical card (deckIndex) was played.

3. Condition matching logic:
   On every card play:
     key = `${card.suit}-${card.rank}`
     increment cardInstanceTracker[key]
     currentInstance = cardInstanceTracker[key]

     For each unsatisfied, non-collapsed CardRevealCondition:
       if condition.suit === card.suit
       && condition.rank === card.rank
       && condition.instance === currentInstance:
         ← THIS condition is now triggered
         if playerId === bidderId:
           condition.collapsed = true     ← bidder played own named card
         else:
           condition.satisfied = true
           condition.satisfiedByPlayerId = playerId
         then call resolveCollapses()

     For plays where suit+rank matches a condition but instance does NOT match:
       → tracker incremented (already done above)
       → condition is NOT triggered, NOT collapsed, NOT modified in any way
       → silently wait for next matching play

4. Remove any usage of deckIndex from condition checking or instance tracking.

Update unit tests in packages/core/tests/conditions.test.ts:
  Test A — instance counting ignores deckIndex:
    Play A♠ with deckIndex=0 → tracker["spades-A"] = 1
    Play A♠ with deckIndex=1 → tracker["spades-A"] = 2
    Condition for "2nd A♠" triggers on the second play regardless of deckIndex.

  Test B — non-matching instance is silent:
    Condition: "2nd A♠"
    Play 1st A♠ (by anyone) → tracker = 1 → condition NOT triggered, NOT collapsed
    Play 2nd A♠ (by non-bidder) → tracker = 2 → condition satisfied ✅

  Test C — bidder plays matching instance → collapse:
    Condition: "1st A♠"
    Bidder plays A♠ first → tracker = 1 → instance matches → collapsed ✅

  Test D — bidder plays non-matching instance → silent:
    Condition: "2nd A♠"
    Bidder plays A♠ first → tracker = 1 → instance 1 ≠ 2 → nothing happens
    Player B plays A♠ → tracker = 2 → instance 2 matches → Player B is teammate ✅

  Test E — both instances named, same player satisfies both → collapse:
    Conditions: "1st A♠" AND "2nd A♠" (bidder needs 2 teammates)
    Player B plays A♠ → tracker = 1 → 1st condition → satisfied by Player B ✅
    Player B plays A♠ again → tracker = 2 → 2nd condition → satisfiedByPlayerId = Player B
    resolveCollapses() detects Player B already satisfies condition 1
    → 2nd condition collapses ✅
    → Bidder ends up with 1 teammate not 2
```

---

## Fix 4 — Bidder gets first turn after teammate selection
```
Fix setTeammateConditions() in packages/core/src/gameState.ts

After transitioning phase to 'playing', set:
  const bidderIndex = newState.players.findIndex(p => p.id === newState.bidderId)
  newState.currentPlayerIndex = bidderIndex

The bidder always leads trick 1 regardless of what currentPlayerIndex
was during dealing or bidding.

Unit test in packages/core/tests/gameState.test.ts:
  After setTeammateConditions() with bidder at players[2]:
    state.phase === 'playing'
    state.currentPlayerIndex === 2
```

---

## Fix 5 — First Trick Win limited to one slot maximum
```
Fix in two places:

── Part A: Core validation ───────────────────────────────────────────────────

In setTeammateConditions() in packages/core/src/gameState.ts,
before applying conditions add:

  const firstTrickWinCount = conditions.filter(
    c => c.type === 'first_trick_win'
  ).length
  if (firstTrickWinCount > 1) {
    throw new Error('Only one First Trick Win condition is allowed per game')
  }

Unit test:
  setTeammateConditions with two FirstTrickWin conditions → throws
  setTeammateConditions with one FirstTrickWin + one CardReveal → succeeds

── Part B: UI enforcement in TeammateSelectScreen.tsx ───────────────────────

In the condition slot renderer, add:

  const firstTrickWinAlreadyUsed = conditions.some(
    (c, i) => i !== slotIndex && c?.type === 'first_trick_win'
  )

On the "First Trick Win" toggle button for each slot:
  disabled={firstTrickWinAlreadyUsed}
  title={firstTrickWinAlreadyUsed
    ? 'First Trick Win can only be used once per game'
    : ''}
  className: add disabled:opacity-40 disabled:cursor-not-allowed

The button stays enabled on whichever slot currently has it selected
so the bidder can switch away if they change their mind.

── Part C: Bid input in BiddingScreen.tsx ───────────────────────────────────

Import nextValidBid from '@blind-alliance/core'

Update the bid number input:
  min={nextValidBid(highestBid?.amount ?? null, deckCount)}
  step={5}
  defaultValue={nextValidBid(highestBid?.amount ?? null, deckCount)}

Add client-side guard before calling store.placeBid(amount):
  if (amount % 5 !== 0) {
    setInputError('Bid must be a multiple of 5')
    return
  }
  if (amount <= (highestBid?.amount ?? 0)) {
    setInputError(`Bid must be higher than ${highestBid?.amount}`)
    return
  }
  store.placeBid(amount)
```

---

## Fix 0.5 Final — Integration test covering all fixes
```
Add packages/core/tests/integration.test.ts

Simulate a 4-player, 1-deck game where bidder is players[2].
Cover all five fixes in sequence:

1. Bid multiples of 5:
   isValidBid(126, 125, 1) → false
   isValidBid(130, 125, 1) → true
   nextValidBid(130, 1) → 135

2. Instance tracking ignores deckIndex:
   Deal cards. Bidder names "1st A♠".
   Non-bidder plays A♠ → tracker["spades-A"] = 1 → condition satisfied ✅

3. Non-matching instance is silent:
   Bidder names "2nd A♠".
   Bidder plays A♠ first → tracker = 1, condition NOT triggered.
   Player B plays A♠ → tracker = 2 → Player B is teammate ✅

4. Both instances to same player → collapse:
   Bidder names "1st A♠" AND "2nd A♠".
   Player B plays both → second condition collapses ✅
   currentPlayerIndex after setTeammateConditions === 2 (bidder's index) ✅

5. FirstTrickWin limit:
   setTeammateConditions([firstTrickWin, firstTrickWin]) → throws ✅
   setTeammateConditions([firstTrickWin, cardReveal]) → succeeds ✅
```
## Fix 6 — Teammate Selector: show all available ranks, not just bidder's hand
```
Fix the rank dropdown in TeammateSelectScreen.tsx

Current broken behaviour:
  After the bidder selects a suit in the Card Reveal condition picker,
  the rank dropdown only shows ranks the bidder holds in their hand.

Correct behaviour:
  The rank dropdown must show ALL ranks available for that suit across
  the entire dealt deck, derived from availableConditionCards() — not
  from myHand.

Fix:

  availableConditionCards() already returns AvailableConditionCard[]:
    { suit: Suit, rank: Rank, availableInstances: (1 | 2)[] }

  When the bidder selects a suit in a condition slot:
    filteredRanks = availableConditionCards()
      .filter(c => c.suit === selectedSuit)
      .map(c => c.rank)

  Populate the rank dropdown from filteredRanks — not from myHand.

  After rank is selected, populate the instance dropdown:
    selectedCard = availableConditionCards().find(
      c => c.suit === selectedSuit && c.rank === selectedRank
    )
    availableInstances = selectedCard?.availableInstances ?? [1]
    Show instance dropdown only if:
      deckCount === 2 AND availableInstances.length === 2

  The bidder's hand (myHand) must not be used anywhere in this
  filtering logic. myHand is only used in PlayerHand display.
```
## Fix 7 — Bidder leads first trick: full stack audit and fix
```
The bug: after the bidder confirms teammate conditions, the first card play
turn goes to the next player clockwise instead of the bidder.
Fix 4 addressed core only. This fix audits and patches the entire stack.

── Step 1: Audit core ───────────────────────────────────────────────────────

Open packages/core/src/gameState.ts
Find setTeammateConditions().
Confirm this exact logic exists at the point where phase transitions to 'playing':

  const bidderIndex = newState.players.findIndex(p => p.id === newState.bidderId)
  newState.currentPlayerIndex = bidderIndex

If it is missing or placed BEFORE other state mutations that reset
currentPlayerIndex, move it to be the LAST assignment before returning newState.

Run: npm test --workspace=packages/core
Confirm the test "currentPlayerIndex === bidderIndex after setTeammateConditions" passes.
If this test does not exist, add it now and confirm it passes before continuing.

── Step 2: Audit GameRoom.ts ────────────────────────────────────────────────

Open packages/server/src/GameRoom.ts
Find applySetConditions():

  applySetConditions(playerId: string, conditions: TeammateCondition[]): void

Check for any of these problems AFTER the call to coreSetTeammateConditions():

  Problem A — index being overwritten:
    Any line like:
      this.state.currentPlayerIndex = something
      newState.currentPlayerIndex = this.state.currentPlayerIndex + 1
    Delete it. Core already sets the correct index.

  Problem B — state not fully replaced:
    If the code does a partial spread like:
      this.state = { ...this.state, phase: newState.phase }
    This would lose currentPlayerIndex from newState.
    Fix: always replace state fully:
      this.state = newState

  Problem C — next player being advanced after conditions set:
    Any call to advancePlayerIndex() or incrementCurrentPlayer()
    or currentPlayerIndex++ after applySetConditions.
    Remove it entirely for this method.

Correct implementation of applySetConditions should be exactly:
  applySetConditions(playerId: string, conditions: TeammateCondition[]): void {
    if (playerId !== this.state.bidderId) {
      throw new Error('Only the bidder can set teammate conditions')
    }
    const firstTrickWinCount = conditions.filter(
      c => c.type === 'first_trick_win'
    ).length
    if (firstTrickWinCount > 1) {
      throw new Error('Only one First Trick Win condition is allowed per game')
    }
    if (conditions.length !== this.state.maxTeammateCount) {
      throw new Error(
        `Expected ${this.state.maxTeammateCount} conditions, got ${conditions.length}`
      )
    }
    this.state = coreSetTeammateConditions(this.state, conditions)
    ← nothing else. No index manipulation. Core handles it.
  }

── Step 3: Audit onSetConditions.ts ─────────────────────────────────────────

Open packages/server/src/events/onSetConditions.ts
Find handleSetConditions().

Check for any player index manipulation AFTER room.applySetConditions():
  Any nextTurn(), advancePlayer(), or currentPlayerIndex modification.
  Remove entirely — core already set it correctly via applySetConditions.

Correct implementation:
  function handleSetConditions(socket, io, data: { conditions }) {
    try {
      const room = roomManager.getRoomByPlayerId(socket.id)
      if (!room) throw new Error('Room not found')
      room.applySetConditions(socket.id, data.conditions)
      broadcastStateUpdate(io, room)
    } catch (err) {
      socket.emit('action_error', { message: (err as Error).message })
    }
  }

── Step 4: Audit broadcastStateUpdate ───────────────────────────────────────

Open packages/server/src/events/onBid.ts (where broadcastStateUpdate is defined).
Confirm broadcastStateUpdate() does NOT modify state in any way:

  function broadcastStateUpdate(io: Server, room: GameRoom): void {
    for (const player of room.state.players) {
      const socketId = room.playerSocketMap.get(player.id)
      if (socketId) {
        io.to(socketId).emit('state_update', room.getSanitizedStateFor(player.id))
      }
    }
  }

It must only READ room.state and send it. No writes, no index changes.

── Step 5: Audit getSanitizedStateFor ───────────────────────────────────────

Open packages/server/src/GameRoom.ts
Find getSanitizedStateFor(playerId: string): ClientGameState

Confirm it does NOT modify or recalculate currentPlayerIndex:
  It must copy currentPlayerIndex directly from this.state:
    currentPlayerIndex: this.state.currentPlayerIndex

Not recomputed, not offset, not advanced. Copied as-is.

── Step 6: Verify fix end-to-end ────────────────────────────────────────────

Start server: npm run dev --workspace=packages/server
Open 4 browser tabs, join same room, start game.
Complete bidding → trump selection → teammate condition selection.

After bidder clicks "Confirm Teammates":
  1. Check the debug panel on ALL tabs:
       currentPlayerIndex must equal the bidder's index in the players array
  2. The GameTable on the BIDDER's tab must show valid cards highlighted
     and "Your turn" indicator active
  3. All other tabs must show "Waiting for [BidderName]..."
  4. The first card played must be by the bidder

If the debug panel shows correct index but the UI still shows wrong player:
  Check useGameStore isMyTurn() selector in gameStore.ts:
    isMyTurn: () =>
      get().players[get().currentPlayerIndex]?.id === get().myPlayerId
  Confirm myPlayerId is set correctly after 'room_joined' event.
  Confirm players array index in ClientGameState matches server state.
```
---

# PHASE 4 — Deployment Preparation

All code changes needed to make the app deployable on Railway (server)
and Vercel (client). Apply these before doing any manual platform steps.

---

## Step 4.1 — Railway config file
```
Create packages/server/railway.json:

{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node packages/server/dist/index.js",
    "restartPolicyType": "ON_FAILURE"
  }
}

This tells Railway how to start the server after build.
```

---

## Step 4.2 — Root build script for monorepo
```
Open the root package.json.
Add this script alongside existing scripts:

  "build:server": "npm run build --workspace=packages/core && npm run build --workspace=packages/server"

This builds core first (server depends on it), then server.
Railway will call this script during its build phase.

Also add:
  "build:client": "npm run build --workspace=packages/core && npm run build --workspace=packages/client"

Vercel will call this during its build phase.
```

---

## Step 4.3 — Server: production-ready CORS and PORT
```
Open packages/server/src/index.ts.

1. Make sure PORT comes from environment variable:
     const PORT = process.env.PORT || 3001

2. Make sure CORS origin comes from environment variable:
     const io = new Server(httpServer, {
       cors: {
         origin: process.env.CLIENT_URL || 'http://localhost:5173',
         methods: ['GET', 'POST']
       }
     })

3. Make sure the server listens on 0.0.0.0 (required for Railway):
     httpServer.listen(PORT, '0.0.0.0', () => {
       console.log(`Blind Alliance server running on port ${PORT}`)
     })

Do not hardcode any URLs or port numbers anywhere in this file.
```

---

## Step 4.4 — Server: graceful shutdown
```
Open packages/server/src/index.ts.

Add graceful shutdown handling at the bottom of the file,
after the server listen call:

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully.')
    httpServer.close(() => {
      console.log('Server closed.')
      process.exit(0)
    })
  })

  process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully.')
    httpServer.close(() => {
      console.log('Server closed.')
      process.exit(0)
    })
  })

Railway sends SIGTERM before stopping a container.
This ensures active games get a clean shutdown signal
rather than being cut off abruptly.
```

---

## Step 4.5 — Server: package.json scripts
```
Open packages/server/package.json.
Ensure all three scripts exist exactly as follows:

  "scripts": {
    "dev":   "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }

"start" must run the compiled JS from dist/, not ts-node.
Railway runs "start" in production after "build" completes.
```

---

## Step 4.6 — Server: tsconfig output path
```
Open packages/server/tsconfig.json.
Confirm outDir is set to "dist":

  {
    "compilerOptions": {
      "outDir": "dist",
      "rootDir": "src",
      ...
    }
  }

After npm run build --workspace=packages/server, the compiled
entry point must exist at packages/server/dist/index.js.
Run the build locally and confirm this file exists before deploying.
```

---

## Step 4.7 — Client: environment variable for server URL
```
Open packages/client/src/socket.ts.

Make sure the server URL comes from the Vite environment variable:

  import { io } from 'socket.io-client'

  export const socket = io(
    import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
    { autoConnect: false }
  )

  export const connectSocket = () => socket.connect()
  export const disconnectSocket = () => socket.disconnect()

VITE_SERVER_URL will be set on Vercel as an environment variable.
During local dev it falls back to localhost:3001.
Never hardcode the production server URL in source code.
```

---

## Step 4.8 — Client: vite.config.ts production settings
```
Open packages/client/vite.config.ts.
Ensure it looks like this:

  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  import path from 'path'

  export default defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@blind-alliance/core': path.resolve(__dirname, '../core/src/index.ts')
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false   ← disable sourcemaps in production build
    }
  })

The alias lets Vite resolve the core package directly from TypeScript
source without requiring a separate core build step during client build.
sourcemap: false keeps the production bundle smaller.
```

---

## Step 4.9 — Client: vercel.json for SPA routing
```
Create packages/client/vercel.json:

  {
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }

This ensures all routes (including direct URL access and page refresh)
are handled by the React app rather than returning a 404 from Vercel.
Essential for any React SPA deployed on Vercel.
```

---

## Step 4.10 — Add .gitignore entries
```
Open the root .gitignore (or create one if it doesn't exist).
Ensure these entries are present:

  # Build outputs
  packages/core/dist
  packages/server/dist
  packages/client/dist

  # Dependencies
  node_modules
  packages/*/node_modules

  # Environment files
  .env
  .env.local
  packages/server/.env
  packages/client/.env.local

  # Railway
  .railway

  # OS
  .DS_Store
  Thumbs.db

Never commit dist/ folders or .env files to the repo.
Railway and Vercel build from source — they don't need pre-built files.
```

---

## Step 4.11 — Local production build verification
```
Before deploying, verify the production build works locally.

Run these commands from the repo root in order:

  1. npm run build:server
     Confirm: packages/server/dist/index.js exists
     Confirm: packages/core/dist/index.js exists

  2. node packages/server/dist/index.js
     Confirm: "Blind Alliance server running on port 3001" appears
     Ctrl+C to stop

  3. npm run build:client
     Confirm: packages/client/dist/index.html exists

  4. npm run preview --workspace=packages/client
     Opens a local preview of the production client build.
     Open browser, confirm the app loads correctly.

Fix any build errors before proceeding to manual deployment steps.
All four checks must pass cleanly.
```

---

## Step 4.12 — Environment variable documentation
```
Create a file packages/server/.env.example:

  # Port the server listens on (Railway sets this automatically)
  PORT=3001

  # The deployed Vercel client URL (set after Vercel deployment)
  CLIENT_URL=https://your-app.vercel.app

  # Node environment
  NODE_ENV=production

Create a file packages/client/.env.example:

  # The deployed Railway server URL (set after Railway deployment)
  VITE_SERVER_URL=https://your-server.up.railway.app

Commit both .env.example files to the repo.
These are documentation only — the real .env files are never committed.
teammates and future developers use these as a reference for
which environment variables need to be set on each platform.
```

# PHASE 5 — UI Improvements

---

## Fix 5.1 — Completed trick stays visible for 2 seconds
```
Fix TrickArea.tsx in packages/client/src/components/GameTable/TrickArea.tsx

Current bug: the trick clears too quickly when the last player plays their card,
making it hard to see what was played.

Fix using a local display buffer:

1. Add two pieces of local state:
     const [displayedPlays, setDisplayedPlays] = useState<TrickPlay[]>([])
     const [trickWinner, setTrickWinner] = useState<string | null>(null)

2. Watch the currentTrick from the store with useEffect:
     useEffect(() => {
       if (!currentTrick) return

       // Always update displayed plays as cards come in
       setDisplayedPlays(currentTrick.plays)

       // When trick is complete (winnerId is set), hold for 2 seconds
       if (currentTrick.winnerId) {
         setTrickWinner(currentTrick.winnerId)
         const timer = setTimeout(() => {
           setDisplayedPlays([])
           setTrickWinner(null)
         }, 2000)
         return () => clearTimeout(timer)
       }
     }, [currentTrick, currentTrick?.plays.length, currentTrick?.winnerId])

3. Render from displayedPlays and trickWinner instead of directly
   from currentTrick.plays and currentTrick.winnerId.

4. When trickWinner is set, show a banner above the cards:
     "[PlayerName] wins this trick!"
   Use the players array from store to resolve winnerId to a name.
   Style: text-center font-bold text-green-600 text-lg mb-2 animate-pulse

5. Cleanup: cancel the timeout if the component unmounts.
```

---

## Fix 5.2 — Light white/cream theme with colourful suits
```
Update the global theme across all components in packages/client/src/

── 1. index.css or App.tsx global styles ────────────────────────────────────

Change the root background from dark (bg-gray-900) to light:
  html, body: background-color: #faf7f2  (warm cream)
  Default text: text-gray-800

── 2. App.tsx layout ────────────────────────────────────────────────────────

Change outer wrapper:
  FROM: className="min-h-screen bg-gray-900 text-white"
  TO:   className="min-h-screen bg-amber-50 text-gray-800"

Change debug sidebar:
  FROM: className="w-80 border-l border-gray-700 flex flex-col"
  TO:   className="w-80 border-l border-amber-200 flex flex-col bg-white shadow-inner"

── 3. CardComponent.tsx ─────────────────────────────────────────────────────

This is the most important visual change. Redesign the card:

Card base:
  className="rounded-xl border border-gray-200 shadow-md bg-white
             w-16 h-24 flex flex-col justify-between p-1.5
             cursor-pointer select-none transition-all duration-150
             hover:shadow-lg hover:-translate-y-1"

Suit colours (apply to ALL suit symbols and rank text on the card):
  ♠ spades:   text-gray-900        (near black)
  ♥ hearts:   text-red-500         (bright red)
  ♦ diamonds: text-orange-500      (orange-red)
  ♣ clubs:    text-emerald-700     (dark green)

Card layout — show rank top-left and suit symbol bottom-right:
  <div className="flex flex-col h-full">
    <span className="text-sm font-bold leading-none">{rank}</span>
    <span className="text-xs leading-none">{suitSymbol}</span>
    <div className="flex-1 flex items-center justify-center">
      <span className="text-2xl">{suitSymbol}</span>
    </div>
    {points > 0 && (
      <span className="text-xs font-semibold text-amber-600 text-right">
        {points}pts
      </span>
    )}
  </div>

Suit symbols: ♠ ♥ ♦ ♣

Highlighted card (valid move):
  Add: ring-2 ring-blue-400 ring-offset-1 -translate-y-2 shadow-blue-200

Disabled card (invalid move):
  Add: opacity-40 cursor-not-allowed hover:shadow-md hover:translate-y-0

Face down card:
  Replace content with a repeating diagonal pattern:
  <div className="w-full h-full rounded-lg bg-blue-700
                  bg-[repeating-linear-gradient(45deg,#1d4ed8,#1d4ed8_2px,#1e40af_2px,#1e40af_8px)]" />

── 4. LobbyScreen.tsx ───────────────────────────────────────────────────────
  Main card: bg-white rounded-2xl shadow-lg border border-amber-100 p-8
  Title: text-3xl font-bold text-gray-800
  Input fields: border border-gray-300 rounded-lg px-3 py-2 bg-white
                focus:outline-none focus:ring-2 focus:ring-amber-400
  Primary button: bg-amber-500 hover:bg-amber-600 text-white font-semibold
                  px-6 py-2 rounded-lg transition-colors
  Room code display: text-4xl font-mono font-bold tracking-widest
                     text-amber-600 bg-amber-50 rounded-xl px-6 py-3

── 5. BiddingScreen.tsx ─────────────────────────────────────────────────────
  Panel background: bg-white rounded-2xl shadow border border-gray-100 p-4
  Current high bid: text-2xl font-bold text-amber-600
  Bid history rows: alternating bg-white and bg-gray-50
  Pass button: bg-gray-100 hover:bg-gray-200 text-gray-700
  Bid button: bg-amber-500 hover:bg-amber-600 text-white

── 6. TrumpSelectScreen.tsx ─────────────────────────────────────────────────
  Suit buttons — large, coloured, distinct:
    ♠: bg-gray-800 text-white hover:bg-gray-900  w-24 h-24 rounded-2xl text-4xl
    ♥: bg-red-500 text-white hover:bg-red-600
    ♦: bg-orange-500 text-white hover:bg-orange-600
    ♣: bg-emerald-600 text-white hover:bg-emerald-700
  Selected suit: ring-4 ring-offset-2 ring-amber-400 scale-110

── 7. GameTableScreen.tsx ───────────────────────────────────────────────────
  Top bar: bg-white border-b border-gray-200 shadow-sm px-4 py-2
  Trump indicator: coloured pill matching suit colour scheme above
  Trick area background: bg-amber-50 rounded-2xl border border-amber-100
  Score bar: bg-white border-t border-gray-200

── 8. DebugPanel.tsx and GameLog.tsx ────────────────────────────────────────
  Panel: bg-gray-50 border-l border-gray-200 text-gray-700
  Section headers: text-gray-500 uppercase text-xs tracking-wider
  Log text: text-emerald-700 font-mono text-xs
  Log background: bg-white

── 9. ResultsScreen.tsx ─────────────────────────────────────────────────────
  Winner banner (bidder wins): bg-green-50 border border-green-200
                                text-green-700 text-3xl font-bold
  Winner banner (opposition): bg-red-50 border border-red-200 text-red-700
  Score table: bg-white rounded-xl shadow border border-gray-100
  Play Again button: bg-amber-500 hover:bg-amber-600 text-white
```

---

## Fix 5.3 — Sort cards by suit then rank high to low
```
Fix in two places:

── Part A: Add sort utility in packages/core/src/card.ts ────────────────────

Add and export this function:

  const SUIT_ORDER: Record<Suit, number> = {
    spades: 0,
    hearts: 1,
    diamonds: 2,
    clubs: 3
  }

  export function sortHand(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => {
      // First sort by suit group
      const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit]
      if (suitDiff !== 0) return suitDiff
      // Within same suit, sort by rank high to low (A first, 2 last)
      return getRankValue(b.rank) - getRankValue(a.rank)
    })
  }

Export sortHand from packages/core/src/index.ts

── Part B: Apply sort in gameStore.ts ───────────────────────────────────────

Import sortHand from '@blind-alliance/core'

In the socket.on('game_started') handler:
  set({ myHand: sortHand(hand), phase })

In the socket.on('state_update') handler:
  Before calling set({ ...state }), sort the hand:
  set({ ...state, myHand: sortHand(state.myHand) })

This ensures the hand is always sorted whenever it changes —
after dealing, after playing a card, after any state update.
The sort is applied once on arrival, not on every render.

── Part C: Add unit test ────────────────────────────────────────────────────

Add to packages/core/tests/card.test.ts:

  test('sortHand groups by suit then ranks high to low', () => {
    const hand = [
      { suit: 'hearts', rank: 2, ... },
      { suit: 'spades', rank: 'A', ... },
      { suit: 'hearts', rank: 'K', ... },
      { suit: 'clubs', rank: 5, ... },
      { suit: 'spades', rank: 3, ... },
    ]
    const sorted = sortHand(hand)
    // spades first: A then 3
    expect(sorted[0]).toMatchObject({ suit: 'spades', rank: 'A' })
    expect(sorted[1]).toMatchObject({ suit: 'spades', rank: 3 })
    // hearts next: K then 2
    expect(sorted[2]).toMatchObject({ suit: 'hearts', rank: 'K' })
    expect(sorted[3]).toMatchObject({ suit: 'hearts', rank: 2 })
    // clubs last
    expect(sorted[4]).toMatchObject({ suit: 'clubs', rank: 5 })
  })
```
# PHASE 6 — Mobile UI (Portrait)

## Apply Order
Work through these steps EXACTLY in the order listed below.
Do not skip ahead or apply out of order — each step builds on the previous.

  6.1 → viewport meta tag (index.html)
  6.2 → App.tsx responsive layout
  6.3 → MobileDebugDrawer component
  6.4 → PlayerHand fan layout
  6.5 → GameTableScreen mobile layout
  6.6 → BiddingScreen mobile layout
  6.7 → TeammateSelectScreen mobile layout
  6.8 → Verify on mobile

---

## Fix 6.1 — Mobile viewport meta tag (START HERE)
```
Open packages/client/index.html

Replace the existing viewport meta tag with:
  <meta name="viewport"
        content="width=device-width, initial-scale=1.0,
                 maximum-scale=1.0, user-scalable=no" />

Add these additional mobile meta tags inside <head> after the viewport tag:
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="theme-color" content="#faf7f2" />

user-scalable=no prevents accidental zoom when double-tapping cards.
theme-color sets the browser chrome colour to match the cream app background.
```

---

## Fix 6.2 — App.tsx responsive layout
```
Update packages/client/src/App.tsx

Replace the current layout with a responsive version that:
- On desktop (md and above): shows game on left + debug sidebar on right
- On mobile (below md): shows game full width + MobileDebugDrawer at bottom
- Imports MobileDebugDrawer from './components/Debug/MobileDebugDrawer'

New App.tsx:

  import { useGameStore } from './gameStore'
  import { LobbyScreen } from './components/Lobby/LobbyScreen'
  import { BiddingScreen } from './components/Bidding/BiddingScreen'
  import { TrumpSelectScreen } from './components/TrumpSelect/TrumpSelectScreen'
  import { TeammateSelectScreen } from './components/TeammateSelect/TeammateSelectScreen'
  import { GameTableScreen } from './components/GameTable/GameTableScreen'
  import { ResultsScreen } from './components/Results/ResultsScreen'
  import { DebugPanel } from './components/Debug/DebugPanel'
  import { GameLog } from './components/Debug/GameLog'
  import { MobileDebugDrawer } from './components/Debug/MobileDebugDrawer'
  import { ErrorToast } from './components/shared/ErrorToast'

  export default function App() {
    const phase = useGameStore(s => s.phase)

    return (
      <div className="min-h-screen bg-amber-50 text-gray-800 flex flex-col">
        <ErrorToast />

        <div className="flex flex-1 overflow-hidden">

          {/* Game content — full width on mobile, flex-1 on desktop */}
          <div className="flex-1 overflow-auto p-3 md:p-4">
            { phase === 'lobby'           && <LobbyScreen /> }
            { phase === 'dealing'         && <LobbyScreen /> }
            { phase === 'bidding'         && <BiddingScreen /> }
            { phase === 'trump_select'    && <TrumpSelectScreen /> }
            { phase === 'teammate_select' && <TeammateSelectScreen /> }
            { phase === 'playing'         && <GameTableScreen /> }
            { phase === 'reveal'          && <GameTableScreen /> }
            { phase === 'finished'        && <ResultsScreen /> }
          </div>

          {/* Desktop sidebar — hidden on mobile */}
          <div className="hidden md:flex w-80 border-l border-amber-200
                          flex-col bg-white shadow-inner">
            <DebugPanel />
            <GameLog />
          </div>

        </div>

        {/* Mobile bottom drawer — visible on mobile only, hidden on desktop */}
        <div className="md:hidden">
          <MobileDebugDrawer />
        </div>

      </div>
    )
  }
```

---

## Fix 6.3 — MobileDebugDrawer component
```
Create packages/client/src/components/Debug/MobileDebugDrawer.tsx

This is a bottom sheet with two states:
  - Collapsed: a compact sticky bar at bottom showing critical info at a glance
  - Expanded: a drawer sliding up to 75vh showing full game info

NOTE: Game Log is intentionally excluded from mobile — it is not shown
anywhere in this component. Only game-critical information is shown.

── Imports and state ────────────────────────────────────────────────────────

  import { useState } from 'react'
  import { useGameStore } from '../../gameStore'
  import type { Suit } from '@blind-alliance/core'

  const [isOpen, setIsOpen] = useState(false)

  const {
    phase, trumpSuit, deckCount, minBid,
    players, myPlayerId, bidderId,
    currentTrick, teammateConditions,
    bids, highestBid, bidderTeamScore, oppositionTeamScore,
    removedCards, currentPlayerIndex
  } = useGameStore()

  const isMyTurn = useGameStore(s => s.isMyTurn())
  const currentPlayerName = players[currentPlayerIndex]?.name ?? '—'

── Helper functions ──────────────────────────────────────────────────────────

  function suitSymbol(suit: Suit): string {
    return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit]
  }

  function suitColor(suit: Suit): string {
    return {
      spades: 'text-gray-900',
      hearts: 'text-red-500',
      diamonds: 'text-orange-500',
      clubs: 'text-emerald-700'
    }[suit]
  }

── Collapsed bar (always visible) ───────────────────────────────────────────

  <div
    onClick={() => setIsOpen(true)}
    className="fixed bottom-0 left-0 right-0 z-40
               bg-white border-t-2 border-amber-300 shadow-lg
               px-4 py-3 flex items-center justify-between
               cursor-pointer active:bg-amber-50"
  >
    {/* Left: whose turn */}
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Turn:</span>
      <span className="text-sm font-bold text-gray-800 truncate max-w-[100px]">
        {currentPlayerName}
      </span>
      { isMyTurn && (
        <span className="text-xs bg-green-100 text-green-700
                         px-2 py-0.5 rounded-full font-semibold shrink-0">
          You!
        </span>
      )}
    </div>

    {/* Center: trump suit */}
    { trumpSuit && (
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">Trump:</span>
        <span className={`text-xl font-bold ${suitColor(trumpSuit)}`}>
          {suitSymbol(trumpSuit)}
        </span>
      </div>
    )}

    {/* Right: expand chevron */}
    <span className="text-amber-400 text-lg font-bold">⌃</span>
  </div>

── Expanded drawer ───────────────────────────────────────────────────────────

  { isOpen && (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer panel */}
      <div className="fixed bottom-0 left-0 right-0 z-50
                      bg-white rounded-t-2xl shadow-2xl
                      max-h-[75vh] overflow-y-auto
                      border-t-2 border-amber-200">

        {/* Handle + close button */}
        <div className="sticky top-0 bg-white border-b border-gray-100
                        px-4 py-3 flex items-center justify-center relative">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
          <button
            onClick={() => setIsOpen(false)}
            className="absolute right-4 text-gray-400
                       hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Drawer content — NO game log */}
        <div className="p-4 space-y-5">

          {/* GAME INFO */}
          <section>
            <h3 className="text-gray-400 uppercase text-xs
                           tracking-wider mb-2">Game Info</h3>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="bg-amber-100 text-amber-700
                               px-3 py-1 rounded-full font-medium">
                {phase}
              </span>
              { trumpSuit && (
                <span className={`font-bold text-base ${suitColor(trumpSuit)}`}>
                  Trump: {suitSymbol(trumpSuit)}
                </span>
              )}
              <span className="text-gray-600">Decks: {deckCount}</span>
              <span className="text-gray-600">Min Bid: {minBid}</span>
            </div>
            <div className="mt-2 text-sm text-gray-700">
              Bidder: <b>{bidderTeamScore}</b> pts &nbsp;|&nbsp;
              Opposition: <b>{oppositionTeamScore}</b> pts
            </div>
          </section>

          {/* CURRENT TRICK */}
          <section>
            <h3 className="text-gray-400 uppercase text-xs
                           tracking-wider mb-2">Current Trick</h3>
            { currentTrick?.plays.length
              ? currentTrick.plays.map(play => (
                  <div key={play.playOrder}
                       className="text-sm text-gray-700 py-0.5">
                    <span className="font-medium">
                      {players.find(p => p.id === play.playerId)?.name}:
                    </span>
                    {' '}
                    <span className={suitColor(play.card.suit)}>
                      {play.card.rank}{suitSymbol(play.card.suit)}
                    </span>
                  </div>
                ))
              : <p className="text-sm text-gray-400">No trick in progress</p>
            }
            { currentTrick?.winnerId && (
              <p className="text-sm font-bold text-green-600 mt-1">
                Winner: {players.find(p => p.id === currentTrick.winnerId)?.name}
              </p>
            )}
          </section>

          {/* TEAMMATE CONDITIONS */}
          <section>
            <h3 className="text-gray-400 uppercase text-xs
                           tracking-wider mb-2">Teammate Conditions</h3>
            { teammateConditions.length === 0
              ? <p className="text-sm text-gray-400">None set</p>
              : teammateConditions.map((c, i) => (
                  <div key={i} className="flex items-center gap-2
                                          text-sm py-0.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      c.collapsed ? 'bg-red-400' :
                      c.satisfied ? 'bg-green-400' : 'bg-yellow-400'
                    }`} />
                    <span className="text-gray-700">
                      { c.type === 'first_trick_win'
                        ? 'First trick winner'
                        : `${c.instance === 2 ? '2nd' : '1st'} ${c.rank}${suitSymbol(c.suit!)}`
                      }
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      { c.collapsed ? 'collapsed' :
                        c.satisfied ? `→ ${players.find(p => p.id === c.satisfiedByPlayerId)?.name}` :
                        'pending' }
                    </span>
                  </div>
                ))
            }
          </section>

          {/* PLAYERS */}
          <section>
            <h3 className="text-gray-400 uppercase text-xs
                           tracking-wider mb-2">Players</h3>
            { players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-2 py-1.5 px-2
                              rounded-lg text-sm ${
                    index === currentPlayerIndex
                      ? 'bg-amber-50 font-semibold' : ''
                  }`}
                >
                  { index === currentPlayerIndex && (
                    <span className="text-amber-500 text-xs">▶</span>
                  )}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    player.team === 'bidder' ? 'bg-blue-400' :
                    player.team === 'opposition' ? 'bg-red-400' :
                    'bg-gray-300'
                  }`} />
                  <span className="flex-1 truncate">{player.name}</span>
                  { player.id === bidderId && (
                    <span className="text-xs text-amber-600">★ Bidder</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {player.cardCount} cards
                  </span>
                </div>
              ))
            }
          </section>

          {/* BID HISTORY */}
          <section>
            <h3 className="text-gray-400 uppercase text-xs
                           tracking-wider mb-2">Bid History</h3>
            { bids.length === 0
              ? <p className="text-sm text-gray-400">No bids yet</p>
              : bids.map((bid, i) => (
                  <div key={i} className="text-sm text-gray-700 py-0.5
                                          flex justify-between">
                    <span>{players.find(p => p.id === bid.playerId)?.name}</span>
                    <span className={bid.amount
                      ? 'font-bold text-amber-600'
                      : 'text-gray-400'
                    }>
                      {bid.amount ?? 'Pass'}
                    </span>
                  </div>
                ))
            }
          </section>

          {/* Spacer so last section isn't hidden behind collapsed bar */}
          <div className="h-4" />

        </div>
      </div>
    </>
  )}
```

---

## Fix 6.4 — PlayerHand fan layout for mobile
```
Update packages/client/src/components/GameTable/PlayerHand.tsx

On mobile portrait, cards fan/overlap so all cards are visible without scroll.
On desktop, keep existing horizontal row layout unchanged.

1. Import useEffect, useState, useRef.

2. Add sorted hand — import sortHand from '@blind-alliance/core':
     const sortedHand = sortHand(myHand)

3. Mobile fan layout — wrap cards in a relative container:
     {/* Mobile fan layout */}
     <div className="md:hidden">
       <div
         className="relative mx-auto"
         style={{
           height: '96px',
           width: `${Math.min(
             64 + 44 * (sortedHand.length - 1),
             window.innerWidth - 32
           )}px`
         }}
       >
         {sortedHand.map((card, index) => {
           const isValid = validCards.some(
             v => v.suit === card.suit &&
                  v.rank === card.rank &&
                  v.deckIndex === card.deckIndex
           )
           return (
             <div
               key={`${card.suit}-${card.rank}-${card.deckIndex}`}
               className={`absolute transition-transform duration-150 ${
                 isValid && isMyTurn ? '-translate-y-3' : ''
               }`}
               style={{ left: `${index * 44}px`, zIndex: index }}
             >
               <CardComponent
                 card={card}
                 onClick={isMyTurn && isValid
                   ? () => store.playCard(card) : undefined}
                 disabled={!isMyTurn || !isValid}
                 highlighted={isMyTurn && isValid}
               />
             </div>
           )
         })}
       </div>
     </div>

     {/* Desktop row layout — unchanged */}
     <div className="hidden md:flex flex-wrap gap-1">
       {sortedHand.map(card => (
         <CardComponent ... />
       ))}
     </div>

4. Wrap the entire PlayerHand in pb-16 md:pb-0 to prevent
   content hiding behind the mobile bottom drawer bar:
     <div className="pb-16 md:pb-0">
       ...hand layouts...
     </div>
```

---

## Fix 6.5 — GameTableScreen mobile layout
```
Update packages/client/src/components/GameTable/GameTableScreen.tsx

1. Wrap entire screen in:
     <div className="flex flex-col h-full pb-14 md:pb-0">

2. Top bar — compact on mobile:
     <div className="flex items-center justify-between
                     px-3 py-2 bg-white border-b border-gray-200 shadow-sm
                     text-sm md:text-base shrink-0">
       { trumpSuit
         ? <span className={`font-bold text-lg ${suitColor(trumpSuit)}`}>
             {suitSymbol(trumpSuit)} Trump
           </span>
         : <span className="text-gray-400 text-sm">No trump yet</span>
       }
       <span className="text-gray-600 text-xs md:text-sm font-medium">
         Trick {tricks.length + 1}
       </span>
       <span className="text-xs text-gray-500">
         Bid: <b>{highestBid?.amount ?? '—'}</b>
       </span>
     </div>

3. Whose turn — mobile only banner below top bar:
     <div className="md:hidden px-3 py-2 text-center shrink-0
                     bg-amber-50 border-b border-amber-100">
       { isMyTurn
         ? <span className="text-green-600 font-bold text-sm">
             ✓ Your turn — tap a card to play
           </span>
         : <span className="text-gray-500 text-sm">
             Waiting for {currentPlayer?.name}...
           </span>
       }
     </div>

4. Trick area — flex-1 so it fills available space:
     <div className="flex-1 flex items-center justify-center
                     p-2 md:p-6 bg-amber-50 min-h-0">
       <TrickArea />
     </div>

5. Score bar — compact on mobile:
     <div className="shrink-0 px-3 py-2 bg-white
                     border-t border-gray-200
                     flex justify-between text-xs md:text-sm">
       <span className="text-gray-600">
         Bidder: <b className="text-amber-600">{bidderTeamScore}</b>
         /{highestBid?.amount}
       </span>
       <span className="text-gray-600">
         Opposition: <b>{oppositionTeamScore}</b>
       </span>
     </div>

6. PlayerHand — already has pb-16 from Fix 6.4, just render it:
     <div className="shrink-0 bg-white border-t border-gray-100 p-2">
       <PlayerHand />
     </div>
```

---

## Fix 6.6 — BiddingScreen mobile layout
```
Update packages/client/src/components/Bidding/BiddingScreen.tsx

1. Add local state for hand toggle:
     const [showHand, setShowHand] = useState(false)

2. Layout wrapper — stacked on mobile, side by side on desktop:
     <div className="flex flex-col md:flex-row gap-4 pb-16 md:pb-0">

3. Hand section — toggle on mobile, always visible on desktop:
     <div className="md:flex-1">
       <button
         className="md:hidden text-sm text-amber-600
                    underline mb-2 block"
         onClick={() => setShowHand(!showHand)}
       >
         {showHand ? 'Hide my hand ▲' : 'Show my hand ▼'}
       </button>
       <div className={showHand ? 'block' : 'hidden md:block'}>
         <p className="text-xs text-gray-500 mb-1 font-semibold uppercase
                       tracking-wide">Your Hand</p>
         <PlayerHand disabled />
       </div>
     </div>

4. Bidding panel — full width on mobile:
     <div className="md:flex-1 bg-white rounded-2xl shadow
                     border border-gray-100 p-4 space-y-4">

5. Bid number input — large tap target:
     <input
       type="number"
       className="w-full text-center text-2xl font-bold
                  border-2 border-amber-300 rounded-xl px-4 py-3
                  focus:outline-none focus:ring-2 focus:ring-amber-400"
       min={nextValidBid(highestBid?.amount ?? null, deckCount)}
       step={5}
     />

6. Action buttons — full width stacked on mobile:
     <div className="flex flex-col md:flex-row gap-2">
       <button className="flex-1 py-4 md:py-2 text-base font-bold
                          bg-amber-500 hover:bg-amber-600
                          text-white rounded-xl transition-colors">
         Place Bid
       </button>
       <button className="flex-1 py-4 md:py-2 text-base font-semibold
                          bg-gray-100 hover:bg-gray-200
                          text-gray-700 rounded-xl transition-colors">
         Pass
       </button>
     </div>
```

---

## Fix 6.7 — TeammateSelectScreen mobile layout
```
Update packages/client/src/components/TeammateSelect/TeammateSelectScreen.tsx

1. Wrap entire screen in:
     <div className="pb-16 md:pb-0 space-y-4">

2. Each condition slot as a card:
     <div className="bg-white rounded-2xl border border-amber-100
                     shadow-sm p-4 space-y-3">

3. Mode toggle — large tap-friendly full-width buttons:
     <div className="flex rounded-xl overflow-hidden
                     border-2 border-amber-200">
       <button
         onClick={() => setMode('card_reveal')}
         className={`flex-1 py-3 text-sm font-semibold transition-colors ${
           mode === 'card_reveal'
             ? 'bg-amber-500 text-white'
             : 'bg-white text-gray-600'
         }`}
       >
         Card Reveal
       </button>
       <button
         onClick={() => setMode('first_trick_win')}
         disabled={firstTrickWinAlreadyUsed}
         className={`flex-1 py-3 text-sm font-semibold transition-colors
                     disabled:opacity-40 disabled:cursor-not-allowed ${
           mode === 'first_trick_win'
             ? 'bg-amber-500 text-white'
             : 'bg-white text-gray-600'
         }`}
       >
         First Trick Win
       </button>
     </div>

4. Dropdowns — full width, large tap targets, native mobile picker:
     <select className="w-full border-2 border-gray-200 rounded-xl
                        px-3 py-3 text-base bg-white
                        focus:outline-none focus:ring-2
                        focus:ring-amber-400 focus:border-transparent">

5. Confirm button — sticky above mobile drawer:
     <div className="sticky bottom-14 md:static px-0 py-3
                     md:bg-transparent">
       <button
         disabled={!allSlotsFilled}
         className="w-full md:w-auto py-4 md:py-2 px-6
                    text-base font-bold text-white rounded-xl
                    transition-colors
                    bg-amber-500 hover:bg-amber-600
                    disabled:opacity-40 disabled:cursor-not-allowed"
       >
         Confirm Teammates
       </button>
     </div>
```

---

## Fix 6.8 — Verify on mobile (DO THIS LAST)
```
Test using browser DevTools with a portrait phone viewport (390x844).
Also test on a real mobile device if possible.

Work through each scenario in order:

SCENARIO 1 — Lobby
  [ ] Name input full width, easy to type
  [ ] Join button large enough to tap
  [ ] Room code large and readable
  [ ] Debug panel NOT visible anywhere
  [ ] Collapsed bottom bar shows: Turn, Trump, expand chevron

SCENARIO 2 — Bottom drawer
  [ ] Tapping collapsed bar opens the drawer
  [ ] Drawer height is 75vh max, scrollable
  [ ] Backdrop tap closes drawer
  [ ] Game Info section shows phase, trump, deck count, scores
  [ ] Current Trick section shows cards played
  [ ] Teammate Conditions shows colour-coded dots
  [ ] Players section highlights current player with amber row
  [ ] Bid History shows all bids/passes
  [ ] Game Log is NOT shown anywhere on mobile
  [ ] Bottom spacer prevents last section hiding behind bar

SCENARIO 3 — Bidding
  [ ] Single column layout — no overflow
  [ ] Show/hide hand toggle works
  [ ] Bid input large, steps in 5s correctly
  [ ] Place Bid and Pass buttons full width, easy to tap

SCENARIO 4 — Trump select
  [ ] 4 large suit buttons visible without scrolling
  [ ] Buttons easy to tap

SCENARIO 5 — Teammate select
  [ ] Condition slots stacked vertically as cards
  [ ] Mode toggle buttons large and easy to tap
  [ ] Dropdowns open native mobile picker
  [ ] Confirm button sticky above bottom drawer bar
  [ ] First Trick Win disabled on other slots once used

SCENARIO 6 — Playing (Game Table)
  [ ] Top bar compact, fits in one row
  [ ] "Your turn" banner visible below top bar
  [ ] Trick area centered and visible
  [ ] Cards fan/overlap — all cards visible
  [ ] Valid cards lifted with -translate-y-3
  [ ] Tapping a valid card plays it
  [ ] Invalid cards not tappable
  [ ] Score bar visible above bottom drawer bar
  [ ] No content hidden behind bottom bar

SCENARIO 7 — Results
  [ ] Score summary readable without horizontal scroll
  [ ] Play Again button easy to tap
  [ ] No content hidden behind bottom bar

If any scenario fails, fix it before deploying.
After all scenarios pass: commit, push, and Vercel will auto-deploy.
```

# PHASE 6 — Mobile Fixes (Patch Round 2)

Apply in this order: 6.9 → 6.10 → 6.11 → 6.12 → 6.13

---

## Fix 6.9 — Bid input: quick-select chips on mobile
```
Update packages/client/src/components/Bidding/BiddingScreen.tsx

Replace the plain number input on mobile with a chip-based bid selector.
Keep the existing number input for desktop (md+) unchanged.

── Mobile bid selector ───────────────────────────────────────────────────────

Add local state:
  const [currentBid, setCurrentBid] = useState(
    nextValidBid(highestBid?.amount ?? null, deckCount)
  )

  // Reset currentBid whenever highestBid changes
  useEffect(() => {
    setCurrentBid(nextValidBid(highestBid?.amount ?? null, deckCount))
  }, [highestBid?.amount, deckCount])

Render this on mobile (md:hidden):

  {/* Current bid display */}
  <div className="text-center">
    <span className="text-xs text-gray-500 uppercase tracking-wide">
      Your Bid
    </span>
    <div className="text-4xl font-bold text-amber-600 my-2">
      {currentBid}
    </div>
    <span className="text-xs text-gray-400">
      Min: {nextValidBid(highestBid?.amount ?? null, deckCount)}
    </span>
  </div>

  {/* Quick-add chips */}
  <div>
    <p className="text-xs text-gray-500 mb-2 text-center">Add to bid:</p>
    <div className="flex gap-2 justify-center flex-wrap">
      {[5, 10, 25, 50].map(increment => {
        const newAmount = currentBid + increment
        const isValid = newAmount % 5 === 0
        return (
          <button
            key={increment}
            onClick={() => setCurrentBid(newAmount)}
            className="px-4 py-2 bg-amber-100 hover:bg-amber-200
                       text-amber-700 font-bold rounded-xl
                       text-sm transition-colors active:scale-95"
          >
            +{increment}
          </button>
        )
      })}
    </div>
  </div>

  {/* Quick-subtract chips */}
  <div>
    <p className="text-xs text-gray-500 mb-2 text-center">Remove from bid:</p>
    <div className="flex gap-2 justify-center flex-wrap">
      {[5, 10, 25, 50].map(decrement => {
        const newAmount = currentBid - decrement
        const minBidValue = nextValidBid(highestBid?.amount ?? null, deckCount)
        const disabled = newAmount < minBidValue
        return (
          <button
            key={decrement}
            onClick={() => !disabled && setCurrentBid(newAmount)}
            disabled={disabled}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200
                       text-gray-600 font-bold rounded-xl text-sm
                       transition-colors active:scale-95
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            -{decrement}
          </button>
        )
      })}
    </div>
  </div>

  {/* Action buttons */}
  <div className="flex flex-col gap-2 mt-2">
    <button
      onClick={() => store.placeBid(currentBid)}
      disabled={!isMyTurn}
      className="w-full py-4 text-base font-bold text-white
                 bg-amber-500 hover:bg-amber-600 rounded-xl
                 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-colors active:scale-95"
    >
      Place Bid: {currentBid}
    </button>
    <button
      onClick={() => store.passBid()}
      disabled={!isMyTurn}
      className="w-full py-4 text-base font-semibold text-gray-700
                 bg-gray-100 hover:bg-gray-200 rounded-xl
                 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-colors"
    >
      Pass
    </button>
  </div>
```

---

## Fix 6.10 — Hand cards: fix overflow on mobile
```
Update packages/client/src/components/GameTable/PlayerHand.tsx

The current fan layout calculates width based on a fixed 320px estimate
which causes cards to overflow on some screen sizes.

Replace the mobile fan layout with a scroll-based approach that
dynamically calculates the offset to always fit within the screen:

  {/* Mobile layout */}
  <div className="md:hidden w-full overflow-x-auto pb-2">
    <div
      className="relative mx-auto"
      style={{
        height: '112px',
        width: `${Math.min(
          64 + 44 * Math.max(sortedHand.length - 1, 0),
          sortedHand.length * 44 + 20
        )}px`,
        minWidth: '100%'
      }}
    >
      {sortedHand.map((card, index) => {
        const isValid = validCards.some(
          v => v.suit === card.suit &&
               v.rank === card.rank &&
               v.deckIndex === card.deckIndex
        )
        const offset = sortedHand.length <= 8
          ? 44
          : Math.floor((window.innerWidth - 48) / (sortedHand.length - 1))

        return (
          <div
            key={`${card.suit}-${card.rank}-${card.deckIndex}`}
            className={`absolute transition-transform duration-150 ${
              isMyTurn && isValid ? '-translate-y-3' : 'translate-y-0'
            }`}
            style={{
              left: `${index * offset}px`,
              zIndex: index
            }}
          >
            <CardComponent
              card={card}
              onClick={isMyTurn && isValid
                ? () => store.playCard(card)
                : undefined}
              disabled={!isMyTurn || !isValid}
              highlighted={isMyTurn && isValid}
            />
          </div>
        )
      })}
    </div>
  </div>

Key changes from previous version:
- offset is now dynamic: shrinks automatically when there are more than 8 cards
  so cards always fit within screen width
- Container has minWidth: 100% so it always fills the hand area
- overflow-x-auto added as a fallback in case cards still overflow
  (e.g. 13+ cards in a 2-deck game)
- Height increased to 112px to give room for the -translate-y-3 lift
  without clipping the top of lifted cards
```

---

## Fix 6.11 — TeammateSelector rank dropdown: fix overflow
```
Update packages/client/src/components/TeammateSelect/TeammateSelectScreen.tsx

The rank dropdown is going off screen because it uses an HTML <select>
which on some mobile browsers renders the dropdown list below the element
and can overflow the viewport.

Fix 1: Force native picker behavior with proper sizing:
  Replace any custom dropdown with a standard <select> that uses
  the device's native picker (which slides up from the bottom on iOS/Android):

  <select
    value={selectedRank ?? ''}
    onChange={e => setSelectedRank(e.target.value as Rank)}
    className="w-full border-2 border-gray-200 rounded-xl
               px-3 py-3 text-base bg-white appearance-none
               focus:outline-none focus:ring-2 focus:ring-amber-400"
    size={1}   ← size=1 forces native dropdown behavior on mobile
  >
    <option value="" disabled>Select rank...</option>
    {availableRanks.map(rank => (
      <option key={String(rank)} value={String(rank)}>
        {rank} {rank === 'A' ? '(Ace)' : ''}
      </option>
    ))}
  </select>

Fix 2: Wrap all three dropdowns (suit, rank, instance) in a div
  that prevents any child from overflowing the screen:

  <div className="space-y-3 w-full overflow-hidden">
    {/* Suit dropdown */}
    <div className="w-full">
      <label className="text-xs text-gray-500 mb-1 block">Suit</label>
      <select className="w-full ..." ...>
    </div>

    {/* Rank dropdown */}
    <div className="w-full">
      <label className="text-xs text-gray-500 mb-1 block">Rank</label>
      <select className="w-full ..." ...>
    </div>

    {/* Instance dropdown — only shown for 2-deck with 2 instances */}
    { showInstance && (
      <div className="w-full">
        <label className="text-xs text-gray-500 mb-1 block">Instance</label>
        <select className="w-full ..." ...>
      </div>
    )}
  </div>

Fix 3: Ensure the entire TeammateSelectScreen has overflow-hidden
  on its outer wrapper so nothing bleeds outside the viewport:
  <div className="pb-16 md:pb-0 space-y-4 overflow-hidden w-full">
```

---

## Fix 6.12 — Mobile bottom bar: show more critical info
```
Update packages/client/src/components/Debug/MobileDebugDrawer.tsx

The collapsed bar currently only shows whose turn it is and the trump suit.
Expand it to show more critical info in a compact two-row layout.

Replace the single-row collapsed bar with this two-row layout:

  <div
    onClick={() => setIsOpen(true)}
    className="fixed bottom-0 left-0 right-0 z-40
               bg-white border-t-2 border-amber-300 shadow-lg
               cursor-pointer active:bg-amber-50"
  >
    {/* Row 1: Turn + Trump + expand button */}
    <div className="flex items-center justify-between px-4 py-2
                    border-b border-amber-100">

      {/* Whose turn */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-gray-500 shrink-0">Turn:</span>
        <span className="text-sm font-bold text-gray-800 truncate">
          {currentPlayerName}
        </span>
        { isMyTurn && (
          <span className="text-xs bg-green-100 text-green-700
                           px-2 py-0.5 rounded-full font-semibold shrink-0">
            You!
          </span>
        )}
      </div>

      {/* Trump */}
      { trumpSuit && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-gray-500">Trump:</span>
          <span className={`text-xl font-bold ${suitColor(trumpSuit)}`}>
            {suitSymbol(trumpSuit)}
          </span>
        </div>
      )}

      {/* Expand */}
      <span className="text-amber-400 text-lg font-bold shrink-0 ml-2">
        ⌃
      </span>
    </div>

    {/* Row 2: Bid winner + Conditions summary + Points */}
    <div className="flex items-center justify-between px-4 py-1.5
                    text-xs text-gray-600 gap-3">

      {/* Bid winner */}
      <div className="flex items-center gap-1 min-w-0">
        <span className="text-gray-400 shrink-0">Bid:</span>
        <span className="font-semibold truncate">
          { bidderId
            ? `${players.find(p => p.id === bidderId)?.name}
               (${highestBid?.amount})`
            : '—'
          }
        </span>
      </div>

      {/* Conditions summary */}
      { teammateConditions.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-gray-400">Cond:</span>
          <div className="flex gap-0.5">
            {teammateConditions.map((c, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full inline-block ${
                  c.collapsed ? 'bg-red-400' :
                  c.satisfied ? 'bg-green-400' :
                  'bg-yellow-400'
                }`}
                title={
                  c.collapsed ? 'Collapsed' :
                  c.satisfied
                    ? `Satisfied by ${players.find(p => p.id === c.satisfiedByPlayerId)?.name}`
                    : 'Pending'
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Scores */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-blue-500 font-semibold">
          B:{bidderTeamScore}
        </span>
        <span className="text-gray-300">|</span>
        <span className="text-red-500 font-semibold">
          O:{oppositionTeamScore}
        </span>
      </div>

    </div>
  </div>
```

---

## Fix 6.13 — Show per-player points in MobileDebugDrawer expanded view
```
Update the PLAYERS section inside the expanded drawer in
packages/client/src/components/Debug/MobileDebugDrawer.tsx

Replace the existing players section with this updated version
that shows each player's collected points:

  <section>
    <h3 className="text-gray-400 uppercase text-xs
                   tracking-wider mb-2">Players</h3>
    { players.map((player, index) => (
        <div
          key={player.id}
          className={`flex items-center gap-2 py-2 px-2
                      rounded-lg text-sm mb-1 ${
            index === currentPlayerIndex
              ? 'bg-amber-50 border border-amber-200' : ''
          }`}
        >
          {/* Turn indicator */}
          <span className="w-3 shrink-0">
            { index === currentPlayerIndex
              ? <span className="text-amber-500 text-xs">▶</span>
              : null
            }
          </span>

          {/* Team colour dot */}
          <span className={`w-2 h-2 rounded-full shrink-0 ${
            player.team === 'bidder' ? 'bg-blue-400' :
            player.team === 'opposition' ? 'bg-red-400' :
            'bg-gray-300'
          }`} />

          {/* Name */}
          <span className="flex-1 truncate font-medium">
            {player.name}
            { player.id === myPlayerId && (
              <span className="text-xs text-gray-400 ml-1">(you)</span>
            )}
          </span>

          {/* Bidder star */}
          { player.id === bidderId && (
            <span className="text-xs text-amber-600 shrink-0">★</span>
          )}

          {/* Cards remaining */}
          <span className="text-xs text-gray-400 shrink-0">
            {player.cardCount}🃏
          </span>

          {/* Points collected */}
          <span className={`text-xs font-bold shrink-0 px-2 py-0.5
                            rounded-full ${
            player.team === 'bidder'
              ? 'bg-blue-50 text-blue-600'
              : player.team === 'opposition'
              ? 'bg-red-50 text-red-600'
              : 'bg-gray-100 text-gray-500'
          }`}>
            {player.collectedPoints ?? 0}pts
          </span>

        </div>
      ))
    }
  </section>

NOTE: player.collectedPoints must be available in PublicPlayer type.
If it is not currently included in PublicPlayer on the server, update:

  In packages/server/src/GameRoom.ts, getPublicPlayers():
    Add to each PublicPlayer:
      collectedPoints: state.players.find(p => p.id === player.id)
                        ?.collectedCards.reduce((sum, c) => sum + c.points, 0)
                        ?? 0

  In packages/server/src/events.ts, update PublicPlayer interface:
    collectedPoints: number

  In packages/client/src/gameStore.ts, PublicPlayer type reference:
    Ensure collectedPoints: number is included.
```
# PHASE 7 — Connectivity & Reliability Fixes

## Apply Order
7.1 → 7.2 → 7.3 → 7.4 → 7.5 → 7.6

---

## Fix 7.1 — Socket.IO heartbeat and connection settings
```
Update packages/server/src/index.ts

Replace the Socket.IO server initialization with these settings:

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    },
    pingTimeout: 60000,       // Wait 60s before declaring connection dead
    pingInterval: 25000,      // Send heartbeat every 25s
    connectTimeout: 45000,    // Allow 45s to establish connection
    transports: ['websocket', 'polling'],  // Try websocket first, fall back to polling
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6
  })

These settings:
- pingTimeout/pingInterval: keeps connections alive through mobile network
  switches (e.g. WiFi → 4G) and prevents silent disconnects
- transports order: websocket first for speed, polling as fallback
  ensures Railway's proxy layer doesn't block the connection
- connectTimeout: gives slow mobile connections more time to handshake
```

---

## Fix 7.2 — Player reconnection handling on server
```
Update packages/server/src/GameRoom.ts

Add reconnection support so a player who drops can rejoin mid-game
and receive the current game state.

── 1. Add disconnected player tracking ──────────────────────────────────────

Add to GameRoom class:
  disconnectedPlayers: Map<string, {
    playerId: string,
    playerName: string,
    disconnectedAt: number,   // timestamp
    reconnectTimer: ReturnType<typeof setTimeout> | null
  }> = new Map()

  RECONNECT_WINDOW_MS = 5 * 60 * 1000  // 5 minutes to reconnect

── 2. Update handleDisconnect ───────────────────────────────────────────────

Replace the existing disconnect logic in onDisconnect.ts with:

  function handleDisconnect(socket: Socket, io: Server): void {
    const room = roomManager.getRoomByPlayerId(socket.id)
    if (!room) return

    if (room.state.phase === 'lobby') {
      room.removePlayer(socket.id)
      if (room.state.players.length === 0) {
        roomManager.destroyRoom(room.roomId)
      } else {
        io.to(room.roomId).emit('player_joined', {
          players: room.getPublicPlayers()
        })
      }
      return
    }

    // Game in progress — mark as disconnected, start reconnect window
    const player = room.state.players.find(p => p.id === socket.id)
    if (!player) return

    room.markPlayerDisconnected(socket.id)

    // Notify others
    io.to(room.roomId).emit('player_disconnected', {
      playerId: socket.id,
      playerName: player.name,
      reconnectWindowSeconds: room.RECONNECT_WINDOW_MS / 1000
    })

    // Start reconnect timer — destroy room slot after window expires
    const timer = setTimeout(() => {
      io.to(room.roomId).emit('player_timed_out', {
        playerId: socket.id,
        playerName: player.name
      })
      // If all players disconnected, destroy room
      if (room.allPlayersDisconnected()) {
        roomManager.destroyRoom(room.roomId)
      }
    }, room.RECONNECT_WINDOW_MS)

    room.disconnectedPlayers.set(socket.id, {
      playerId: socket.id,
      playerName: player.name,
      disconnectedAt: Date.now(),
      reconnectTimer: timer
    })
  }

── 3. Add markPlayerDisconnected to GameRoom ────────────────────────────────

  markPlayerDisconnected(playerId: string): void {
    const player = this.state.players.find(p => p.id === playerId)
    if (player) {
      player.isConnected = false
    }
  }

  allPlayersDisconnected(): boolean {
    return this.state.players.every(p => !p.isConnected)
  }

── 4. Add isConnected to Player type ────────────────────────────────────────

In packages/core/src/gameState.ts, add to Player interface:
  isConnected: boolean   // default true when player joins

Initialize to true in initGame() and addPlayerToLobby().
```

---

## Fix 7.3 — Reconnection handling on server (rejoin flow)
```
Update packages/server/src/events/onJoin.ts

Handle the case where a player is rejoining an existing game
(same player name, provides a roomId that exists and is in progress).

Update handleJoinRoom():

  function handleJoinRoom(
    socket: Socket,
    io: Server,
    data: { playerName: string, roomId?: string, playerId?: string }
  ): void {

    If data.roomId is provided AND room exists AND room.phase !== 'lobby':
      ← This is a reconnection attempt

      // Check if this player was in the game
      const disconnectedEntry = findDisconnectedPlayer(
        room, data.playerName
      )

      if (disconnectedEntry) {
        // Cancel the reconnect timer
        if (disconnectedEntry.reconnectTimer) {
          clearTimeout(disconnectedEntry.reconnectTimer)
        }
        room.disconnectedPlayers.delete(disconnectedEntry.playerId)

        // Remap old playerId → new socketId
        const oldPlayerId = disconnectedEntry.playerId
        room.playerSocketMap.delete(oldPlayerId)
        room.playerSocketMap.set(oldPlayerId, socket.id)

        // Mark player as connected again
        const player = room.state.players.find(p => p.id === oldPlayerId)
        if (player) player.isConnected = true

        socket.join(room.roomId)

        // Send full current state to reconnected player
        socket.emit('reconnected', {
          playerId: oldPlayerId,
          state: room.getSanitizedStateFor(oldPlayerId)
        })

        // Notify others
        io.to(room.roomId).emit('player_reconnected', {
          playerId: oldPlayerId,
          playerName: data.playerName
        })

        broadcastStateUpdate(io, room)
        return
      }

    // Normal join flow continues below...
  }

  function findDisconnectedPlayer(room: GameRoom, playerName: string) {
    return [...room.disconnectedPlayers.values()].find(
      d => room.state.players.find(
        p => p.id === d.playerId && p.name === playerName
      )
    )
  }
```

---

## Fix 7.4 — Client reconnection handling
```
Update packages/client/src/socket.ts

Replace the current socket singleton with one that has
automatic reconnection configured:

  import { io } from 'socket.io-client'

  export const socket = io(
    import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
    {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,        // Try 10 times before giving up
      reconnectionDelay: 1000,         // Wait 1s before first retry
      reconnectionDelayMax: 5000,      // Cap retry delay at 5s
      randomizationFactor: 0.5,        // Add jitter to avoid thundering herd
      timeout: 20000,                  // 20s connection timeout
      transports: ['websocket', 'polling']
    }
  )

  export const connectSocket = () => socket.connect()
  export const disconnectSocket = () => socket.disconnect()
```

---

## Fix 7.5 — Client reconnection state and UI
```
Update packages/client/src/gameStore.ts

── 1. Add reconnection state ────────────────────────────────────────────────

Add to store interface:
  isReconnecting: boolean
  reconnectAttempt: number
  disconnectedPlayers: { playerId: string, playerName: string }[]

Add to initial state:
  isReconnecting: false,
  reconnectAttempt: 0,
  disconnectedPlayers: []

── 2. Wire socket reconnection events ───────────────────────────────────────

Add these socket listeners in setupSocketListeners():

socket.on('reconnect_attempt', (attempt: number) => {
  set({ isReconnecting: true, reconnectAttempt: attempt })
  addLog(`Reconnecting... attempt ${attempt}`)
})

socket.on('reconnect', () => {
  set({ isReconnecting: false, reconnectAttempt: 0 })
  addLog('Reconnected to server')

  // If we were in a game, attempt to rejoin
  const { myPlayerName, roomId } = get()
  if (myPlayerName && roomId) {
    socket.emit('join_room', { playerName: myPlayerName, roomId })
    addLog(`Rejoining room ${roomId}...`)
  }
})

socket.on('reconnect_failed', () => {
  set({ isReconnecting: false })
  set({ lastError: 'Could not reconnect. Please refresh the page.' })
  addLog('Reconnection failed after 10 attempts')
})

socket.on('reconnected', ({ playerId, state }) => {
  set({ myPlayerId: playerId, ...state })
  addLog('Successfully rejoined game')
})

socket.on('player_disconnected', ({ playerName, reconnectWindowSeconds }) => {
  addLog(`${playerName} disconnected. ${reconnectWindowSeconds}s to reconnect.`)
  set(s => ({
    disconnectedPlayers: [
      ...s.disconnectedPlayers,
      { playerId: '', playerName }
    ]
  }))
})

socket.on('player_reconnected', ({ playerName }) => {
  addLog(`${playerName} reconnected`)
  set(s => ({
    disconnectedPlayers: s.disconnectedPlayers.filter(
      p => p.playerName !== playerName
    )
  }))
})

socket.on('player_timed_out', ({ playerName }) => {
  set({ lastError: `${playerName} timed out and has left the game.` })
  addLog(`${playerName} timed out`)
})

── 3. Add reconnection banner component ─────────────────────────────────────

Create packages/client/src/components/shared/ReconnectingBanner.tsx

  const isReconnecting = useGameStore(s => s.isReconnecting)
  const attempt = useGameStore(s => s.reconnectAttempt)
  const disconnectedPlayers = useGameStore(s => s.disconnectedPlayers)

  Render at top of App.tsx above ErrorToast:

  {/* Reconnecting banner — shown when this client is reconnecting */}
  { isReconnecting && (
    <div className="fixed top-0 left-0 right-0 z-50
                    bg-yellow-500 text-white text-center
                    px-4 py-3 text-sm font-semibold
                    flex items-center justify-center gap-2">
      <span className="animate-spin">⟳</span>
      Reconnecting... (attempt {attempt}/10)
    </div>
  )}

  {/* Disconnected player notice — shown when someone else drops */}
  { disconnectedPlayers.length > 0 && !isReconnecting && (
    <div className="fixed top-0 left-0 right-0 z-50
                    bg-orange-400 text-white text-center
                    px-4 py-2 text-xs font-medium">
      {disconnectedPlayers.map(p => p.playerName).join(', ')} disconnected
      — waiting to reconnect...
    </div>
  )}

Add ReconnectingBanner import and render it in App.tsx above ErrorToast.
```

---

## Fix 7.6 — Railway keep-alive ping
```
Update packages/server/src/index.ts

Railway's free tier sleeps after 30 minutes of inactivity.
Add a self-ping endpoint that keeps the process awake during active games.

── 1. Add health check endpoint ─────────────────────────────────────────────

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      activeRooms: roomManager.getRoomCount(),
      timestamp: new Date().toISOString()
    })
  })

  Add getRoomCount() to RoomManager:
    getRoomCount(): number { return this.rooms.size }

── 2. Add keep-alive logic ───────────────────────────────────────────────────

  Add to RoomManager:
    hasActiveGames(): boolean {
      return [...this.rooms.values()].some(
        room => room.state.phase !== 'lobby' &&
                room.state.phase !== 'finished'
      )
    }

  In index.ts, after server starts listening, add:

  // Self-ping to prevent Railway free tier sleep during active games
  const KEEP_ALIVE_INTERVAL = 25 * 60 * 1000  // 25 minutes

  setInterval(() => {
    if (roomManager.hasActiveGames()) {
      const url = process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/health`
        : null

      if (url) {
        fetch(url)
          .then(() => console.log('Keep-alive ping sent'))
          .catch(err => console.warn('Keep-alive ping failed:', err.message))
      }
    }
  }, KEEP_ALIVE_INTERVAL)

── 3. Set RAILWAY_PUBLIC_DOMAIN environment variable on Railway ──────────────

In Railway dashboard → your service → Variables, add:
  RAILWAY_PUBLIC_DOMAIN = blind-alliance-card-game-production.up.railway.app
  (use your actual Railway domain without https://)

This ping only fires when there are active games in progress,
so it won't waste Railway free tier hours during idle periods.

── 4. Also add fetch polyfill for Node 18 compatibility ─────────────────────

Node 18+ has native fetch but add this guard at the top of index.ts:

  if (!globalThis.fetch) {
    console.warn('Native fetch not available, keep-alive disabled')
  }
```

---

## Fix 7.7 — Verify reconnection end to end
```
Test the following scenarios after deploying all fixes:

SCENARIO 1 — Client drops and reconnects quickly:
  1. Start a 4-player game, get to the playing phase
  2. On one player's device, turn WiFi off for 5 seconds, turn back on
  3. Verify: reconnecting banner appears on that device
  4. Verify: other players see "[Name] disconnected" banner
  5. Verify: after reconnect, disconnected player sees current game state
  6. Verify: game continues normally from where it left off

SCENARIO 2 — Client drops during their turn:
  1. It is Player B's turn to play a card
  2. Player B disconnects
  3. Verify: other players see disconnected notice
  4. Player B reconnects within 5 minutes
  5. Verify: it is still Player B's turn
  6. Player B plays their card normally

SCENARIO 3 — Client exceeds reconnect window:
  1. Player drops, stays disconnected for 5+ minutes
  2. Verify: "player timed out" error shown to remaining players
  3. Verify: room is destroyed if all players time out

SCENARIO 4 — Server keep-alive:
  1. Check Railway logs after 25 minutes of an active game
  2. Verify: "Keep-alive ping sent" appears in logs
  3. Verify: server does NOT ping when no active games

SCENARIO 5 — 6 player game stability:
  1. Start a 6-player game
  2. Play through 5+ complete tricks
  3. Verify: no freezes, all players receive state updates
  4. Verify: trick winner announcements appear on all devices
```
# PHASE 8 — UI Fixes (Round 3)

## Apply Order
8.1 → 8.2 → 8.3

---

## Fix 8.1 — Arc/fan layout for trick area (desktop + mobile)
```
Replace TrickArea.tsx in packages/client/src/components/GameTable/TrickArea.tsx

The current side-by-side layout breaks with 6+ players.
Replace it with an arc/fan layout that positions each played card
in a semicircle around a central point. Works for 3–10 players
on both desktop and mobile.

── Layout concept ────────────────────────────────────────────────────────────

Cards are positioned absolutely around the center of a circular container.
Each card is placed at an angle along a semicircle (bottom half of circle).
The card belonging to the current player is placed at the bottom center.
Cards are distributed evenly across the arc from left to right
in clockwise play order.

── Implementation ────────────────────────────────────────────────────────────

  interface TrickAreaProps {
    plays: TrickPlay[]
    players: PublicPlayer[]
    winnerId: string | null
    ledSuit: Suit | null
    trumpSuit: Suit | null
    myPlayerId: string | null
  }

  export function TrickArea({
    plays, players, winnerId, ledSuit, trumpSuit, myPlayerId
  }: TrickAreaProps) {

    // Container dimensions — responsive
    // Desktop: 400x280px, Mobile: 300x220px
    const isMobile = window.innerWidth < 768
    const W = isMobile ? 300 : 400   // container width
    const H = isMobile ? 220 : 280   // container height
    const cx = W / 2                 // center x
    const cy = H * 0.55              // center y (slightly below middle)
    const rx = W * 0.38              // horizontal radius of arc
    const ry = H * 0.42              // vertical radius of arc

    // Arc spans from -160deg to -20deg (bottom semicircle, left to right)
    const ARC_START = -160
    const ARC_END   = -20
    const totalPlays = plays.length

    // Calculate angle for each play in clockwise order
    function getCardPosition(index: number, total: number) {
      const angle = total === 1
        ? -90   // single card goes to bottom center
        : ARC_START + (index / (total - 1)) * (ARC_END - ARC_START)
      const rad = (angle * Math.PI) / 180
      return {
        x: cx + rx * Math.cos(rad) - 32,   // 32 = half card width
        y: cy + ry * Math.sin(rad) - 48,   // 48 = half card height
        rotate: angle + 90   // tilt card to face center
      }
    }

    return (
      <div
        className="relative mx-auto"
        style={{ width: `${W}px`, height: `${H}px` }}
      >
        {/* Center label */}
        <div
          className="absolute text-xs text-gray-400 text-center
                     pointer-events-none"
          style={{
            left: '50%', top: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          { plays.length === 0
            ? <span>Waiting for first card...</span>
            : winnerId
            ? <span className="text-green-600 font-bold text-sm animate-pulse">
                {players.find(p => p.id === winnerId)?.name} wins!
              </span>
            : <span>{plays.length} / {players.length} played</span>
          }
        </div>

        {/* Played cards */}
        {plays.map((play, index) => {
          const pos = getCardPosition(index, totalPlays)
          const playerName = players.find(p => p.id === play.playerId)?.name ?? ''
          const isWinner = play.playerId === winnerId
          const isMyCard = play.playerId === myPlayerId
          const isTrump = play.card.suit === trumpSuit

          return (
            <div
              key={play.playOrder}
              className="absolute transition-all duration-300"
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                transform: `rotate(${pos.rotate * 0.15}deg)`,  // subtle tilt
                zIndex: isWinner ? 10 : index
              }}
            >
              {/* Player name label */}
              <div
                className={`text-center text-xs mb-1 font-medium truncate
                            max-w-[64px] ${
                  isMyCard ? 'text-amber-600 font-bold' : 'text-gray-500'
                }`}
              >
                {isMyCard ? 'You' : playerName}
              </div>

              {/* Card with winner glow or trump indicator */}
              <div className={`
                rounded-xl transition-all duration-300
                ${isWinner
                  ? 'ring-4 ring-green-400 ring-offset-2 scale-110 shadow-lg shadow-green-200'
                  : ''}
                ${isTrump && !isWinner
                  ? 'ring-2 ring-amber-300'
                  : ''}
              `}>
                <CardComponent
                  card={play.card}
                  disabled
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

── Usage notes ───────────────────────────────────────────────────────────────

1. Winner card gets a green glow ring + scale-110 lift when trick resolves.
2. Trump cards get a subtle amber ring so they're identifiable at a glance.
3. Player name shown above each card — "You" for the current player's card.
4. "X / Y played" counter in center keeps all players informed.
5. The subtle rotation (0.15 multiplier) keeps cards nearly upright
   while giving a natural fan feel — increase multiplier for more tilt.
6. For desktop, the container is larger so cards have more breathing room.
7. For mobile, the container fits within the game table's flex-1 area.

── Responsive container in GameTableScreen.tsx ───────────────────────────────

Wrap TrickArea in a centering div that resizes with the screen:

  <div className="flex-1 flex items-center justify-center
                  p-2 md:p-6 bg-amber-50 min-h-0 overflow-hidden">
    <TrickArea
      plays={currentTrickPlays()}
      players={players}
      winnerId={currentTrick?.winnerId ?? null}
      ledSuit={currentTrick?.ledSuit ?? null}
      trumpSuit={trumpSuit}
      myPlayerId={myPlayerId}
    />
  </div>
```

---

## Fix 8.2 — TeammateSelector: fix last condition collapsing with confirm button
```
Update packages/client/src/components/TeammateSelect/TeammateSelectScreen.tsx

The issue: the last condition slot's content overlaps with the
Confirm Teammates button because of sticky positioning + insufficient
bottom padding.

Fix 1 — Add bottom padding to the conditions list:
  Replace the conditions list wrapper:
    FROM: <div className="space-y-3">
    TO:   <div className="space-y-3 pb-32 md:pb-6">

  pb-32 on mobile gives enough room so the last slot is never
  hidden behind the sticky confirm button.
  pb-6 on desktop maintains normal spacing.

Fix 2 — Fix the sticky confirm button positioning:
  Replace the confirm button wrapper:

    <div className="
      fixed bottom-14 left-0 right-0
      md:static md:bottom-auto
      px-4 py-3 z-30
      bg-white border-t border-amber-100 shadow-lg
      md:bg-transparent md:border-0 md:shadow-none md:px-0 md:py-0
    ">
      <button
        disabled={!allSlotsFilled}
        onClick={handleConfirm}
        className="w-full md:w-auto py-4 md:py-2 px-6
                   text-base font-bold text-white rounded-xl
                   transition-colors active:scale-95
                   bg-amber-500 hover:bg-amber-600
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Confirm Teammates ({filledCount}/{maxTeammateCount})
      </button>
    </div>

  Key changes:
  - fixed bottom-14: sits just above the mobile debug drawer bar (h-14)
  - left-0 right-0: full width on mobile
  - bg-white + shadow-lg: visually separated from content below it
  - Shows filled count so bidder knows how many slots remain
  - md:static: returns to normal document flow on desktop

Fix 3 — Scroll last condition into view automatically:
  When a new condition slot is added (conditionSlots.length increases),
  scroll the page to show the new slot:

    useEffect(() => {
      if (conditionSlots.length > 0) {
        const lastSlot = document.getElementById(
          `condition-slot-${conditionSlots.length - 1}`
        )
        lastSlot?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, [conditionSlots.length])

  Add id to each slot div:
    <div id={`condition-slot-${index}`} className="bg-white rounded-2xl ...">
```

---

## Fix 8.3 — Player hand: bigger cards with more spacing
```
Update packages/client/src/components/GameTable/PlayerHand.tsx
Update packages/client/src/components/shared/CardComponent.tsx

── Part A: Bigger card size in CardComponent ────────────────────────────────

CardComponent currently uses w-16 h-24 (64x96px).
Increase to w-20 h-28 (80x112px) for better tap targets.

Update CardComponent.tsx:

  Card base size:
    FROM: className="... w-16 h-24 ..."
    TO:   className="... w-20 h-28 ..."

  Rank text size:
    FROM: text-sm
    TO:   text-base

  Center suit symbol:
    FROM: text-2xl
    TO:   text-3xl

  Points badge:
    FROM: text-xs
    TO:   text-xs font-bold   (keep small but bolder)

  Keep all other styles (border, shadow, colors) unchanged.

── Part B: Increase spacing in mobile fan layout ────────────────────────────

Update the mobile fan layout in PlayerHand.tsx:

  Card width is now 80px (w-20). Update offset calculation:

  const CARD_WIDTH = 80
  const MIN_VISIBLE = 28    // minimum px of each card that must peek out
  const MAX_OFFSET = 56     // maximum spacing between cards (comfortable tap)

  const screenWidth = window.innerWidth - 32  // 16px padding each side
  const naturalOffset = Math.floor(
    (screenWidth - CARD_WIDTH) / Math.max(sortedHand.length - 1, 1)
  )
  const offset = Math.min(MAX_OFFSET, Math.max(MIN_VISIBLE, naturalOffset))

  Update container dimensions:
    height: '128px'          // increased from 112px for taller cards
    width: calculated from offset + CARD_WIDTH as before

  Update the lifted highlight offset for valid cards:
    FROM: '-translate-y-3'
    TO:   '-translate-y-4'   // lift slightly more for bigger cards

── Part C: Desktop hand spacing ─────────────────────────────────────────────

Update the desktop hand layout in PlayerHand.tsx:

  FROM: <div className="hidden md:flex flex-wrap gap-1">
  TO:   <div className="hidden md:flex flex-wrap gap-2">

  gap-2 (8px) instead of gap-1 (4px) gives clear visual separation
  between cards on desktop, reducing misclicks there too.

── Part D: Valid card visual distinction ────────────────────────────────────

On mobile, valid cards already get -translate-y-4 lift.
Add an additional subtle pulse animation to make valid cards
even more obvious, especially important with bigger cards:

  In CardComponent.tsx, when highlighted prop is true:
    Add to className: animate-bounce

  But only for the FIRST 3 seconds after isMyTurn becomes true,
  then stop (so it's not distracting during the whole turn).

  In PlayerHand.tsx:
    const [showPulse, setShowPulse] = useState(false)

    useEffect(() => {
      if (isMyTurn) {
        setShowPulse(true)
        const t = setTimeout(() => setShowPulse(false), 3000)
        return () => clearTimeout(t)
      }
    }, [isMyTurn])

  Pass showPulse to CardComponent as animateHighlight prop:
    highlighted={isMyTurn && isValid}
    animateHighlight={isMyTurn && isValid && showPulse}

  In CardComponent, use animateHighlight to conditionally add animate-bounce:
    className={`... ${animateHighlight ? 'animate-bounce' : ''}`}
```
# PHASE 9 — Queue-Based Bidding System

## Apply Order
9.1 → 9.2 → 9.3 → 9.4 → 9.5

---

## Fix 9.1 — Update bidding types and state in core
```
Update packages/core/src/gameState.ts and packages/core/src/bidding.ts

── Part A: Add bidding queue to GameState ───────────────────────────────────

Add these fields to the GameState interface:

  biddingQueue: string[]    // ordered list of playerIds still in bidding
                            // front of array = current bidder's turn
                            // players are removed when they pass
                            // players move to back when they bid

Replace the existing bids array type with:
  bids: Bid[]               // full history of all bids and passes (unchanged)

── Part B: Update Bid type ───────────────────────────────────────────────────

Update the Bid interface:
  interface Bid {
    playerId: string
    amount: number | null   // null = pass
  }

── Part C: Initialize queue in initGame() ───────────────────────────────────

In initGame(), set:
  biddingQueue: players.map(p => p.id)
  // Queue starts with all players in their original seating order

── Part D: Update getMinBid and add getMaxBid ───────────────────────────────

In packages/core/src/bidding.ts:

  function getMinBid(deckCount: 1 | 2): number
    return deckCount === 1 ? 125 : 250   // unchanged

  Add new exported function:
  function getMaxBid(deckCount: 1 | 2): number
    return deckCount === 1 ? 250 : 500   // total points = immediate win

  Export getMaxBid from packages/core/src/index.ts

── Part E: Add queue helper functions in bidding.ts ─────────────────────────

  function isValidBid(
    amount: number,
    currentHighest: number | null,
    deckCount: 1 | 2
  ): boolean
    1. amount % 5 === 0
    2. amount >= getMinBid(deckCount)
    3. amount > (currentHighest ?? 0)
    All three must be true. Unchanged from before.

  function getCurrentBidder(biddingQueue: string[]): string | null
    return biddingQueue[0] ?? null
    The front of the queue is always whose turn it is to bid.

  function advanceBidQueue(
    biddingQueue: string[],
    playerId: string,
    action: 'bid' | 'pass'
  ): string[]
    if action === 'pass':
      return biddingQueue.filter(id => id !== playerId)
      // Remove player from queue entirely — they cannot bid again
    if action === 'bid':
      const without = biddingQueue.filter(id => id !== playerId)
      return [...without, playerId]
      // Remove from front, push to back — they can bid again later

  function isBiddingOver(
    biddingQueue: string[],
    highestBid: Bid | null,
    deckCount: 1 | 2
  ): boolean
    return biddingQueue.length <= 1 ||
           (highestBid !== null && highestBid.amount === getMaxBid(deckCount))
    // Bidding ends when:
    // 1. Only one player remains in queue (they win)
    // 2. Someone bids the maximum (total points)

  function shouldReshuffle(bids: Bid[]): boolean
    return bids.length === 0 ||
           bids.every(b => b.amount === null)
    // Reshuffle if no bids were placed at all
    // (everyone passed on first rotation without any bid)

  Export all new functions from packages/core/src/index.ts
```

---

## Fix 9.2 — Update placeBid and passBid in gameState.ts
```
Update packages/core/src/gameState.ts

Replace the existing placeBid() and passBid() functions entirely.

── placeBid() ────────────────────────────────────────────────────────────────

  function placeBid(
    state: GameState,
    playerId: string,
    amount: number
  ): GameState {

    // Validate it is this player's turn
    if (getCurrentBidder(state.biddingQueue) !== playerId) {
      throw new Error('It is not your turn to bid')
    }

    // Validate bid amount
    if (!isValidBid(amount, state.highestBid?.amount ?? null, state.deckCount)) {
      throw new Error(
        `Invalid bid. Must be a multiple of 5 and higher than ${state.highestBid?.amount ?? state.minBid - 5}`
      )
    }

    const newBid: Bid = { playerId, amount }
    const newBids = [...state.bids, newBid]
    const newQueue = advanceBidQueue(state.biddingQueue, playerId, 'bid')

    const newState = {
      ...state,
      bids: newBids,
      highestBid: newBid,
      biddingQueue: newQueue,
    }

    // Check if bidding is over
    if (isBiddingOver(newQueue, newBid, state.deckCount)) {
      return {
        ...newState,
        bidderId: playerId,
        phase: 'trump_select'
      }
    }

    return newState
  }

── passBid() ─────────────────────────────────────────────────────────────────

  function passBid(
    state: GameState,
    playerId: string
  ): GameState {

    // Validate it is this player's turn
    if (getCurrentBidder(state.biddingQueue) !== playerId) {
      throw new Error('It is not your turn to bid')
    }

    const newBid: Bid = { playerId, amount: null }
    const newBids = [...state.bids, newBid]
    const newQueue = advanceBidQueue(state.biddingQueue, playerId, 'pass')

    // Check if everyone passed with no bids placed → reshuffle
    if (newQueue.length === 0 && shouldReshuffle(newBids)) {
      return {
        ...state,
        bids: [],
        biddingQueue: state.players.map(p => p.id),
        highestBid: null,
        phase: 'dealing'   // triggers reshuffle
      }
    }

    const newState = {
      ...state,
      bids: newBids,
      biddingQueue: newQueue,
    }

    // Check if bidding is over (one player left in queue)
    if (isBiddingOver(newQueue, state.highestBid, state.deckCount)) {
      const winnerId = newQueue[0]
      return {
        ...newState,
        bidderId: winnerId,
        phase: 'trump_select'
      }
    }

    return newState
  }
```

---

## Fix 9.3 — Update server GameRoom.ts
```
Update packages/server/src/GameRoom.ts

── Update applyBid() ────────────────────────────────────────────────────────

  applyBid(playerId: string, amount: number): void {
    // Validate it is this player's turn using queue
    const currentBidder = getCurrentBidder(this.state.biddingQueue)
    if (currentBidder !== playerId) {
      throw new Error('It is not your turn to bid')
    }
    this.state = corePlaceBid(this.state, playerId, amount)
  }

── Update applyPass() ───────────────────────────────────────────────────────

  applyPass(playerId: string): void {
    const currentBidder = getCurrentBidder(this.state.biddingQueue)
    if (currentBidder !== playerId) {
      throw new Error('It is not your turn to bid')
    }
    this.state = corePassBid(this.state, playerId)
  }

── Update getSanitizedStateFor() ────────────────────────────────────────────

Include biddingQueue in ClientGameState:
  biddingQueue: this.state.biddingQueue

── Update startGame() ───────────────────────────────────────────────────────

After dealCards(), reinitialize the bidding queue with all player IDs
in their seating order:
  this.state = {
    ...this.state,
    biddingQueue: this.state.players.map(p => p.id),
    bids: [],
    highestBid: null,
    bidderId: null,
    phase: 'bidding'
  }
```

---

## Fix 9.4 — Update client store and BiddingScreen
```
── Part A: Update gameStore.ts ──────────────────────────────────────────────

Add to store interface:
  biddingQueue: string[]

Add to initial state:
  biddingQueue: []

Update socket.on('state_update') handler to include biddingQueue
from incoming ClientGameState (it is already spread via ...state
so no additional change needed if biddingQueue is in ClientGameState).

Update isMyTurn() selector — during bidding phase use queue:
  isMyTurn: () => {
    const { phase, biddingQueue, currentPlayerIndex, players, myPlayerId } = get()
    if (phase === 'bidding') {
      return biddingQueue[0] === myPlayerId
    }
    return players[currentPlayerIndex]?.id === myPlayerId
  }

── Part B: Update BiddingScreen.tsx ─────────────────────────────────────────

Read biddingQueue from store:
  const biddingQueue = useGameStore(s => s.biddingQueue)
  const players = useGameStore(s => s.players)
  const myPlayerId = useGameStore(s => s.myPlayerId)

── Queue status display ──────────────────────────────────────────────────────

Add a queue display section showing who is still in the bidding:

  <div className="space-y-1">
    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
      Still Bidding ({biddingQueue.length} players)
    </p>
    {biddingQueue.map((playerId, index) => {
      const player = players.find(p => p.id === playerId)
      const isCurrentBidder = index === 0
      const isMe = playerId === myPlayerId
      return (
        <div
          key={playerId}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg
                      text-sm ${
            isCurrentBidder
              ? 'bg-amber-100 border border-amber-300 font-bold'
              : 'bg-gray-50'
          }`}
        >
          { isCurrentBidder && (
            <span className="text-amber-500 text-xs">▶</span>
          )}
          <span className={isMe ? 'text-amber-600' : 'text-gray-700'}>
            {player?.name ?? playerId}
            {isMe ? ' (you)' : ''}
          </span>
          { isCurrentBidder && (
            <span className="ml-auto text-xs text-amber-500 font-medium">
              Bidding now
            </span>
          )}
        </div>
      )
    })}
  </div>

── Show passed players separately ───────────────────────────────────────────

  const passedPlayerIds = players
    .filter(p => !biddingQueue.includes(p.id))
    .map(p => p.id)

  { passedPlayerIds.length > 0 && (
    <div className="mt-3">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
        Passed
      </p>
      <div className="flex flex-wrap gap-2">
        {passedPlayerIds.map(id => (
          <span key={id}
                className="text-xs bg-gray-100 text-gray-400
                           px-2 py-1 rounded-full line-through">
            {players.find(p => p.id === id)?.name}
          </span>
        ))}
      </div>
    </div>
  )}

── Bid input: only show when it is my turn ───────────────────────────────────

  Replace disabled={!isMyTurn} with a condition that also
  checks the queue:

  const isMyBiddingTurn = biddingQueue[0] === myPlayerId

  Show bid chips and buttons only when isMyBiddingTurn is true.
  When it is not my turn, show:
    <p className="text-center text-gray-500 py-4">
      Waiting for {players.find(p => p.id === biddingQueue[0])?.name} to bid...
    </p>
```

---

## Fix 9.5 — Update tests
```
Update packages/core/tests/bidding.test.ts

Replace all existing bidding tests with these queue-based tests:

── Queue initialization ──────────────────────────────────────────────────────

test('biddingQueue initializes with all players in order'):
  state = initGame(['p1', 'p2', 'p3', 'p4'])
  state = dealCards(state)
  expect(state.biddingQueue).toEqual(['p1', 'p2', 'p3', 'p4'])

── Passing removes player from queue ────────────────────────────────────────

test('passing removes player from queue'):
  state = passBid(state, 'p1')
  expect(state.biddingQueue).toEqual(['p2', 'p3', 'p4'])
  expect(state.biddingQueue).not.toContain('p1')

── Bidding moves player to back of queue ────────────────────────────────────

test('bidding moves player to back of queue'):
  state = placeBid(state, 'p1', 125)
  expect(state.biddingQueue[0]).toBe('p2')
  expect(state.biddingQueue[state.biddingQueue.length - 1]).toBe('p1')

── Last player in queue wins bid ────────────────────────────────────────────

test('last player remaining in queue wins bid automatically'):
  state = placeBid(state, 'p1', 125)
  state = passBid(state, 'p2')
  state = passBid(state, 'p3')
  state = passBid(state, 'p4')
  // p1 is now the only one left
  expect(state.phase).toBe('trump_select')
  expect(state.bidderId).toBe('p1')

── Max bid wins immediately ──────────────────────────────────────────────────

test('bidding max points ends bidding immediately'):
  state = placeBid(state, 'p1', 250)   // max for 1 deck
  expect(state.phase).toBe('trump_select')
  expect(state.bidderId).toBe('p1')

── Everyone passes → reshuffle ──────────────────────────────────────────────

test('all players passing with no bids triggers reshuffle'):
  state = passBid(state, 'p1')
  state = passBid(state, 'p2')
  state = passBid(state, 'p3')
  state = passBid(state, 'p4')
  expect(state.phase).toBe('dealing')
  expect(state.bids).toHaveLength(0)
  expect(state.biddingQueue).toHaveLength(4)  // reset to all players

── Cannot bid out of turn ────────────────────────────────────────────────────

test('bidding out of turn throws error'):
  expect(() => placeBid(state, 'p2', 125)).toThrow('It is not your turn')

── Multi-round bidding ───────────────────────────────────────────────────────

test('bidding can go multiple rounds before resolving'):
  state = placeBid(state, 'p1', 125)  // p1 bids, goes to back
  state = placeBid(state, 'p2', 130)  // p2 bids, goes to back
  state = placeBid(state, 'p3', 135)  // p3 bids, goes to back
  state = passBid(state, 'p4')        // p4 passes, removed
  state = placeBid(state, 'p1', 140)  // p1 bids again
  state = passBid(state, 'p2')        // p2 passes
  state = passBid(state, 'p3')        // p3 passes
  // p1 is last in queue
  expect(state.phase).toBe('trump_select')
  expect(state.bidderId).toBe('p1')
  expect(state.highestBid?.amount).toBe(140)

── Invalid bid throws ────────────────────────────────────────────────────────

test('bid not multiple of 5 throws'):
  expect(() => placeBid(state, 'p1', 127)).toThrow()

test('bid below minimum throws'):
  expect(() => placeBid(state, 'p1', 100)).toThrow()

test('bid not higher than current highest throws'):
  state = placeBid(state, 'p1', 150)
  state = placeBid(state, 'p2', 150)  // not higher → throws
  // Actually p2 is now at front after p1 bid
  expect(() => placeBid(state, 'p2', 150)).toThrow()
```
# PHASE 10 — Mobile Card Hand: Horizontal Scroll + Relative Styling

## Apply Order
10.1 → 10.2 → 10.3

---

## Fix 10.1 — Global scroll utility + relative base font
```
Update packages/client/src/index.css

Add these global rules:

  /* Fluid base font: scales between 14px (320px screen) and 16px (768px+)
     All rem values throughout the app scale with this automatically */
  html {
    font-size: clamp(14px, 3.5vw, 16px);
  }

  /* Prevent horizontal page overflow at root */
  body {
    overflow-x: hidden;
    width: 100%;
  }

  /* Reusable horizontal scroll container
     Used for card hands on mobile */
  .scroll-x {
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;  /* momentum scroll on iOS */
    scrollbar-width: none;              /* hide scrollbar Firefox */
  }
  .scroll-x::-webkit-scrollbar {
    display: none;                      /* hide scrollbar Chrome/Safari */
  }
```

---

## Fix 10.2 — CardComponent: relative sizing via CSS custom property
```
Update packages/client/src/components/shared/CardComponent.tsx

Replace all fixed px/Tailwind size classes with values derived from
a single CSS custom property --card-width so each context can
override card size with one variable.

── Card container ────────────────────────────────────────────────────────────

  FROM:
    <div className="w-20 h-28 rounded-xl ...">

  TO:
    <div
      className="relative bg-white shadow-md flex flex-col
                 justify-between select-none"
      style={{
        width: 'var(--card-width, 5rem)',
        height: 'calc(var(--card-width, 5rem) * 1.4)',
        borderRadius: 'calc(var(--card-width, 5rem) * 0.12)',
        padding: 'calc(var(--card-width, 5rem) * 0.08)',
        flexShrink: 0,
      }}
    >

  This means:
    Default width  = 5rem  (80px at 16px base font)
    Height         = 1.4x width  (standard card ratio, never distorted)
    Border radius  = 12% of width  (always proportional)
    Padding        = 8% of width   (always proportional)
    flexShrink: 0  prevents card squishing inside flex/scroll containers

── Rank text (top-left corner) ──────────────────────────────────────────────

  FROM: <span className="text-sm font-bold ...">
  TO:   <span style={{ fontSize: 'calc(var(--card-width, 5rem) * 0.22)',
                       fontWeight: 'bold',
                       lineHeight: 1 }}>

── Center suit symbol ────────────────────────────────────────────────────────

  FROM: <span className="text-3xl ...">
  TO:   <span style={{ fontSize: 'calc(var(--card-width, 5rem) * 0.45)',
                       lineHeight: 1 }}>

── Points badge (bottom-right) ───────────────────────────────────────────────

  FROM: <span className="text-xs font-bold ...">
  TO:   <span style={{ fontSize: 'calc(var(--card-width, 5rem) * 0.17)',
                       fontWeight: 'bold' }}>

── Ring/highlight classes — keep unchanged ───────────────────────────────────
  ring-2, ring-blue-400, opacity-40, animate-bounce — all fine as-is
  Only size-related values are changed above.

── How to override card size per context ────────────────────────────────────

  Hand on mobile:    style={{ '--card-width': '4.5rem' } as React.CSSProperties}
  Hand on desktop:   style={{ '--card-width': '5rem'   } as React.CSSProperties}
  Trick area:        style={{ '--card-width': '3.5rem' } as React.CSSProperties}
  Bidding preview:   style={{ '--card-width': '4rem'   } as React.CSSProperties}
```

---

## Fix 10.3 — PlayerHand: horizontal scroll on mobile, flex-wrap on desktop
```
Update packages/client/src/components/GameTable/PlayerHand.tsx

Replace the absolute-positioned fan layout entirely with a
horizontally scrollable flex row on mobile.

Preserve the lift state logic from Fix 8.5 exactly — only the
JSX layout changes, not the liftedCardKeys/showPulse hooks.

── Remove these entirely ────────────────────────────────────────────────────

  Remove:
    - CARD_WIDTH_REM, CARD_HEIGHT_REM, LIFT_PERCENT constants
    - containerRef, containerWidthRem state and useEffect
    - leftPercent calculation
    - position: absolute, top: 0, left: Xpx on card divs
    - The relative container with paddingTop

  Keep:
    - validCardKeys Set computed outside the map
    - liftedCardKeys state and both useEffects from Fix 8.5
    - showPulse state and useEffect from Fix 8.5
    - sortedHand from sortHand()
    - All onClick/disabled/highlighted/animateHighlight logic

── Mobile layout: horizontal scroll ─────────────────────────────────────────

  <div className="md:hidden w-full pb-16">

    {/* Outer scroll container — full width, scrolls horizontally */}
    <div
      className="scroll-x w-full flex flex-row items-end"
      style={{
        paddingTop: '1.5rem',    // space above cards for lift animation
        paddingLeft: '1rem',
        paddingRight: '1rem',
        paddingBottom: '0.5rem',
      }}
    >
      {sortedHand.map((card, index) => {
        const cardKey = `${card.suit}-${card.rank}-${card.deckIndex}`
        const isValid = validCardKeys.has(cardKey)
        const isLifted = liftedCardKeys.has(cardKey)

        return (
          <div
            key={cardKey}
            className="flex-shrink-0 transition-transform duration-200"
            style={{
              // Override card size for mobile hand
              '--card-width': '4.5rem',
              // Negative margin creates overlap — 30% of card width
              // Using calc() keeps it relative to card size
              marginLeft: index === 0
                ? 0
                : 'calc(var(--card-width) * -0.30)',
              // z-index: lifted (valid) cards appear above others
              zIndex: isLifted ? index + 20 : index,
              position: 'relative',   // required for z-index in flex row
              // Lift valid cards upward using rem (scales with font size)
              // Non-valid cards stay at baseline (translateY 0)
              transform: isLifted
                ? 'translateY(-1rem)'
                : 'translateY(0)',
            } as React.CSSProperties}
          >
            <CardComponent
              card={card}
              onClick={isMyTurn && isValid
                ? () => store.playCard(card)
                : undefined}
              disabled={!isMyTurn || !isValid}
              highlighted={isMyTurn && isValid}
              animateHighlight={isMyTurn && isValid && showPulse}
            />
          </div>
        )
      })}

      {/* Right padding spacer so last card scrolls fully into view */}
      <div style={{ minWidth: '1rem', flexShrink: 0 }} aria-hidden />
    </div>

  </div>

── Desktop layout: flex-wrap row ────────────────────────────────────────────

  <div
    className="hidden md:flex flex-wrap"
    style={{ gap: '0.5rem' }}
  >
    {sortedHand.map(card => {
      const cardKey = `${card.suit}-${card.rank}-${card.deckIndex}`
      const isValid = validCardKeys.has(cardKey)
      const isLifted = liftedCardKeys.has(cardKey)
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
            onClick={isMyTurn && isValid
              ? () => store.playCard(card)
              : undefined}
            disabled={!isMyTurn || !isValid}
            highlighted={isMyTurn && isValid}
            animateHighlight={isMyTurn && isValid && showPulse}
          />
        </div>
      )
    })}
  </div>

── BiddingScreen hand preview ────────────────────────────────────────────────

  No changes needed in BiddingScreen.tsx for the hand itself —
  <PlayerHand disabled /> already renders the scroll layout above.

  The disabled prop means isMyTurn is false inside PlayerHand,
  so no cards are lifted and no onClick handlers are attached.
  The scroll container still works exactly the same.

  Only ensure the show/hide wrapper in BiddingScreen does NOT
  constrain the width of PlayerHand:

    FROM:
      <div className={showHand ? 'block' : 'hidden md:block'}>
        <PlayerHand disabled />
      </div>

    TO:
      <div className={`w-full ${showHand ? 'block' : 'hidden md:block'}`}>
        <PlayerHand disabled />
      </div>

  w-full ensures the scroll container inside PlayerHand
  has the full screen width available to scroll within.

── Why scroll instead of absolute fan ───────────────────────────────────────

  Absolute fan issues:
    - JS measurement of containerWidthRem unreliable before first paint
    - Cards at screen edges clip regardless of offset math
    - paddingTop in px caused overflow into score bar

  Scroll row advantages:
    - Native browser scroll — works on all screen sizes automatically
    - No JS measurement needed — CSS handles everything
    - Overlap via negative margin-left uses calc(var(--card-width) * X)
      so it is always proportional to card size, never a fixed px value
    - Lift via translateY in rem scales with html font-size
    - Last card always reachable — right padding spacer ensures it

── Verify after applying ─────────────────────────────────────────────────────

  Test at these widths in DevTools (portrait, mobile preset):
    320px — Galaxy A / small Android
    375px — iPhone SE
    390px — iPhone 14
    414px — iPhone 14 Plus

  For each width check:
    [ ] Hand cards do NOT overflow the screen edge
    [ ] Swiping left reveals remaining cards smoothly
    [ ] Last card fully visible after scrolling to end
    [ ] Valid cards lift upward cleanly on your turn
    [ ] Lifted cards do NOT overlap score bar or trick area above
    [ ] Tapping a valid card plays it correctly
    [ ] Disabled hand in BiddingScreen scrolls but cards are not tappable
    [ ] Desktop (768px+) shows flex-wrap row, no horizontal scroll
```
# PHASE 10 — Addendum: TrickArea Relative Sizing

## Fix 10.4 — TrickArea: replace fixed px dimensions with vw-based values
```
Update packages/client/src/components/GameTable/TrickArea.tsx

The arc/fan layout from Fix 8.1 is kept exactly as-is.
Only the fixed px dimension constants (W, H, rx, ry) are replaced
with values derived from viewport width so the arc scales correctly
on any screen size without JS measurement.

── Step 1: Replace static constants with reactive state ─────────────────────

  Remove:
    const isMobile = window.innerWidth < 768
    const W = isMobile ? 300 : 400
    const H = isMobile ? 220 : 280

  Replace with:

    const [dims, setDims] = useState(() => calcDims())

    function calcDims() {
      const vw = window.innerWidth
      const W = Math.min(vw * 0.92, 420)  // 92% of screen, max 420px
      const H = W * 0.68                  // height always 68% of width
      return { W, H }
    }

    useEffect(() => {
      const onResize = () => setDims(calcDims())
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }, [])

    const { W, H } = dims

  This means:
    - On a 390px phone:  W = 359px, H = 244px
    - On a 375px phone:  W = 345px, H = 235px
    - On a 768px tablet: W = 420px, H = 286px  (capped at 420)
    - On a 1200px desktop: W = 420px, H = 286px (capped at 420)

── Step 2: Derive all arc geometry from W and H (unchanged ratios) ──────────

  Keep these exactly as Fix 8.1 defined them — ratios are already relative:
    const cx = W / 2
    const cy = H * 0.55
    const rx = W * 0.38
    const ry = H * 0.42

  These are all percentages of W/H so they automatically
  scale correctly once W and H are relative.

── Step 3: Make card size relative per context ──────────────────────────────

  Wrap each card div with the --card-width override from Fix 10.2:

    <div
      key={play.playOrder}
      className="absolute transition-all duration-300"
      style={{
        '--card-width': `${W * 0.18}px`,
        // Card width = 18% of container width
        // On 390px phone:  W=359 → card = 64px  (~4rem)
        // On desktop:      W=420 → card = 75px  (~4.7rem)
        // Automatically proportional — no breakpoint needed
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        transform: `rotate(${pos.rotate * 0.15}deg)`,
        zIndex: isWinner ? 10 : index,
      } as React.CSSProperties}
    >

  Remove any hardcoded w-16, w-20 or similar size classes
  from CardComponent inside TrickArea — the --card-width
  custom property from Fix 10.2 handles sizing.

── Step 4: Make container use relative width ────────────────────────────────

  FROM:
    <div
      className="relative mx-auto"
      style={{ width: `${W}px`, height: `${H}px` }}
    >

  TO:
    <div
      className="relative mx-auto w-full"
      style={{
        maxWidth: `${W}px`,
        height: `${H}px`,
        // w-full lets it shrink on very small screens
        // maxWidth caps it at the calculated W
      }}
    >

  Also update getCardPosition() to use the actual rendered width.
  Since the container is now w-full with maxWidth, pass W directly —
  it is already capped to 92vw so it will never exceed screen width.

── Step 5: Verify arc layout at all sizes ───────────────────────────────────

  Check in DevTools at:
    320px — cards should still fit inside arc, no clipping
    375px — arc centered, all cards visible
    390px — standard test size
    768px — desktop layout, larger arc, cards bigger

  For each size check:
    [ ] All played cards visible inside the arc
    [ ] No card clipped by screen edge
    [ ] Winner glow ring fully visible
    [ ] Player name labels not truncated into each other
    [ ] Center counter text readable
    [ ] Arc resizes correctly after rotating device
```
# PHASE 11 — Game Start Info Banner

## Apply Order
11.1 → 11.2 → 11.3

---

## Fix 11.1 — Add game_start_info event from server
```
Update packages/server/src/events/onSetConditions.ts

After the teammate conditions are successfully applied and
broadcastStateUpdate is sent, emit an additional event to all
players in the room with the game start summary.

Add immediately after broadcastStateUpdate(io, room):

  const state = room.state
  const bidder = state.players.find(p => p.id === state.bidderId)

  io.to(room.roomId).emit('game_start_info', {
    trumpSuit: state.trumpSuit,
    bidderName: bidder?.name ?? '',
    bidAmount: state.highestBid?.amount ?? 0,
    teammateCount: state.maxTeammateCount,   // number of teammates (not bidder)
    conditions: state.teammateConditions.map(c => ({
      type: c.type,
      suit: c.suit ?? null,
      rank: c.rank ?? null,
      instance: c.instance ?? null,
      // DO NOT include satisfiedByPlayerId or any player-identifying info
    }))
  })

Add GameStartInfo type to packages/server/src/events.ts:

  interface GameStartInfo {
    trumpSuit: Suit
    bidderName: string
    bidAmount: number
    teammateCount: number
    conditions: {
      type: 'card_reveal' | 'first_trick_win'
      suit: Suit | null
      rank: string | null
      instance: number | null
    }[]
  }
```

---

## Fix 11.2 — Store game start info in client store
```
Update packages/client/src/gameStore.ts

── Add state ─────────────────────────────────────────────────────────────────

  Add to store interface:
    gameStartInfo: GameStartInfo | null
    showGameStartBanner: boolean

  Add to initial state:
    gameStartInfo: null,
    showGameStartBanner: false

  Add GameStartInfo type mirroring the server type above.

── Add socket listener ───────────────────────────────────────────────────────

  In setupSocketListeners(), add:

    socket.on('game_start_info', (info: GameStartInfo) => {
      set({
        gameStartInfo: info,
        showGameStartBanner: true
      })
    })

── Add dismiss action ────────────────────────────────────────────────────────

  Add to store actions:
    dismissGameStartBanner: () => set({ showGameStartBanner: false })
```

---

## Fix 11.3 — GameStartBanner component
```
Create packages/client/src/components/shared/GameStartBanner.tsx

This banner slides in from the top when showGameStartBanner is true,
displays game info for 10 seconds, then slides back out and dismisses.

── Imports and state ────────────────────────────────────────────────────────

  import { useEffect, useState } from 'react'
  import { useGameStore } from '../../gameStore'
  import type { Suit } from '@blind-alliance/core'

  const info = useGameStore(s => s.gameStartInfo)
  const show = useGameStore(s => s.showGameStartBanner)
  const dismiss = useGameStore(s => s.dismissGameStartBanner)

  const [visible, setVisible] = useState(false)
  const [progress, setProgress] = useState(100)

  const DURATION_MS = 10000

── Animate in on mount, auto-dismiss after 10s ──────────────────────────────

  useEffect(() => {
    if (!show || !info) return

    // Trigger slide-in on next frame
    const showTimer = setTimeout(() => setVisible(true), 50)

    // Countdown progress bar
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / DURATION_MS) * 100)
      setProgress(remaining)
      if (remaining === 0) clearInterval(progressInterval)
    }, 50)

    // Slide out then dismiss
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(dismiss, 400)  // wait for slide-out animation before unmounting
    }, DURATION_MS)

    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
      clearInterval(progressInterval)
    }
  }, [show, info])

  if (!show || !info) return null

── Helper functions ──────────────────────────────────────────────────────────

  function suitSymbol(suit: Suit): string {
    return { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[suit]
  }

  function suitColor(suit: Suit): string {
    return {
      spades: 'text-gray-900',
      hearts: 'text-red-500',
      diamonds: 'text-orange-500',
      clubs: 'text-emerald-700',
    }[suit]
  }

  function conditionLabel(c: GameStartInfo['conditions'][number]): string {
    if (c.type === 'first_trick_win') return 'Wins the first trick'
    const instance = c.instance === 2 ? '2nd' : '1st'
    const instanceLabel = c.instance ? `${instance} ` : ''
    return `Plays ${instanceLabel}${c.rank}${suitSymbol(c.suit!)}`
  }

── JSX ───────────────────────────────────────────────────────────────────────

  <div
    className="fixed top-0 left-0 right-0 z-50 flex justify-center
               pointer-events-none"
    style={{
      // Slide in from top when visible, slide out when not
      transform: visible ? 'translateY(0)' : 'translateY(-110%)',
      transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      // cubic-bezier gives a slight bounce on slide-in for polish
    }}
  >
    <div
      className="pointer-events-auto mx-4 mt-3 w-full
                 bg-white rounded-2xl shadow-2xl
                 border-2 border-amber-200 overflow-hidden"
      style={{ maxWidth: '32rem' }}
    >

      {/* Progress bar — drains left to right over 10 seconds */}
      <div className="h-1 bg-amber-100">
        <div
          className="h-full bg-amber-400 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-gray-800"
              style={{ fontSize: '1.1rem' }}>
            Game Starting
          </h2>
          <span className="text-xs text-gray-400">
            {Math.ceil(progress / 10)}s
          </span>
        </div>

        {/* Trump suit — large and prominent */}
        <div className="flex items-center gap-3 bg-amber-50
                        rounded-xl px-4 py-3">
          <span className={`font-black ${suitColor(info.trumpSuit)}`}
                style={{ fontSize: '2.5rem', lineHeight: 1 }}>
            {suitSymbol(info.trumpSuit)}
          </span>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Trump Suit
            </p>
            <p className={`font-bold text-lg capitalize ${suitColor(info.trumpSuit)}`}>
              { { spades: 'Spades', hearts: 'Hearts',
                  diamonds: 'Diamonds', clubs: 'Clubs' }[info.trumpSuit] }
            </p>
          </div>
        </div>

        {/* Bidder + amount + teammate count */}
        <div className="flex gap-3">
          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Bidder
            </p>
            <p className="font-bold text-gray-800 truncate">
              {info.bidderName}
            </p>
            <p className="text-sm text-amber-600 font-semibold">
              Bid: {info.bidAmount}
            </p>
          </div>
          <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Teammates
            </p>
            <p className="font-bold text-gray-800"
               style={{ fontSize: '1.5rem' }}>
              {info.teammateCount}
            </p>
            <p className="text-xs text-gray-500">
              secret {info.teammateCount === 1 ? 'ally' : 'allies'}
            </p>
          </div>
        </div>

        {/* Teammate conditions */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">
            Teammate Conditions
          </p>
          <div className="space-y-1.5">
            {info.conditions.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-yellow-50
                           border border-yellow-200 rounded-lg px-3 py-2"
              >
                <span className="text-yellow-500 text-sm">⚑</span>
                <span className="text-sm text-gray-700 font-medium">
                  {conditionLabel(c)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 italic">
            Teammates are revealed when these conditions are met
          </p>
        </div>

      </div>
    </div>
  </div>

── Mount in App.tsx ──────────────────────────────────────────────────────────

  Import and add <GameStartBanner /> inside App.tsx,
  placed after <ErrorToast /> and before the main layout div:

    import { GameStartBanner } from './components/shared/GameStartBanner'

    export default function App() {
      return (
        <div className="min-h-screen bg-amber-50 ...">
          <ErrorToast />
          <GameStartBanner />     ← add here
          <ReconnectingBanner />
          ...rest of layout...
        </div>
      )
    }

  Placing it at App root means it overlays every screen correctly
  and is not affected by any screen's scroll or overflow settings.
```
# PHASE 12 — Mobile Data Connectivity Fix

## Apply Order
A1 → A2a → A2b

---

## Change A1 — `packages/client/src/socket.ts`

```
Replace the entire file with the following:

  import { io } from 'socket.io-client'

  const SERVER_URL =
    import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

  // Force https:// in production so Socket.IO uses wss:// for WebSocket.
  // Carrier proxies cannot inspect encrypted wss:// traffic.
  // Plain ws:// (derived from http://) is visible to proxies and gets dropped,
  // causing the infinite reconnect loop on mobile data.
  const SECURE_URL = SERVER_URL.replace(/^http:\/\//, 'https://')

  export const socket = io(
    import.meta.env.DEV ? SERVER_URL : SECURE_URL,
    {
      autoConnect: false,

      // Start with polling first, upgrade to websocket after handshake.
      // Polling = plain HTTPS requests, never blocked by carrier proxies.
      // WebSocket upgrade happens silently in background after connect.
      transports: ['polling', 'websocket'],

      // Allow silent upgrade to WebSocket after polling handshake
      upgrade: true,

      // Reconnection settings
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 20000,
    }
  )

  export const connectSocket = () => socket.connect()
  export const disconnectSocket = () => socket.disconnect()
```

---

## Change A2a — `packages/server/src/index.ts`: replace Socket.IO init

```
Find the existing new Server(httpServer, { ... }) block and replace it:

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      // Required for polling on cross-origin requests (Vercel → Railway).
      // Without credentials: true the browser blocks polling HTTP requests
      // before they reach Socket.IO.
      credentials: true,
      allowedHeaders: ['Content-Type'],
    },

    // Must mirror client transport order for negotiation to succeed
    transports: ['polling', 'websocket'],

    // 30s for WebSocket upgrade — mobile data is slower than default 10s
    upgradeTimeout: 30000,

    // Heartbeat — keeps connections alive through mobile network switches
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,

    maxHttpBufferSize: 1e6,

    // Support older Android WebViews using Socket.IO Engine v3
    allowEIO3: true,
  })
```

---

## Change A2b — `packages/server/src/index.ts`: add OPTIONS handler

```
Add this block immediately AFTER the new Server(...) block
and BEFORE the io.on('connection', ...) call:

  // Handle CORS preflight for polling transport.
  // Before cross-origin polling requests (Vercel → Railway), the browser
  // sends an OPTIONS preflight asking "is this allowed?".
  // If not handled correctly the browser cancels the polling request entirely.
  // Socket.IO's built-in CORS does not reliably cover this on all mobile
  // browsers so we handle it explicitly.
  app.options('*', (req, res) => {
    res.setHeader(
      'Access-Control-Allow-Origin',
      process.env.CLIENT_URL || 'http://localhost:5173'
    )
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.sendStatus(204)
  })
```