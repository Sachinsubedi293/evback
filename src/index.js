import dns from "dns";
// Force IPv4 first to avoid DNS resolution timeouts with MongoDB Atlas
dns.setDefaultResultOrder("ipv4first");

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import cpeak, { parseJSON } from "cpeak";

import { setupSSE, startHeartbeat, joinRoom, initRedis } from "./sse.js";

import authRoute from "./Router/authRoute.js";
import questionRoute from "./Router/questionRoute.js";
import answerRoute from "./Router/answerRoute.js";
import examRoute from "./Router/examRoute.js";
import resultRoute from "./Router/resultRoute.js";

const app = cpeak();

const PORT = process.env.PORT || 5000;

// Parse allowed CORS origins from env (comma-separated)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

// Custom CORS middleware that echoes back the exact request origin
// (required for credentialed requests — browsers reject '*' with credentials: true)
app.beforeEach((req, res) => {
  const origin = req.headers.origin;

  if (origin) {
    // If the request origin is in the allowed list, echo it back exactly
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");
  }

  // Handle OPTIONS preflight immediately
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
});
app.beforeEach(parseJSON());

// SSE endpoint - clients connect here for real-time events
// Query param ?room=examId optionally joins them to an exam room immediately
app.route("get", "/events", (req, res) => {
  const client = setupSSE(req, res);
  if (req.query.room) {
    joinRoom(client, req.query.room);
  }
});

// Initialize Redis Pub/Sub for multi-process scaling (if REDIS_URL is set)
initRedis();

// Start heartbeat to detect stale connections
startHeartbeat();

// Mount routes under the '/api' namespace
const mountRoutes = (prefix, routeHandler) => {
  routeHandler(app, prefix);
};

mountRoutes("/api", authRoute);
mountRoutes("/api", questionRoute);
mountRoutes("/api", answerRoute);
mountRoutes("/api", examRoute);
mountRoutes("/api", resultRoute);

// Handle invalid routes
app.fallback((req, res) => {
  return res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.handleErr((error, req, res) => {
  console.error("Error:", error);
  return res.status(500).json({ error: "Internal server error" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
