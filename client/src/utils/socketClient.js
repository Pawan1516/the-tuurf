import { io } from 'socket.io-client';
import { SOCKET_URL } from '../api/client';

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
