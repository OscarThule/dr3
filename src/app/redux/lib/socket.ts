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

  emitEvent(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data)
    }
  }

  onEvent(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, callback)
    }
  }

  offEvent(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback)
    }
  }
}

export const socketService = new SocketService()