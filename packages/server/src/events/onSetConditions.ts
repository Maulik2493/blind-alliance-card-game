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

    room.applySetConditions(socket.id, data.conditions);
    broadcastStateUpdate(io, room);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to set conditions';
    socket.emit('action_error', { message });
  }
}
