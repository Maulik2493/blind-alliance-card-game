import { io } from 'socket.io-client';

export const socket = io(
  import.meta.env.VITE_SERVER_URL || 'http://localhost:3001',
  { autoConnect: false },
);

export const connectSocket = () => socket.connect();
export const disconnectSocket = () => socket.disconnect();
