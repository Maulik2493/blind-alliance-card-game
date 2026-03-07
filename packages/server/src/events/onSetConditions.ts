import type { Server, Socket } from 'socket.io';
import type { TeammateCondition } from '@blind-alliance/core';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import { roomManager } from '../RoomManager';
import { broadcastStateUpdate } from './broadcastStateUpdate';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function handleSetConditions(
  socket: TypedSocket,
  io: TypedServer,
  data: { conditions: TeammateCondition[] },
): void {
  try {
    const room = roomManager.getRoomByPlayerId(socket.id);
    if (!room) throw new Error('You are not in a room');
    const playerId = room.getPlayerIdForSocket(socket.id);

    room.applySetConditions(playerId, data.conditions);
    broadcastStateUpdate(io, room);

    // Emit game start info to all players
    const state = room.state;
    const bidder = state.players.find((p) => p.id === state.bidderId);
    io.to(room.roomId).emit('game_start_info', {
      trumpSuit: state.trumpSuit!,
      bidderName: bidder?.name ?? '',
      bidAmount: state.highestBid?.amount ?? 0,
      teammateCount: state.maxTeammateCount,
      conditions: state.teammateConditions.map((c) => ({
        type: c.type,
        suit: c.type === 'card_reveal' ? c.suit : null,
        rank: c.type === 'card_reveal' ? String(c.rank) : null,
        instance: c.type === 'card_reveal' ? c.instance : null,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to set conditions';
    socket.emit('action_error', { message });
  }
}
