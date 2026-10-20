import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

// Base URL is the same API origin used for REST calls; Socket.IO negotiates
// its own transport (websocket, falling back to polling) over it.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

// Lazily creates (or returns) a single shared connection, authenticated with
// the same staff JWT the REST client uses. Call disconnectRealtime() on
// logout so a stale token isn't reused for the next session.
export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null
  // Demo mode has no backend at all — see lib/demo/mock-client.ts. Without
  // this, DataProvider's effect (context/data-context.tsx) calls this the
  // instant you log in, and with NEXT_PUBLIC_API_URL empty, socket.io-client
  // defaults to the page's own origin — attempting a WebSocket/polling
  // handshake against this Next.js server's own /socket.io/, which doesn't
  // exist here (that's the real Api's job), and retrying forever with
  // reconnection: true. A real, live network dependency the mock layer
  // can't intercept (it isn't a fetch through lib/api-client.ts at all).
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return null
  const token = localStorage.getItem('hypocrates_token')
  if (!token) return null

  if (socket && socket.connected) return socket

  if (!socket) {
    socket = io(API_BASE, {
      auth: { token },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    })
  } else {
    socket.auth = { token }
  }

  socket.connect()
  return socket
}

export function disconnectRealtime() {
  socket?.disconnect()
  socket = null
}
