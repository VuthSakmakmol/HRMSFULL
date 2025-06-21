// src/socket.js
import { io } from 'socket.io-client'

const socket = io('http://localhost:4700', {
  // const socket = io('http://157.245.59.122:4700', {
  autoConnect: false
})

const joinSocketRoom = () => {
  const user = JSON.parse(localStorage.getItem('user'))
  const company = user?.role === 'GeneralManager'
    ? localStorage.getItem('company')
    : user?.company

  if (company) {
    socket.auth = { token: localStorage.getItem('token') }
    socket.connect()
    socket.emit('join-room', company)
    console.log('✅ Joined room:', company)
  }
}

export { joinSocketRoom }
export default socket
