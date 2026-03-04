import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import { roomManager } from '../RoomManager';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function handleJoinRoom(
  socket: TypedSocket,
  io: TypedServer,
  data: { playerName: string; roomId?: string },
): void {
  try {
    if (data.roomId) {
      const room = roomManager.joinRoom(data.roomId, socket.id, data.playerName);
      socket.join(room.roomId);
      socket.emit('room_joined', {
        roomId: room.roomId,
        playerId: socket.id,
        players: room.getPublicPlayers(),
      });
      socket.to(room.roomId).emit('player_joined', {
        players: room.getPublicPlayers(),
      });
    } else {
      const room = roomManager.createRoom(socket.id, data.playerName);
      socket.join(room.roomId);
      socket.emit('room_joined', {
        roomId: room.roomId,
        playerId: socket.id,
        players: room.getPublicPlayers(),
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to join room';
    socket.emit('action_error', { message });
  }
}
