import { v4 as uuidv4 } from 'uuid';
import { MAX_PLAYERS } from '@blind-alliance/core';
import { GameRoom } from './GameRoom';
import { getAdapter } from './gameRegistry';

export class RoomManager {
  private rooms: Map<string, GameRoom> = new Map();

  createRoom(
    hostId: string,
    hostName: string,
    gameId: string = 'blind-alliance',
  ): GameRoom {
    const { adapter } = getAdapter(gameId); // throws if unknown gameId
    const roomId = uuidv4().substring(0, 6).toUpperCase();
    const room = new GameRoom(roomId, hostId, hostName, adapter);
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
    if (room.state.players.length >= MAX_PLAYERS) {
      throw new Error(`Room is full (max ${MAX_PLAYERS} players)`);
    }
    room.addPlayer(playerId, playerName);
    return room;
  }

  destroyRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  hasActiveGames(): boolean {
    return [...this.rooms.values()].some(
      (room) => room.state.phase !== 'lobby' && room.state.phase !== 'finished',
    );
  }

  getRoomByPlayerId(playerId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      // Check direct playerId match first
      if (room.playerSocketMap.has(playerId)) {
        return room;
      }
      // Check if this is a socket ID mapped from a different player ID (reconnection)
      for (const [, socketId] of room.playerSocketMap.entries()) {
        if (socketId === playerId) {
          return room;
        }
      }
    }
    return undefined;
  }
}

export const roomManager = new RoomManager();
