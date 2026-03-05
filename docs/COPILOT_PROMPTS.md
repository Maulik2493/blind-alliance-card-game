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