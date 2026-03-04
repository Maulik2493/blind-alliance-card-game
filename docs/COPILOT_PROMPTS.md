# Blind Alliance — GitHub Copilot Prompts

## Overview of Phases
- **Phase 0** — Migrate to monorepo (npm workspaces)
- **Phase 1** — Core logic ✅ DONE
- **Phase 2** — Backend server (Node.js + TypeScript + Socket.IO)
- **Phase 3** — Frontend client (React + Vite + Zustand)

Work through prompts in order. Each step builds on the previous.
Reference `GAME_DESIGN.md` and `copilot-instructions.md` for all types and rules.

---

# PHASE 0 — Monorepo Migration

## Step 0.1 — Root package.json
```
Replace the current root package.json with a monorepo root package.json.

The new root package.json should:
- Set "name": "blind-alliance-monorepo"
- Set "private": true
- Add "workspaces": ["packages/core", "packages/server", "packages/client"]
- Move NO dependencies here — root has no dependencies of its own
- Add these root-level scripts:
    "dev": "npm run dev --workspace=packages/client & npm run dev --workspace=packages/server"
    "build": "npm run build --workspace=packages/core && npm run build --workspace=packages/server && npm run build --workspace=packages/client"
    "test": "npm run test --workspace=packages/core"
    "test:watch": "npm run test:watch --workspace=packages/core"
- Keep "engines": { "node": ">=18" }
```

## Step 0.2 — Create packages/core
```
Create the packages/core/ package by doing the following:

1. Create folder packages/core/src/
2. Move all files from src/core/ into packages/core/src/
   Files to move: card.ts, deck.ts, bidding.ts, conditions.ts,
                  trick.ts, scoring.ts, gameState.ts, conditionCards.ts
3. Move the existing tests/core/ folder to packages/core/tests/
4. Create packages/core/package.json:
   {
     "name": "@blind-alliance/core",
     "version": "1.0.0",
     "private": true,
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "test": "vitest run",
       "test:watch": "vitest"
     },
     "devDependencies": {
       "typescript": "^5.0.0",
       "vitest": "^1.0.0"
     }
   }
5. Create packages/core/tsconfig.json:
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "CommonJS",
       "lib": ["ES2020"],
       "outDir": "dist",
       "rootDir": "src",
       "strict": true,
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "esModuleInterop": true
     },
     "include": ["src"],
     "exclude": ["node_modules", "dist", "tests"]
   }
6. Create packages/core/src/index.ts that re-exports everything:
   export * from './card';
   export * from './deck';
   export * from './bidding';
   export * from './conditions';
   export * from './conditionCards';
   export * from './trick';
   export * from './scoring';
   export * from './gameState';
7. Update all internal imports inside packages/core/src/ files
   to use relative paths (e.g. import { Card } from './card')
8. Update all test files in packages/core/tests/ to import from
   '@blind-alliance/core' instead of relative paths
```

## Step 0.3 — Create packages/client
```
Create the packages/client/ package from the existing Vite React app.

1. Create folder packages/client/
2. Move these files/folders from the project root into packages/client/:
   - src/ (everything except src/core/ which is already moved)
   - index.html
   - vite.config.ts
   - tsconfig.json (rename to tsconfig.client.json first if there's a conflict)
3. Create packages/client/package.json:
   {
     "name": "@blind-alliance/client",
     "version": "1.0.0",
     "private": true,
     "scripts": {
       "dev": "vite",
       "build": "tsc && vite build",
       "preview": "vite preview"
     },
     "dependencies": {
       "@blind-alliance/core": "*",
       "react": "^18.0.0",
       "react-dom": "^18.0.0",
       "zustand": "^4.0.0",
       "socket.io-client": "^4.7.0"
     },
     "devDependencies": {
       "@vitejs/plugin-react": "^4.0.0",
       "typescript": "^5.0.0",
       "vite": "^5.0.0",
       "@types/react": "^18.0.0",
       "@types/react-dom": "^18.0.0"
     }
   }
4. Update packages/client/vite.config.ts to resolve the workspace package:
   import { defineConfig } from 'vite'
   import react from '@vitejs/plugin-react'
   export default defineConfig({
     plugins: [react()],
     resolve: {
       alias: {
         '@blind-alliance/core': '../core/src/index.ts'
       }
     }
   })
   This alias lets Vite resolve the core package directly from source
   during development without needing to build core first.
5. Update all imports in packages/client/src/ that previously imported
   from relative paths like '../../core/...' or '../core/...'
   to now import from '@blind-alliance/core'
6. Create packages/client/tsconfig.json:
   {
     "compilerOptions": {
       "target": "ES2020",
       "lib": ["ES2020", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "moduleResolution": "bundler",
       "jsx": "react-jsx",
       "strict": true,
       "paths": {
         "@blind-alliance/core": ["../core/src/index.ts"]
       }
     },
     "include": ["src"],
     "references": [{ "path": "../core" }]
   }
```

