import { v4 as uuidv4 } from 'uuid';
import { GameRoom } from './GameRoom';

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  createRoom(hostId: string, hostName: string): GameRoom {
    const roomId = uuidv4().substring(0, 6).toUpperCase();
    const room = new GameRoom(roomId, hostId, hostName);
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId: string, playerId: string, playerName: string): GameRoom {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error(`Room ${roomId} not found`);
    }
    if (room.state.phase !== 'lobby') {
      throw new Error('Game has already started');
    }
    if (room.state.players.length >= 10) {
      throw new Error('Room is full (max 10 players)');
    }
    room.addPlayer(playerId, playerName);
    return room;
  }

  destroyRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  getRoomByPlayerId(playerId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.playerSocketMap.has(playerId)) {
        return room;
      }
    }
    return undefined;
  }
}

export const roomManager = new RoomManager();
