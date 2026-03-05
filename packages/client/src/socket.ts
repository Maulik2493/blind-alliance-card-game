import { io } from 'socket.io-client';

export const socket = io(
  import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
  {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 20000,
    transports: ['websocket', 'polling'],
  },
);

export const connectSocket = () => socket.connect();
export const disconnectSocket = () => socket.disconnect();