## Step 0.4 — Create packages/server scaffold
```
Create an empty packages/server/ package ready for Phase 2.

1. Create folder packages/server/src/
2. Create packages/server/package.json:
   {
     "name": "@blind-alliance/server",
     "version": "1.0.0",
     "private": true,
     "main": "dist/index.js",
     "scripts": {
       "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
       "build": "tsc",
       "start": "node dist/index.js"
     },
     "dependencies": {
       "@blind-alliance/core": "*",
       "express": "^4.18.0",
       "socket.io": "^4.7.0",
       "cors": "^2.8.5",
       "uuid": "^9.0.0"
     },
     "devDependencies": {
       "typescript": "^5.0.0",
       "ts-node-dev": "^2.0.0",
       "@types/express": "^4.17.0",
       "@types/cors": "^2.8.0",
       "@types/uuid": "^9.0.0"
     }
   }
3. Create packages/server/tsconfig.json:
   {
     "compilerOptions": {
       "target": "ES2020",
       "module": "CommonJS",
       "lib": ["ES2020"],
       "outDir": "dist",
       "rootDir": "src",
       "strict": true,
       "esModuleInterop": true,
       "resolveJsonModule": true,
       "sourceMap": true
     },
     "include": ["src"],
     "exclude": ["node_modules", "dist"]
   }
4. Create a placeholder packages/server/src/index.ts:
   console.log('Blind Alliance server - not yet implemented')
```

## Step 0.5 — Install and Verify
```
Run the following in order from the repo root and fix any errors before proceeding:

1. npm install
   This links all workspace packages together. @blind-alliance/core will be
   symlinked into node_modules for both server and client automatically.

2. npm run build --workspace=packages/core
   Should compile core to packages/core/dist/ with no errors.

3. npm test
   All existing core tests must still pass. If any imports are broken,
   fix them in packages/core/tests/ to import from '@blind-alliance/core'.

4. npm run dev --workspace=packages/client
   Vite dev server should start and the React app should load in the browser.
   Fix any import path errors in client src files.

Do NOT proceed to Phase 2 until all three checks above pass cleanly.
```

---

# PHASE 2 — Backend Server

All files go inside `packages/server/src/` unless stated otherwise.

