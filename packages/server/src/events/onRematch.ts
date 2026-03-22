import type { Socket, Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import { roomManager } from '../RoomManager';
import { broadcastStateUpdate } from './broadcastStateUpdate';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function handleRematch(socket: TypedSocket, io: TypedServer): void {
  const room = roomManager.getRoomByPlayerId(socket.id);
  if (!room) {
    socket.emit('action_error', { message: 'Room not found' });
    return;
  }

  try {
    const playerId = room.getPlayerIdForSocket(socket.id);
    room.applyRematch(playerId);
    broadcastStateUpdate(io, room);
  } catch (err: unknown) {
    socket.emit('action_error', { message: (err as Error).message });
  }
}
