import { io } from 'socket.io-client';

// Derive backend URL at runtime. Prefer browser origin (or runtime override) to avoid baking localhost at build time.
const rawApi = (typeof window !== 'undefined')
  ? (window.__THE_TURF_API_URL || `${window.location.origin}/api`)
  : (process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api');
const SOCKET_URL = rawApi.replace(/\/api\/?$/, '');

const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'], // prefer websocket for production
  secure: SOCKET_URL.startsWith('https'),
});

export function connectSocket() {
  const token = localStorage.getItem('token');
  if (token) socket.auth = { token };
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}

export default socket;