## Step 2.1 — Socket Event Types (Shared Contract)
```
Create packages/server/src/events.ts

This file defines the complete Socket.IO event contract between client and server.
Both server and client will reference these types.

Define two interfaces — one for events the CLIENT emits, one for events the SERVER emits:

CLIENT → SERVER events (ServerToClientEvents in Socket.IO terms are reversed here):
  'join_room':        { playerName: string, roomId?: string }
                      If roomId is omitted, server creates a new room.
  'start_game':       {} — host triggers game start
  'place_bid':        { amount: number }
  'pass_bid':         {}
  'select_trump':     { suit: Suit }
  'set_conditions':   { conditions: TeammateCondition[] }
  'play_card':        { cardId: string }
                      cardId format: "suit-rank-deckIndex" e.g. "spades-A-0"

SERVER → CLIENT events:
  'room_joined':      { roomId: string, playerId: string, players: PublicPlayer[] }
  'player_joined':    { players: PublicPlayer[] }
  'game_started':     { hand: Card[], phase: GamePhase }
  'state_update':     { state: ClientGameState }
                      ClientGameState is the sanitized view — no other players' hands
  'action_error':     { message: string }
                      Sent only to the player who made the invalid action
  'game_over':        { winner: 'bidder_team' | 'opposition_team', summary: ScoreSummary }

Also define:
  PublicPlayer: { id: string, name: string, team: 'bidder'|'opposition'|'unknown',
                  isRevealed: boolean, cardCount: number }
                  cardCount replaces hand — other players' actual cards are never sent

  ClientGameState: Full GameState but with:
    - players: PublicPlayer[]     ← no hands exposed
    - myHand: Card[]              ← only this player's own cards
    - All other GameState fields intact

Export all types. This file is imported by both server event handlers and later by the client.
```

## Step 2.2 — RoomManager
```
Create packages/server/src/RoomManager.ts

RoomManager is a singleton that creates, stores, and destroys game rooms.

Implement class RoomManager:

  Private state:
    rooms: Map<string, GameRoom>

  Methods:
    createRoom(hostId: string, hostName: string): GameRoom
      Generate a short unique roomId (6 uppercase alphanumeric chars using uuid).
      Create a new GameRoom(roomId, hostId, hostName).
      Store in rooms map.
      Return the room.

    getRoom(roomId: string): GameRoom | undefined

    joinRoom(roomId: string, playerId: string, playerName: string): GameRoom
      Throws if room not found.
      Throws if room is not in 'lobby' phase.
      Throws if player count is already 10.
      Calls room.addPlayer(playerId, playerName).
      Returns the room.

    destroyRoom(roomId: string): void
      Removes room from map.

    getRoomByPlayerId(playerId: string): GameRoom | undefined
      Iterates rooms to find one containing this playerId.

Export a single instance: export const roomManager = new RoomManager()
```

## Step 2.3 — GameRoom
```
Create packages/server/src/GameRoom.ts
Import from '@blind-alliance/core' and events.ts.

GameRoom holds the authoritative GameState for one game session.

Implement class GameRoom:

  Properties:
    roomId: string
    hostId: string
    state: GameState
    playerSocketMap: Map<string, string>  // playerId → socketId

  Constructor(roomId, hostPlayerId, hostPlayerName):
    Initialize state via initGame([hostPlayerName]) from core.
    Add hostPlayerId to playerSocketMap.

  Methods:
    addPlayer(playerId: string, playerName: string): void
      Throws if state.phase !== 'lobby'.
      Adds player to state via addPlayerToLobby() from core.
      Stores in playerSocketMap.

    startGame(): void
      Throws if state.phase !== 'lobby'.
      Throws if player count < 3.
      Calls dealCards(state) from core, updates this.state.

    applyBid(playerId: string, amount: number): void
      Validates it is this player's turn to bid.
      Calls placeBid(state, playerId, amount) from core.
      Updates this.state.

    applyPass(playerId: string): void
      Calls passBid(state, playerId) from core.
      Updates this.state.

    applyTrumpSelect(playerId: string, suit: Suit): void
      Validates playerId === state.bidderId.
      Calls selectTrump(state, suit) from core.
      Updates this.state.

    applySetConditions(playerId: string, conditions: TeammateCondition[]): void
      Validates playerId === state.bidderId.
      Validates conditions.length === state.maxTeammateCount.
      Calls setTeammateConditions(state, conditions) from core.
      Updates this.state.

    applyPlayCard(playerId: string, cardId: string): void
      Validates it is this player's turn (currentPlayerIndex).
      Parses cardId into { suit, rank, deckIndex }.
      Finds card in player's hand.
      Validates card is in getValidCards(hand, ledSuit, trumpSuit) from core.
      Calls playCard(state, playerId, card) from core.
      Updates this.state.

    getSanitizedStateFor(playerId: string): ClientGameState
      Returns full state but:
        - players array replaced with PublicPlayer[] (no hands)
        - myHand set to this player's actual hand
      This is what gets broadcast to each individual player.

    getPublicPlayers(): PublicPlayer[]
      Maps state.players to PublicPlayer shape.
```

