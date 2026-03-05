import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import { roomManager } from '../RoomManager';
import { broadcastStateUpdate } from './broadcastStateUpdate';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function handlePlaceBid(
  socket: TypedSocket,
  io: TypedServer,
  data: { amount: number },
): void {
  try {
    const room = roomManager.getRoomByPlayerId(socket.id);
    if (!room) throw new Error('You are not in a room');
    const playerId = room.getPlayerIdForSocket(socket.id);

    room.applyBid(playerId, data.amount);
    broadcastStateUpdate(io, room);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to place bid';
    socket.emit('action_error', { message });
  }
}

export function handlePassBid(socket: TypedSocket, io: TypedServer): void {
  try {
    const room = roomManager.getRoomByPlayerId(socket.id);
    if (!room) throw new Error('You are not in a room');
    const playerId = room.getPlayerIdForSocket(socket.id);

    room.applyPass(playerId);
    broadcastStateUpdate(io, room);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to pass bid';
    socket.emit('action_error', { message });
  }
}
