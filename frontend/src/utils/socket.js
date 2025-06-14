// src/utils/socket.js
import { io } from 'socket.io-client'

// ✅ Avoid multiple connections by using singleton
const socket = io('http://localhost:4700', {
  autoConnect: true,
  transports: ['websocket'], // Optional: forces WebSocket only
  reconnection: true,        // Optional: auto reconnect
  reconnectionAttempts: 3
})

export default socket