## Step 2.4 — Socket Event Handlers
```
Create packages/server/src/events/onJoin.ts

Handle the 'join_room' event.

Function: handleJoinRoom(socket: Socket, io: Server, data: { playerName, roomId? })

Logic:
  If data.roomId is provided:
    room = roomManager.joinRoom(data.roomId, socket.id, data.playerName)
    socket.join(room.roomId)
    emit 'room_joined' to this socket: { roomId, playerId: socket.id, players: room.getPublicPlayers() }
    broadcast 'player_joined' to others in room: { players: room.getPublicPlayers() }
  Else:
    room = roomManager.createRoom(socket.id, data.playerName)
    socket.join(room.roomId)
    emit 'room_joined' to this socket: { roomId: room.roomId, playerId: socket.id, players: room.getPublicPlayers() }

  Wrap all in try/catch — on error emit 'action_error' to socket only.
```
```
Create packages/server/src/events/onStartGame.ts

Handle the 'start_game' event.

Function: handleStartGame(socket: Socket, io: Server)

Logic:
  room = roomManager.getRoomByPlayerId(socket.id)
  Validate room exists and socket.id === room.hostId.
  room.startGame()
  For each player in room.state.players:
    Find their socketId via room.playerSocketMap
    Emit 'game_started' directly to that socket:
      { hand: player.hand, phase: room.state.phase }
  Also broadcast initial 'state_update' to each player individually
  using room.getSanitizedStateFor(playerId).

  Wrap in try/catch — on error emit 'action_error' to socket only.
```
```
Create packages/server/src/events/onBid.ts

Handle 'place_bid' and 'pass_bid' events.

Function: handlePlaceBid(socket, io, data: { amount })
  room = roomManager.getRoomByPlayerId(socket.id)
  room.applyBid(socket.id, data.amount)
  broadcastStateUpdate(io, room)

Function: handlePassBid(socket, io)
  room = roomManager.getRoomByPlayerId(socket.id)
  room.applyPass(socket.id)
  broadcastStateUpdate(io, room)

Wrap both in try/catch.

Helper function broadcastStateUpdate(io, room):
  For each player in room.state.players:
    Get their socketId from room.playerSocketMap
    io.to(socketId).emit('state_update', room.getSanitizedStateFor(player.id))
  This must be called after EVERY state-changing action.
  Export it — it will be reused in all other handlers.
```
```
Create packages/server/src/events/onTrumpSelect.ts

Handle 'select_trump' event.

Function: handleSelectTrump(socket, io, data: { suit })
  room = roomManager.getRoomByPlayerId(socket.id)
  room.applyTrumpSelect(socket.id, data.suit)
  broadcastStateUpdate(io, room)
  Wrap in try/catch.
```
```
Create packages/server/src/events/onSetConditions.ts

Handle 'set_conditions' event.

Function: handleSetConditions(socket, io, data: { conditions })
  room = roomManager.getRoomByPlayerId(socket.id)
  room.applySetConditions(socket.id, data.conditions)
  broadcastStateUpdate(io, room)
  Wrap in try/catch.
```
```
Create packages/server/src/events/onPlayCard.ts

Handle 'play_card' event.

Function: handlePlayCard(socket, io, data: { cardId })
  room = roomManager.getRoomByPlayerId(socket.id)
  room.applyPlayCard(socket.id, data.cardId)

  If room.state.phase === 'finished':
    broadcastStateUpdate(io, room)
    For each player emit 'game_over':
      { winner: room.state.winner, summary: buildScoreSummary(room.state) }
    roomManager.destroyRoom(room.roomId)
  Else:
    broadcastStateUpdate(io, room)

  Wrap in try/catch.
```
```
Create packages/server/src/events/onDisconnect.ts

Handle 'disconnect' event.

Function: handleDisconnect(socket, io)
  room = roomManager.getRoomByPlayerId(socket.id)
  If no room found: return (player was in lobby or never joined)

  If room.state.phase === 'lobby':
    Remove player from room.
    If room is now empty: roomManager.destroyRoom(room.roomId)
    Else broadcast updated player list.
  Else (game in progress):
    Broadcast 'action_error' to all in room:
      { message: 'A player disconnected. Game paused.' }
    Mark player as disconnected in room state.
    (Reconnection handling is a future enhancement — for now just notify.)
```

