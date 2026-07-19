import { io } from 'socket.io-client';

// Derived from the same VITE_API_URL used for REST calls, minus the
// trailing /api — Socket.IO connects to the bare server origin, not to a
// specific API path.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

let socket = null;

// Lazily creates (or reuses) a single authenticated socket connection for
// the whole app. Pass the current adminToken so the server's auth
// middleware (see backend/sockets/index.js) can identify and room-join
// this session.
export const getSocket = () => {
  const token = localStorage.getItem('adminToken');
  if (!token) return null;

  if (socket && socket.connected) return socket;

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  } else if (!socket.connected) {
    // Token may have changed (re-login) — refresh auth payload before reconnecting.
    socket.auth = { token };
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
