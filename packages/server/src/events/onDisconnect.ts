import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import { roomManager } from '../RoomManager';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function handleDisconnect(socket: TypedSocket, io: TypedServer): void {
  const room = roomManager.getRoomByPlayerId(socket.id);
  if (!room) return;

  if (room.state.phase === 'lobby') {
    room.removePlayer(socket.id);

    if (room.state.players.length === 0) {
      roomManager.destroyRoom(room.roomId);
    } else {
      // If the host left, transfer host to the next player
      if (socket.id === room.hostId && room.state.players.length > 0) {
        room.hostId = room.state.players[0]!.id;
      }
      io.to(room.roomId).emit('player_joined', {
        players: room.getPublicPlayers(),
      });
    }
  } else {
    // Game in progress — notify all players
    io.to(room.roomId).emit('action_error', {
      message: 'A player disconnected. Game paused.',
    });
  }
}
