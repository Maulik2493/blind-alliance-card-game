import type { Server, Socket } from 'socket.io';
import type { Suit } from '@blind-alliance/core';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import { roomManager } from '../RoomManager';
import { broadcastStateUpdate } from './broadcastStateUpdate';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function handleSelectTrump(
  socket: TypedSocket,
  io: TypedServer,
  data: { suit: Suit },
): void {
  try {
    const room = roomManager.getRoomByPlayerId(socket.id);
    if (!room) throw new Error('You are not in a room');

    room.applyTrumpSelect(socket.id, data.suit);
    broadcastStateUpdate(io, room);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to select trump';
    socket.emit('action_error', { message });
  }
}
