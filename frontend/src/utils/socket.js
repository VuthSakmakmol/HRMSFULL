// src/utils/socket.js
import { io } from 'socket.io-client'

// 🌐 Setup Socket.IO client with manual control
const socket = io('http://localhost:4700', {
  // 🔥 Replace with production URL when deploying:
  // const socket = io('http://157.245.59.122:4700', {
  autoConnect: false,             // Manual connect (we call connect later)
  transports: ['websocket'],      // Force WebSocket transport
  reconnection: true,             // Auto-reconnect
  reconnectionAttempts: 5,        // More tries for better reliability
  reconnectionDelay: 1000,        // Wait 1 second before retry
  timeout: 5000                   // 5s timeout for connecting
})

// ✅ Helper: connect and join room for current company
const joinSocketRoom = () => {
  const user = JSON.parse(localStorage.getItem('user'))
  const company = user?.role === 'GeneralManager'
    ? localStorage.getItem('company')
    : user?.company

  if (company) {
    // Attach token for server-side authentication
    socket.auth = { token: localStorage.getItem('token') }

    // Connect only if not already connected
    if (!socket.connected) {
      socket.connect()
    }

    // Emit join-room event with the company name
    socket.emit('join-room', company)
    console.log('✅ Joined room:', company)
  } else {
    console.warn('⚠️ No company found in localStorage; socket room not joined.')
  }
}

export { joinSocketRoom }
export default socket
