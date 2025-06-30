// src/utils/socket.js
import { io } from 'socket.io-client'

// 🌐 Setup Socket.IO client with manual control
const socket = io('http://localhost:4700', {
  // const socket = io('http://157.245.59.122:4700', {   // ✅ Use for production if needed
  autoConnect: false,             // Manual connect only
  transports: ['websocket'],      // Optional: force WebSocket only
  reconnection: true,             // Optional: auto-reconnect
  reconnectionAttempts: 3         // Optional: number of reconnection tries
})

// ✅ Helper: connect and join room for current company
const joinSocketRoom = () => {
  const user = JSON.parse(localStorage.getItem('user'))
  const company = user?.role === 'GeneralManager'
    ? localStorage.getItem('company')
    : user?.company

  if (company) {
    // Attach token for server authentication
    socket.auth = { token: localStorage.getItem('token') }
    socket.connect()
    socket.emit('join-room', company)
    console.log('✅ Joined room:', company)
  } else {
    console.warn('⚠️ No company found, not joining socket room.')
  }
}

export { joinSocketRoom }
export default socket
