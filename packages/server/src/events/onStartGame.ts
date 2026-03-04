import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import { roomManager } from '../RoomManager';
import { broadcastStateUpdate } from './broadcastStateUpdate';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function handleStartGame(socket: TypedSocket, io: TypedServer): void {
  try {
    const room = roomManager.getRoomByPlayerId(socket.id);
    if (!room) {
      throw new Error('You are not in a room');
    }
    if (socket.id !== room.hostId) {
      throw new Error('Only the host can start the game');
    }

    room.startGame();

    // Send each player their individual hand
    for (const player of room.state.players) {
      const socketId = room.playerSocketMap.get(player.id);
      if (socketId) {
        io.to(socketId).emit('game_started', {
          hand: player.hand,
          phase: room.state.phase,
        });
      }
    }

    // Broadcast initial sanitized state to each player
    broadcastStateUpdate(io, room);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to start game';
    socket.emit('action_error', { message });
  }
}
