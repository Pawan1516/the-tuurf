import { io } from 'socket.io-client';

// Derive backend URL from env or runtime origin. Remove trailing '/api' if present.
const rawApi = process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:5001/api');
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
