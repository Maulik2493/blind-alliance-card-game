import { io } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

// Force https:// in production so Socket.IO uses wss:// for WebSocket.
// Carrier proxies cannot inspect encrypted wss:// traffic.
// Plain ws:// (derived from http://) is visible to proxies and gets dropped,
// causing the infinite reconnect loop on mobile data.
const SECURE_URL = SERVER_URL.replace(/^http:\/\//, 'https://');

export const socket = io(
  import.meta.env.DEV ? SERVER_URL : SECURE_URL,
  {
    autoConnect: false,

    // Start with polling first, upgrade to websocket after handshake.
    // Polling = plain HTTPS requests, never blocked by carrier proxies.
    // WebSocket upgrade happens silently in background after connect.
    transports: ['polling', 'websocket'],

    // Allow silent upgrade to WebSocket after polling handshake
    upgrade: true,

    // Reconnection settings
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 20000,
  },
);

export const connectSocket = () => socket.connect();
export const disconnectSocket = () => socket.disconnect();
