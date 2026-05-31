/**
 * SSE (Server-Sent Events) manager with optional Redis Pub/Sub for cluster scaling.
 *
 * Architecture:
 * ┌──────────────────────────────────────────────────┐
 * │                   Load Balancer                   │
 * └─────────┬────────────┬─────────────┬─────────────┘
 *      ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
 *      │ PM2/1  │  │ PM2/2  │  │ PM2/3  │   (one per vCPU)
 *      └───┬────┘  └───┬────┘  └───┬────┘
 *          │           │           │
 *      ┌───┴───────────┴───────────┴───┐
 *      │          Redis Pub/Sub          │
 *      └──────────────────────────────────┘
 *
 * - Each PM2 process manages its own set of SSE clients (in-memory)
 * - When any process emits an event, it publishes to Redis
 * - All processes subscribe to Redis and forward events to their local clients
 * - No process sees another process's clients directly
 * - If Redis is unavailable, falls back to in-process broadcast (single-process mode)
 *
 * Single-Process Capacity: ~2,000-3,000 concurrent SSE clients per Node.js process
 * Cluster (4 vCPU): ~8,000-12,000 concurrent SSE clients
 * Cluster (8 vCPU + Redis): ~16,000-24,000 concurrent SSE clients
 */

import Redis from "ioredis";

const clients = new Set();
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

// Redis Pub/Sub configuration
const REDIS_URL = process.env.REDIS_URL || null;
const REDIS_CHANNEL = "sse:events";
let pub = null;
let sub = null;
let redisEnabled = false;

/**
 * Initialize Redis Pub/Sub connections.
 * Called once during server startup. If REDIS_URL is not set,
 * runs in single-process mode (no Redis).
 */
export function initRedis() {
  if (!REDIS_URL) {
    console.log(
      "[SSE] REDIS_URL not set — running in single-process mode. For multi-instance scaling, set REDIS_URL."
    );
    return;
  }

  try {
    pub = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) {
          console.error("[SSE] Redis connection failed after 5 retries — falling back to single-process mode");
          redisEnabled = false;
          return null; // stop retrying
        }
        return Math.min(times * 200, 2000);
      },
    });

    sub = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) {
          redisEnabled = false;
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    // Subscribe to the SSE event channel
    sub.subscribe(REDIS_CHANNEL, (err, count) => {
      if (err) {
        console.error("[SSE] Redis subscribe failed:", err.message);
        redisEnabled = false;
        return;
      }
      console.log(`[SSE] Redis subscribed to channel "${REDIS_CHANNEL}" (${count} subs)`);
      redisEnabled = true;
    });

    // When a message arrives from another process, forward it to our local clients
    sub.on("message", (channel, message) => {
      if (channel !== REDIS_CHANNEL) return;
      try {
        const { event, data, room } = JSON.parse(message);
        if (room) {
          // Room-scoped: only forward to clients in that room
          for (const client of clients) {
            if (client.rooms && client.rooms.has(room)) {
              setImmediate(() => {
                try {
                  client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
                  client.lastActivity = Date.now();
                } catch {
                  clients.delete(client);
                }
              });
            }
          }
        } else {
          // Broadcast to all local clients
          for (const client of clients) {
            setImmediate(() => {
              try {
                client.res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
                client.lastActivity = Date.now();
              } catch {
                clients.delete(client);
              }
            });
          }
        }
      } catch (e) {
        console.error("[SSE] Error processing Redis message:", e.message);
      }
    });

    sub.on("error", (err) => {
      console.error("[SSE] Redis subscriber error:", err.message);
    });

    pub.on("error", (err) => {
      console.error("[SSE] Redis publisher error:", err.message);
    });

    console.log("[SSE] Redis initialized successfully");
  } catch (error) {
    console.error("[SSE] Failed to init Redis:", error.message);
    redisEnabled = false;
  }
}

/**
 * Initialize SSE endpoint for a client connection.
 * Returns the client object so the caller can immediately join a room.
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
 * Internal: write event to all local clients.
 */
function writeToLocalClients(room, event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    if (room && client.rooms && !client.rooms.has(room)) {
      continue; // skip clients not in this room
    }
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
 * Internal: publish event to Redis so other processes can forward it.
 */
function publishToRedis(room, event, data) {
  if (!redisEnabled || !pub) return;
  try {
    pub.publish(
      REDIS_CHANNEL,
      JSON.stringify({ event, data, room })
    );
  } catch (err) {
    console.error("[SSE] Redis publish error:", err.message);
  }
}

/**
 * Emit an event to ALL connected SSE clients across all processes (if Redis is enabled).
 * Uses setImmediate to prevent a slow client from blocking the event loop.
 */
export function emit(event, data) {
  // 1. Write to local clients immediately
  writeToLocalClients(null, event, data);
  // 2. Publish to Redis for other processes
  publishToRedis(null, event, data);
}

/**
 * Emit an event only to clients in a specific room (exam room).
 * Works across all PM2 processes when Redis is enabled.
 *
 * @param {string} room - Room identifier (e.g., exam ID)
 * @param {string} event - Event name
 * @param {*} data - Event payload
 */
export function emitToRoom(room, event, data) {
  // 1. Write to local clients in this room
  writeToLocalClients(room, event, data);
  // 2. Publish to Redis so other processes can forward to their clients in this room
  publishToRedis(room, event, data);
}

/**
 * Join a client to a room.
 * @param {object} client - The client object returned by setupSSE
 * @param {string} room - Room to join
 */
export function joinRoom(client, room) {
  if (client && client.rooms) {
    client.rooms.add(room);
  }
}

/**
 * Leave a room.
 * @param {object} client - The client object returned by setupSSE
 * @param {string} room - Room to leave
 */
export function leaveRoom(client, room) {
  if (client && client.rooms) {
    client.rooms.delete(room);
  }
}

/**
 * Get the number of connected clients on THIS process (for monitoring)
 */
export function getClientCount() {
  return clients.size;
}