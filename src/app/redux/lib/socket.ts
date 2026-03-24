import { io, Socket } from 'socket.io-client'

class SocketService {
  private socket: Socket | null = null
  private baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'https://dmrs.onrender.com'

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(this.baseURL)
    }
    return this.socket
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  getSocket(): Socket | null {
    return this.socket
  }

  joinRoom(room: string): void {
    if (this.socket) {
      this.socket.emit('joinRoom', room)
    }
  }

  // Emit an event with typed data
  emitEvent<T>(event: string, data: T): void {
    if (this.socket) {
      this.socket.emit(event, data)
    }
  }

  // Listen for an event with typed data
  onEvent<T>(event: string, callback: (data: T) => void): void {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  // Remove a listener (if callback provided, removes that specific one; otherwise removes all for the event)
  offEvent<T>(event: string, callback?: (data: T) => void): void {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }
}

export const socketService = new SocketService()