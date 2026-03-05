import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import { roomManager } from '../RoomManager';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function handleDisconnect(socket: TypedSocket, io: TypedServer): void {
  const room = roomManager.getRoomByPlayerId(socket.id);
  if (!room) return;

  const playerId = room.getPlayerIdForSocket(socket.id);

  if (room.state.phase === 'lobby') {
    room.removePlayer(playerId);

    if (room.state.players.length === 0) {
      roomManager.destroyRoom(room.roomId);
    } else {
      // If the host left, transfer host to the next player
      if (playerId === room.hostId && room.state.players.length > 0) {
        room.hostId = room.state.players[0]!.id;
      }
      io.to(room.roomId).emit('player_joined', {
        players: room.getPublicPlayers(),
      });
    }
    return;
  }

  // Game in progress — mark as disconnected, start reconnect window
  const player = room.state.players.find((p) => p.id === playerId);
  if (!player) return;

  room.markPlayerDisconnected(playerId);

  // Notify others
  io.to(room.roomId).emit('player_disconnected', {
    playerId,
    playerName: player.name,
    reconnectWindowSeconds: room.RECONNECT_WINDOW_MS / 1000,
  });

  // Start reconnect timer — clean up after window expires
  const timer = setTimeout(() => {
    room.disconnectedPlayers.delete(playerId);
    io.to(room.roomId).emit('player_timed_out', {
      playerId,
      playerName: player.name,
    });
    // If all players disconnected, destroy room
    if (room.allPlayersDisconnected()) {
      roomManager.destroyRoom(room.roomId);
    }
  }, room.RECONNECT_WINDOW_MS);

  room.disconnectedPlayers.set(playerId, {
    playerId,
    playerName: player.name,
    disconnectedAt: Date.now(),
    reconnectTimer: timer,
  });
}
