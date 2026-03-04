/**
 * test-client.ts — Simulates a full 3-player game via Socket.IO
 *
 * Usage:
 *   1. Start the server:  npm run dev --workspace=packages/server
 *   2. In another terminal: npx ts-node packages/server/src/test-client.ts
 *
 * Delete this file after testing.
 */

import { io, Socket } from 'socket.io-client';

const SERVER = 'http://localhost:3001';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cardId(card: any): string {
  return `${card.suit}-${card.rank}-${card.deckIndex}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function log(label: string, ...args: any[]) {
  console.log(`[${label}]`, ...args);
}

// ─── Player Socket Wrapper ──────────────────────────────────────────────────

interface PlayerState {
  name: string;
  socket: Socket;
  playerId: string;
  roomId: string;
  hand: any[];
  lastState: any;
  gameOver: any;
}

function createPlayer(name: string, roomId?: string): Promise<PlayerState> {
  return new Promise((resolve) => {
    const socket = io(SERVER, { autoConnect: false });
    const player: PlayerState = {
      name,
      socket,
      playerId: '',
      roomId: '',
      hand: [],
      lastState: null,
      gameOver: null,
    };

    socket.on('connect', () => {
      log(name, `Connected with socket id: ${socket.id}`);
      // Emit join_room once connected
      socket.emit('join_room', { playerName: name, roomId });
    });

    socket.on('room_joined', (data) => {
      player.playerId = data.playerId;
      player.roomId = data.roomId;
      log(name, `Joined room ${data.roomId} as ${data.playerId}`);
      log(name, `Players in room: ${data.players.map((p: any) => p.name).join(', ')}`);
      resolve(player);
    });

    socket.on('player_joined', (data) => {
      log(name, `Player list updated: ${data.players.map((p: any) => p.name).join(', ')}`);
    });

    socket.on('game_started', (data) => {
      player.hand = data.hand;
      log(name, `Game started! Phase: ${data.phase}, Hand: ${data.hand.length} cards`);
      log(name, `Cards: ${data.hand.map((c: any) => `${c.rank}${c.suit[0]}`).join(', ')}`);
    });

    socket.on('state_update', (data) => {
      player.lastState = data.state;
      // Update hand from server state
      if (data.state.myHand) {
        player.hand = data.state.myHand;
      }
    });

    socket.on('action_error', (data) => {
      log(name, `ERROR: ${data.message}`);
    });

    socket.on('game_over', (data) => {
      player.gameOver = data;
      log(name, `GAME OVER! Winner: ${data.winner}`);
      log(name, `  Bidder team: ${data.summary.bidderTeam} pts`);
      log(name, `  Opposition:  ${data.summary.opposition} pts`);
      log(name, `  Bid was:     ${data.summary.bid}`);
      for (const pb of data.summary.playerBreakdown) {
        log(name, `  ${pb.name} (${pb.team}): ${pb.points} pts`);
      }
    });

    socket.connect();
  });
}

// ─── Main Test Flow ─────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(60));
  console.log('  BLIND ALLIANCE — Full Game Simulation (3 players)');
  console.log('='.repeat(60));
  console.log();

  // 1. Player 1 creates a room
  log('SETUP', 'Player 1 creating room...');
  const p1 = await createPlayer('Alice');
  await sleep(500);

  // 2. Players 2 and 3 join
  log('SETUP', 'Player 2 joining...');
  const p2 = await createPlayer('Bob', p1.roomId);
  await sleep(500);

  log('SETUP', 'Player 3 joining...');
  const p3 = await createPlayer('Charlie', p1.roomId);
  await sleep(500);

  const players = [p1, p2, p3];

  // 3. Host starts the game
  console.log();
  log('GAME', '═══ Starting Game ═══');
  p1.socket.emit('start_game');
  await sleep(1000);

  // Print game state
  const state = p1.lastState;
  if (!state) {
    log('ERROR', 'No state received after game start!');
    cleanup(players);
    return;
  }
  log('GAME', `Phase: ${state.phase}`);
  log('GAME', `Deck count: ${state.deckCount}, Total points: ${state.totalPoints}`);
  log('GAME', `Min bid: ${state.minBid}, Max teammates: ${state.maxTeammateCount}`);
  log('GAME', `Removed cards: ${state.removedCards.length}`);
  for (const p of players) {
    log('GAME', `${p.name} has ${p.hand.length} cards`);
  }

  // 4. Bidding round
  console.log();
  log('BID', '═══ Bidding Phase ═══');

  // Player 1 bids minimum
  const minBid = state.minBid;
  log('BID', `${getPlayerName(players, state, state.currentPlayerIndex)} to bid first`);

  // Get current player for each bid action
  let currentState = p1.lastState;
  const currentPlayer = () => players.find(
    (p) => p.playerId === currentState.players[currentState.currentPlayerIndex]?.id
  );

  // Player at index 0 bids
  const bidder1 = currentPlayer();
  if (bidder1) {
    log('BID', `${bidder1.name} bids ${minBid}`);
    bidder1.socket.emit('place_bid', { amount: minBid });
    await sleep(500);
    currentState = p1.lastState;
  }

  // Player at index 1 passes
  const bidder2 = currentPlayer();
  if (bidder2) {
    log('BID', `${bidder2.name} passes`);
    bidder2.socket.emit('pass_bid');
    await sleep(500);
    currentState = p1.lastState;
  }

  // Player at index 2 passes → bidding complete
  const bidder3 = currentPlayer();
  if (bidder3) {
    log('BID', `${bidder3.name} passes`);
    bidder3.socket.emit('pass_bid');
    await sleep(500);
    currentState = p1.lastState;
  }

  log('BID', `Phase after bidding: ${currentState.phase}`);
  log('BID', `Bidder: ${currentState.bidderId}`);
  log('BID', `Highest bid: ${currentState.highestBid?.amount}`);

  const bidderPlayer = players.find((p) => p.playerId === currentState.bidderId);
  if (!bidderPlayer) {
    log('ERROR', 'Could not find bidder among players');
    cleanup(players);
    return;
  }
  log('BID', `Bidder is: ${bidderPlayer.name}`);

  // 5. Trump selection
  console.log();
  log('TRUMP', '═══ Trump Selection ═══');

  if (currentState.phase !== 'trump_select') {
    log('ERROR', `Expected trump_select phase, got ${currentState.phase}`);
    cleanup(players);
    return;
  }

  // Pick the suit the bidder has the most of
  const suitCounts: Record<string, number> = {};
  for (const card of bidderPlayer.hand) {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  }
  const trumpSuit = Object.entries(suitCounts).sort((a, b) => b[1] - a[1])[0]![0];
  log('TRUMP', `${bidderPlayer.name} selects trump: ${trumpSuit}`);
  bidderPlayer.socket.emit('select_trump', { suit: trumpSuit as any });
  await sleep(500);
  currentState = p1.lastState;

  log('TRUMP', `Phase after trump: ${currentState.phase}`);
  log('TRUMP', `Trump suit: ${currentState.trumpSuit}`);

  // 6. Teammate conditions (3 players → maxTeammateCount = 0, skip)
  if (currentState.phase === 'teammate_select') {
    console.log();
    log('TEAM', '═══ Teammate Selection ═══');
    log('TEAM', `Max teammates: ${currentState.maxTeammateCount}`);
    // For 3 players, maxTeammateCount = 0, so this shouldn't trigger
    // But if it does (shouldn't), set empty conditions
    bidderPlayer.socket.emit('set_conditions', { conditions: [] });
    await sleep(500);
    currentState = p1.lastState;
  }

  // 7. Play all tricks
  console.log();
  log('PLAY', '═══ Playing Phase ═══');

  if (currentState.phase !== 'playing') {
    log('ERROR', `Expected playing phase, got ${currentState.phase}`);
    cleanup(players);
    return;
  }

  let trickCount = 0;
  const maxTricks = 50; // safety limit

  while (currentState.phase === 'playing' && trickCount < maxTricks) {
    trickCount++;
    const trickNum = currentState.tricks.length + 1;
    log('PLAY', `--- Trick ${trickNum} ---`);

    // Each player in the trick plays one card
    for (let playNum = 0; playNum < 3; playNum++) {
      // Refresh state
      currentState = p1.lastState;

      if (currentState.phase !== 'playing') break;

      const currentIdx = currentState.currentPlayerIndex;
      const currentPublicPlayer = currentState.players[currentIdx];
      if (!currentPublicPlayer) break;

      const activePlayer = players.find((p) => p.playerId === currentPublicPlayer.id);
      if (!activePlayer) {
        log('ERROR', `Cannot find active player for id ${currentPublicPlayer.id}`);
        break;
      }

      // Refresh this player's state to get their cards
      const playerState = activePlayer.lastState;
      const hand = playerState?.myHand || activePlayer.hand;

      if (!hand || hand.length === 0) {
        log('PLAY', `${activePlayer.name} has no cards left`);
        break;
      }

      // Pick a valid card: if a suit was led, must follow if possible
      const currentTrick = playerState?.currentTrick;
      const ledSuit = currentTrick?.ledSuit ?? null;

      let cardToPlay;
      if (ledSuit) {
        // Must follow suit if possible
        const suitCards = hand.filter((c: any) => c.suit === ledSuit);
        cardToPlay = suitCards.length > 0 ? suitCards[0] : hand[0];
      } else {
        cardToPlay = hand[0];
      }
      const cid = cardId(cardToPlay);
      log('PLAY', `${activePlayer.name} plays ${cardToPlay.rank} of ${cardToPlay.suit} (${cid})`);

      activePlayer.socket.emit('play_card', { cardId: cid });
      await sleep(300);

      currentState = p1.lastState;
    }

    // After trick completes, show result
    currentState = p1.lastState;
    const lastTrick = currentState.tricks?.[currentState.tricks.length - 1];
    if (lastTrick) {
      const winnerName = players.find((p) => p.playerId === lastTrick.winnerId)?.name || lastTrick.winnerId;
      log('PLAY', `Trick ${lastTrick.id} won by ${winnerName} (${lastTrick.pointsInTrick} pts)`);
    }
  }

  // 8. Game Over
  console.log();
  log('RESULT', '═══ Game Results ═══');
  await sleep(500);

  currentState = p1.lastState;
  log('RESULT', `Final phase: ${currentState.phase}`);
  log('RESULT', `Winner: ${currentState.winner}`);
  log('RESULT', `Bidder team score: ${currentState.bidderTeamScore}`);
  log('RESULT', `Opposition score: ${currentState.oppositionTeamScore}`);

  // Check if game_over event was received
  for (const p of players) {
    if (p.gameOver) {
      log('RESULT', `${p.name} received game_over event ✓`);
    } else {
      log('RESULT', `${p.name} did NOT receive game_over event ✗`);
    }
  }

  // Print team assignments
  console.log();
  log('TEAMS', '═══ Final Team Assignments ═══');
  for (const pp of currentState.players) {
    const pName = players.find((p) => p.playerId === pp.id)?.name || pp.id;
    log('TEAMS', `${pName}: team=${pp.team}, revealed=${pp.isRevealed}`);
  }

  console.log();
  console.log('='.repeat(60));
  console.log('  TEST COMPLETE');
  console.log('='.repeat(60));

  cleanup(players);
}

// ─── Utility Functions ──────────────────────────────────────────────────────

function setupListeners(player: PlayerState) {
  player.socket.on('connect', () => {
    log(player.name, `Connected with socket id: ${player.socket.id}`);
  });

  player.socket.on('room_joined', (data: any) => {
    player.playerId = data.playerId;
    player.roomId = data.roomId;
    log(player.name, `Joined room ${data.roomId} as ${data.playerId}`);
  });

  player.socket.on('player_joined', (data: any) => {
    log(player.name, `Player list updated: ${data.players.map((p: any) => p.name).join(', ')}`);
  });

  player.socket.on('game_started', (data: any) => {
    player.hand = data.hand;
    log(player.name, `Game started! Hand: ${data.hand.length} cards`);
    log(player.name, `Cards: ${data.hand.map((c: any) => `${c.rank}${c.suit[0]}`).join(', ')}`);
  });

  player.socket.on('state_update', (data: any) => {
    player.lastState = data.state;
    if (data.state.myHand) {
      player.hand = data.state.myHand;
    }
  });

  player.socket.on('action_error', (data: any) => {
    log(player.name, `ERROR: ${data.message}`);
  });

  player.socket.on('game_over', (data: any) => {
    player.gameOver = data;
    log(player.name, `GAME OVER! Winner: ${data.winner}`);
  });
}

function getPlayerName(players: PlayerState[], state: any, index: number): string {
  const pid = state.players[index]?.id;
  return players.find((p) => p.playerId === pid)?.name || `Player ${index}`;
}

function cleanup(players: PlayerState[]) {
  for (const p of players) {
    p.socket.disconnect();
  }
  setTimeout(() => process.exit(0), 500);
}

// ─── Run ─────────────────────────────────────────────────────────────────────
main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
