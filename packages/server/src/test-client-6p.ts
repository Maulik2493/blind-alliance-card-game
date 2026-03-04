/**
 * test-client-6p.ts — Simulates a full 6-player game via Socket.IO
 *
 * Tests: 2 decks, 500 total points, min bid 250, 2 teammate conditions
 *
 * Usage:
 *   1. Start server:  node packages/server/dist/index.js
 *   2. Run this:      npx ts-node packages/server/src/test-client-6p.ts
 */

import { io, Socket } from 'socket.io-client';

const SERVER = 'http://localhost:3001';
const PLAYER_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];

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
      name, socket, playerId: '', roomId: '',
      hand: [], lastState: null, gameOver: null,
    };

    socket.on('connect', () => {
      log(name, `Connected: ${socket.id}`);
      socket.emit('join_room', { playerName: name, roomId });
    });

    socket.on('room_joined', (data) => {
      player.playerId = data.playerId;
      player.roomId = data.roomId;
      log(name, `Joined room ${data.roomId}`);
      resolve(player);
    });

    socket.on('player_joined', () => { /* quiet */ });

    socket.on('game_started', (data) => {
      player.hand = data.hand;
      log(name, `Hand: ${data.hand.length} cards → ${data.hand.map((c: any) => `${c.rank}${c.suit[0]}(${c.deckIndex})`).join(', ')}`);
    });

    socket.on('state_update', (data) => {
      player.lastState = data.state;
      if (data.state.myHand) player.hand = data.state.myHand;
    });

    socket.on('action_error', (data) => {
      log(name, `ERROR: ${data.message}`);
    });

    socket.on('game_over', (data) => {
      player.gameOver = data;
    });

    socket.connect();
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('='.repeat(70));
  console.log('  BLIND ALLIANCE — 6-Player Full Game Simulation');
  console.log('  (2 decks, 500 pts, min bid 250, 2 teammates)');
  console.log('='.repeat(70));
  console.log();

  // ── 1. Lobby ───────────────────────────────────────────────────────────────
  log('SETUP', 'Creating room with 6 players...');
  const players: PlayerState[] = [];

  // Host creates room
  const host = await createPlayer(PLAYER_NAMES[0]!);
  players.push(host);
  await sleep(300);

  // Others join
  for (let i = 1; i < PLAYER_NAMES.length; i++) {
    const p = await createPlayer(PLAYER_NAMES[i]!, host.roomId);
    players.push(p);
    await sleep(200);
  }

  log('SETUP', `Room ${host.roomId}: ${players.map((p) => p.name).join(', ')}`);

  // ── 2. Start Game ──────────────────────────────────────────────────────────
  console.log();
  log('GAME', '═══ Starting Game ═══');
  host.socket.emit('start_game');
  await sleep(1000);

  let state = host.lastState;
  if (!state) { log('ERROR', 'No state!'); cleanup(players); return; }

  log('GAME', `Phase: ${state.phase}`);
  log('GAME', `Deck count: ${state.deckCount}, Total points: ${state.totalPoints}`);
  log('GAME', `Min bid: ${state.minBid}, Max teammates: ${state.maxTeammateCount}`);
  log('GAME', `Removed cards: ${state.removedCards.length}`);
  log('GAME', `Cards per player: ${players.map((p) => `${p.name}=${p.hand.length}`).join(', ')}`);

  // Verify 6-player setup
  const totalCards = players.reduce((s, p) => s + p.hand.length, 0) + state.removedCards.length;
  log('GAME', `Total cards dealt+removed: ${totalCards} (expected 104 for 2 decks)`);

  // ── 3. Bidding ─────────────────────────────────────────────────────────────
  console.log();
  log('BID', '═══ Bidding Phase ═══');

  const getActive = () => {
    state = host.lastState;
    const pub = state.players[state.currentPlayerIndex];
    return players.find((p) => p.playerId === pub?.id);
  };

  // First player bids minimum, everyone else passes
  const firstBidder = getActive();
  if (firstBidder) {
    log('BID', `${firstBidder.name} bids ${state.minBid}`);
    firstBidder.socket.emit('place_bid', { amount: state.minBid });
    await sleep(400);
  }

  // Remaining 5 players pass
  for (let i = 0; i < 5; i++) {
    const passer = getActive();
    if (!passer) break;
    state = host.lastState;
    if (state.phase !== 'bidding') break;
    log('BID', `${passer.name} passes`);
    passer.socket.emit('pass_bid');
    await sleep(400);
  }

  state = host.lastState;
  log('BID', `Phase: ${state.phase}, Bidder: ${state.bidderId}, Bid: ${state.highestBid?.amount}`);

  const bidderPlayer = players.find((p) => p.playerId === state.bidderId);
  if (!bidderPlayer) { log('ERROR', 'No bidder found'); cleanup(players); return; }
  log('BID', `Bidder is: ${bidderPlayer.name}`);

  // ── 4. Trump Selection ────────────────────────────────────────────────────
  console.log();
  log('TRUMP', '═══ Trump Selection ═══');

  if (state.phase !== 'trump_select') {
    log('ERROR', `Expected trump_select, got ${state.phase}`);
    cleanup(players);
    return;
  }

  // Pick suit bidder has the most of
  const suitCounts: Record<string, number> = {};
  for (const card of bidderPlayer.hand) {
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
  }
  const trumpSuit = Object.entries(suitCounts).sort((a, b) => b[1] - a[1])[0]![0];
  log('TRUMP', `${bidderPlayer.name} picks trump: ${trumpSuit}`);
  bidderPlayer.socket.emit('select_trump', { suit: trumpSuit });
  await sleep(500);
  state = host.lastState;
  log('TRUMP', `Phase: ${state.phase}, Trump: ${state.trumpSuit}`);

  // ── 5. Teammate Conditions ────────────────────────────────────────────────
  console.log();
  log('TEAM', '═══ Teammate Selection ═══');

  if (state.phase !== 'teammate_select') {
    log('ERROR', `Expected teammate_select, got ${state.phase}`);
    cleanup(players);
    return;
  }

  log('TEAM', `Need ${state.maxTeammateCount} teammate condition(s)`);

  // Find cards NOT in bidder's hand for teammate conditions
  // Collect all unique suit-rank combos from other players' hands
  const bidderCardKeys = new Set(
    bidderPlayer.hand.map((c: any) => `${c.suit}-${c.rank}-${c.deckIndex}`)
  );

  // Use removedCards from state to determine valid condition cards
  const removedKeys = new Set(
    state.removedCards.map((c: any) => `${c.suit}-${c.rank}-${c.deckIndex}`)
  );

  // Pick cards that exist in the game (not removed) and not in bidder's hand
  // We'll use non-trump high cards from other players for interesting reveals
  const allDealtCards: any[] = [];
  for (const p of players) {
    for (const c of p.hand) {
      allDealtCards.push({ ...c, holderId: p.playerId });
    }
  }

  // Find cards held by other players (not bidder)
  const otherCards = allDealtCards
    .filter((c) => c.holderId !== bidderPlayer.playerId)
    .filter((c) => !removedKeys.has(`${c.suit}-${c.rank}-${c.deckIndex}`));

  // Pick unique condition cards (different suit-rank-instance combos)
  const conditions: any[] = [];
  const usedKeys = new Set<string>();
  const instanceTracker = new Map<string, number>();

  for (const card of otherCards) {
    if (conditions.length >= state.maxTeammateCount) break;
    const suitRank = `${card.suit}-${card.rank}`;
    const instance = (instanceTracker.get(suitRank) ?? 0) + 1;
    instanceTracker.set(suitRank, instance);
    const condKey = `${suitRank}-${instance}`;
    if (usedKeys.has(condKey)) continue;
    if (instance > 2) continue;
    usedKeys.add(condKey);

    conditions.push({
      type: 'card_reveal',
      suit: card.suit,
      rank: card.rank,
      instance: instance as 1 | 2,
      satisfied: false,
      collapsed: false,
      satisfiedByPlayerId: null,
    });
  }

  for (const cond of conditions) {
    const holder = otherCards.find(
      (c: any) => c.suit === cond.suit && c.rank === cond.rank
    );
    const holderName = holder ? players.find((p) => p.playerId === holder.holderId)?.name : '?';
    log('TEAM', `Condition: ${cond.rank} of ${cond.suit} (instance ${cond.instance}) — held by ${holderName}`);
  }

  bidderPlayer.socket.emit('set_conditions', { conditions });
  await sleep(500);
  state = host.lastState;
  log('TEAM', `Phase after conditions: ${state.phase}`);

  if (state.phase !== 'playing') {
    log('ERROR', `Expected playing, got ${state.phase}`);
    cleanup(players);
    return;
  }

  // ── 6. Play All Tricks ────────────────────────────────────────────────────
  console.log();
  log('PLAY', '═══ Playing Phase ═══');

  let trickCount = 0;
  const maxTricks = 200; // safety limit for 2 decks

  while (state.phase === 'playing' && trickCount < maxTricks) {
    trickCount++;
    const trickNum = state.tricks.length + 1;

    // Play one full trick (6 players)
    for (let playNum = 0; playNum < 6; playNum++) {
      state = host.lastState;
      if (state.phase !== 'playing') break;

      const currentIdx = state.currentPlayerIndex;
      const pub = state.players[currentIdx];
      if (!pub) break;

      const active = players.find((p) => p.playerId === pub.id);
      if (!active) { log('ERROR', `Player not found: ${pub.id}`); break; }

      const pState = active.lastState;
      const hand = pState?.myHand || active.hand;
      if (!hand || hand.length === 0) break;

      // Pick valid card
      const trick = pState?.currentTrick;
      const ledSuit = trick?.ledSuit ?? null;
      let card;
      if (ledSuit) {
        const suited = hand.filter((c: any) => c.suit === ledSuit);
        card = suited.length > 0 ? suited[0] : hand[0];
      } else {
        card = hand[0];
      }

      const cid = cardId(card);
      if (playNum === 0) {
        log('PLAY', `--- Trick ${trickNum} ---`);
      }
      log('PLAY', `  ${active.name} plays ${card.rank} of ${card.suit}(${card.deckIndex})`);
      active.socket.emit('play_card', { cardId: cid });
      await sleep(200);
      state = host.lastState;
    }

    // Show trick result
    state = host.lastState;
    const last = state.tricks?.[state.tricks.length - 1];
    if (last) {
      const wName = players.find((p) => p.playerId === last.winnerId)?.name || '?';
      log('PLAY', `  → Winner: ${wName} (${last.pointsInTrick} pts)`);
    }

    // Check for reveals
    for (const cond of state.teammateConditions) {
      if (cond.satisfied && cond.satisfiedByPlayerId) {
        const revealedName = players.find((p) => p.playerId === cond.satisfiedByPlayerId)?.name;
        if (revealedName && cond.type === 'card_reveal') {
          log('REVEAL', `${revealedName} revealed as teammate! (played ${cond.rank} of ${cond.suit})`);
        }
      }
      if (cond.collapsed) {
        log('REVEAL', `Condition collapsed: ${cond.type === 'card_reveal' ? `${cond.rank} of ${cond.suit}` : 'first trick win'}`);
      }
    }
  }

  // ── 7. Results ─────────────────────────────────────────────────────────────
  console.log();
  log('RESULT', '═══ Game Results ═══');
  await sleep(500);

  state = host.lastState;
  log('RESULT', `Phase: ${state.phase}`);
  log('RESULT', `Winner: ${state.winner}`);
  log('RESULT', `Bidder team: ${state.bidderTeamScore} pts`);
  log('RESULT', `Opposition: ${state.oppositionTeamScore} pts`);
  log('RESULT', `Total: ${state.bidderTeamScore + state.oppositionTeamScore} pts (expected 500)`);
  log('RESULT', `Tricks played: ${state.tricks.length}`);

  console.log();
  log('TEAMS', '═══ Final Teams ═══');
  for (const pp of state.players) {
    const name = players.find((p) => p.playerId === pp.id)?.name || pp.id;
    log('TEAMS', `  ${name}: ${pp.team} (revealed=${pp.isRevealed})`);
  }

  console.log();
  log('OVER', '═══ Game Over Events ═══');
  for (const p of players) {
    if (p.gameOver) {
      log('OVER', `${p.name} ✓ winner=${p.gameOver.winner}`);
      for (const pb of p.gameOver.summary.playerBreakdown) {
        log('OVER', `  ${pb.name} (${pb.team}): ${pb.points} pts`);
      }
    } else {
      log('OVER', `${p.name} ✗ no game_over event`);
    }
  }

  console.log();
  console.log('='.repeat(70));
  console.log('  6-PLAYER TEST COMPLETE');
  console.log('='.repeat(70));

  cleanup(players);
}

function cleanup(ps: PlayerState[]) {
  for (const p of ps) p.socket.disconnect();
  setTimeout(() => process.exit(0), 500);
}

main().catch((err) => { console.error('Test failed:', err); process.exit(1); });
