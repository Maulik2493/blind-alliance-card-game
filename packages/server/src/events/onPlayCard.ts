import type { Server, Socket } from 'socket.io';
import { buildScoreSummary } from '@blind-alliance/core';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import { roomManager } from '../RoomManager';
import { broadcastStateUpdate } from './broadcastStateUpdate';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function handlePlayCard(
  socket: TypedSocket,
  io: TypedServer,
  data: { cardId: string },
): void {
  try {
    const room = roomManager.getRoomByPlayerId(socket.id);
    if (!room) throw new Error('You are not in a room');
    const playerId = room.getPlayerIdForSocket(socket.id);

    room.applyPlayCard(playerId, data.cardId);

    if (room.state.phase === 'finished') {
      broadcastStateUpdate(io, room);

      const summary = buildScoreSummary(room.state);
      for (const player of room.state.players) {
        const socketId = room.playerSocketMap.get(player.id);
        if (socketId) {
          io.to(socketId).emit('game_over', {
            winner: room.state.winner!,
            summary,
          });
        }
      }

      roomManager.destroyRoom(room.roomId);
    } else {
      broadcastStateUpdate(io, room);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to play card';
    socket.emit('action_error', { message });
  }
}
