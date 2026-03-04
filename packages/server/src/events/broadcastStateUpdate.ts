import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import type { GameRoom } from '../GameRoom';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function broadcastStateUpdate(io: TypedServer, room: GameRoom): void {
  for (const player of room.state.players) {
    const socketId = room.playerSocketMap.get(player.id);
    if (socketId) {
      io.to(socketId).emit('state_update', {
        state: room.getSanitizedStateFor(player.id),
      });
    }
  }
}
