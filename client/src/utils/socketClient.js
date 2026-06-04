import { io } from 'socket.io-client';

// Try explicit backend URL first (match backend/.env default), then fallback to same-origin
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5001';
const socket = io(BACKEND_URL, { autoConnect: false });

export function connectSocket() {
  if (!socket.connected) socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket.connected) socket.disconnect();
}

export default socket;
