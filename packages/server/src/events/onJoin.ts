import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../events';
import { roomManager } from '../RoomManager';
import { broadcastStateUpdate } from './broadcastStateUpdate';
import type { GameRoom } from '../GameRoom';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

function findDisconnectedPlayer(room: GameRoom, playerName: string) {
  return [...room.disconnectedPlayers.values()].find(
    (d) => room.state.players.find(
      (p) => p.id === d.playerId && p.name === playerName,
    ),
  ) ?? null;
}

export function handleJoinRoom(
  socket: TypedSocket,
  io: TypedServer,
  data: { playerName: string; roomId?: string; gameId?: string },
): void {
  try {
    if (data.roomId) {
      const room = roomManager.getRoom(data.roomId);

      // Reconnection: room exists AND game in progress
      if (room && room.state.phase !== 'lobby') {
        const disconnectedEntry = findDisconnectedPlayer(room, data.playerName);

        if (disconnectedEntry) {
          // Cancel the reconnect timer
          if (disconnectedEntry.reconnectTimer) {
            clearTimeout(disconnectedEntry.reconnectTimer);
          }
          room.disconnectedPlayers.delete(disconnectedEntry.playerId);

          // Remap old playerId → new socketId
          const oldPlayerId = disconnectedEntry.playerId;
          room.playerSocketMap.delete(oldPlayerId);
          room.playerSocketMap.set(oldPlayerId, socket.id);

          // Mark player as connected again
          room.markPlayerConnected(oldPlayerId);

          socket.join(room.roomId);

          // Send full current state to reconnected player
          socket.emit('reconnected', {
            playerId: oldPlayerId,
            state: room.getSanitizedStateFor(oldPlayerId),
          });

          // Notify others
          io.to(room.roomId).emit('player_reconnected', {
            playerId: oldPlayerId,
            playerName: data.playerName,
          });

          broadcastStateUpdate(io, room);
          return;
        }

        // Not a reconnecting player — reject
        socket.emit('action_error', { message: 'Game has already started' });
        return;
      }

      // Normal join to lobby
      const joinedRoom = roomManager.joinRoom(data.roomId, socket.id, data.playerName);
      socket.join(joinedRoom.roomId);
      socket.emit('room_joined', {
        roomId: joinedRoom.roomId,
        playerId: socket.id,
        players: joinedRoom.getPublicPlayers(),
        gameId: joinedRoom.adapter.gameId,
        gameName: joinedRoom.adapter.gameName,
      });
      socket.to(joinedRoom.roomId).emit('player_joined', {
        players: joinedRoom.getPublicPlayers(),
      });
    } else {
      const room = roomManager.createRoom(socket.id, data.playerName, data.gameId);
      socket.join(room.roomId);
      socket.emit('room_joined', {
        roomId: room.roomId,
        playerId: socket.id,
        players: room.getPublicPlayers(),
        gameId: room.adapter.gameId,
        gameName: room.adapter.gameName,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to join room';
    socket.emit('action_error', { message });
  }
}
