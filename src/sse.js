/**
 * SSE (Server-Sent Events) manager
 * Optimized for exam-based real-time notifications with room isolation.
 *
 * Scalability Notes:
 * - A single Node.js process can handle ~2,000-3,000 concurrent SSE connections
 * - For larger scale: add Redis Pub/Sub as a message broker with cluster mode
 * - For enterprise scale (100k+): consider dedicated real-time infrastructure
 */

const clients = new Set();
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

/**
 * Initialize SSE endpoint for a client connection.
 * Call this from the route handler for GET /events
 */
export function setupSSE(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send an initial comment to flush headers
  res.write(": connected\n\n");

  const client = {
    id: Date.now(),
    res,
    rooms: new Set(),
    lastActivity: Date.now(),
  };
  clients.add(client);

  // Clean up on client disconnect
  req.on("close", () => {
    clients.delete(client);
  });

  // Return the client object so the caller can immediately join a room
  return client;
}

/**
 * Send a heartbeat to a single client to detect stale connections
 */
function sendHeartbeat(client) {
  try {
    client.res.write(": heartbeat\n\n");
    client.lastActivity = Date.now();
  } catch {
    clients.delete(client);
  }
}

/**
 * Start periodic heartbeat for all connected clients.
 * Call once during server startup.
 */
export function startHeartbeat() {
  setInterval(() => {
    for (const client of clients) {
      sendHeartbeat(client);
    }
  }, HEARTBEAT_INTERVAL);
}

/**
 * Emit an event to ALL connected SSE clients.
 * Uses setImmediate to avoid blocking the event loop on large client sets.
 */
export function emit(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    setImmediate(() => {
      try {
        client.res.write(message);
        client.lastActivity = Date.now();
      } catch {
        clients.delete(client);
      }
    });
  }
}

/**
 * Emit an event only to clients in a specific room (e.g., an exam room).
 * Uses setImmediate to avoid blocking the event loop.
 *
 * @param {string} room - The room identifier (e.g., exam ID)
 * @param {string} event - The event name
 * @param {*} data - The event payload
 */
export function emitToRoom(room, event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (client.rooms && client.rooms.has(room)) {
      setImmediate(() => {
        try {
          client.res.write(message);
          client.lastActivity = Date.now();
        } catch {
          clients.delete(client);
        }
      });
    }
  }
}

/**
 * Join a client to a room. Call this after setupSSE returns.
 * @param {object} client - The client object returned by setupSSE
 * @param {string} room - The room to join (e.g., exam ID)
 */
export function joinRoom(client, room) {
  if (client && client.rooms) {
    client.rooms.add(room);
  }
}

/**
 * Leave a room.
 * @param {object} client - The client object returned by setupSSE
 * @param {string} room - The room to leave
 */
export function leaveRoom(client, room) {
  if (client && client.rooms) {
    client.rooms.delete(room);
  }
}

/**
 * Get the number of connected clients (for monitoring)
 */
export function getClientCount() {
  return clients.size;
}