## Step 2.5 — Server Entry Point
```
Create packages/server/src/index.ts

Set up the Express + Socket.IO server.

1. Create Express app and HTTP server.
2. Attach Socket.IO with CORS config:
   origin: process.env.CLIENT_URL || 'http://localhost:5173'
   methods: ['GET', 'POST']
3. On socket 'connection':
   Register all event handlers by calling:
     socket.on('join_room',      (data) => handleJoinRoom(socket, io, data))
     socket.on('start_game',     ()     => handleStartGame(socket, io))
     socket.on('place_bid',      (data) => handlePlaceBid(socket, io, data))
     socket.on('pass_bid',       ()     => handlePassBid(socket, io))
     socket.on('select_trump',   (data) => handleSelectTrump(socket, io, data))
     socket.on('set_conditions', (data) => handleSetConditions(socket, io, data))
     socket.on('play_card',      (data) => handlePlayCard(socket, io, data))
     socket.on('disconnect',     ()     => handleDisconnect(socket, io))
4. Listen on process.env.PORT || 3001
5. Log: 'Blind Alliance server running on port 3001'

Create packages/server/.env.example:
  PORT=3001
  CLIENT_URL=http://localhost:5173
```

## Step 2.6 — Verify Server Works End-to-End
```
Before building the frontend, verify the server handles a full game via Socket.IO directly.

Create packages/server/src/test-client.ts (temporary file, delete after testing):

This script simulates 3 players completing a full game:
  1. Player 1 connects and creates a room → receives roomId
  2. Players 2 and 3 connect and join the room using roomId
  3. Player 1 emits 'start_game'
  4. All three receive 'game_started' with their hands
  5. Bidding round: players bid or pass until one wins
  6. Winner emits 'select_trump'
  7. Winner emits 'set_conditions' (if player count requires teammates)
  8. Players take turns emitting 'play_card' until all cards are gone
  9. All three receive 'game_over' with the winner and score summary

Use socket.io-client to connect: import { io } from 'socket.io-client'
Log every received event to console so you can trace the full flow.

Run with: npx ts-node packages/server/src/test-client.ts
(Start the server first with: npm run dev --workspace=packages/server)

Fix any errors before proceeding to Phase 3.
```

---

# WHAT'S NEXT (Phase 3 Preview)

Phase 3 will cover the full frontend — connecting the existing React + Zustand client
to the live server via Socket.IO. Prompts for Phase 3 will include:

- `useSocket.ts` hook — connects to server, emits actions, receives state updates
- Updating `gameStore.ts` — replace local state with server-driven `ClientGameState`
- `Lobby` component — create room / join room by code
- `BiddingTable` — live bidding with all players' actions visible
- `TrumpSelector` — bidder-only, post-bid
- `TeammateSelector` — filtered card picker using `getAvailableConditionCards()`
- `GameTable` — `PlayerHand`, `TrickArea`, `ScoreBoard`, teammate reveal animations
- `Results` screen — final scores, winner announcement

Generate Phase 3 prompts once Phase 2 server verification passes cleanly.