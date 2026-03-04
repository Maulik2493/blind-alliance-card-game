import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ClientToServerEvents, ServerToClientEvents } from './events';
import { handleJoinRoom } from './events/onJoin';
import { handleStartGame } from './events/onStartGame';
import { handlePlaceBid, handlePassBid } from './events/onBid';
import { handleSelectTrump } from './events/onTrumpSelect';
import { handleSetConditions } from './events/onSetConditions';
import { handlePlayCard } from './events/onPlayCard';
import { handleDisconnect } from './events/onDisconnect';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();
app.use(cors({ origin: CLIENT_URL }));

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('join_room', (data) => handleJoinRoom(socket, io, data));
  socket.on('start_game', () => handleStartGame(socket, io));
  socket.on('place_bid', (data) => handlePlaceBid(socket, io, data));
  socket.on('pass_bid', () => handlePassBid(socket, io));
  socket.on('select_trump', (data) => handleSelectTrump(socket, io, data));
  socket.on('set_conditions', (data) => handleSetConditions(socket, io, data));
  socket.on('play_card', (data) => handlePlayCard(socket, io, data));
  socket.on('disconnect', () => handleDisconnect(socket, io));
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Blind Alliance server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully.');
  httpServer.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully.');
  httpServer.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
