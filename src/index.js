import dns from "dns";
// Force IPv4 first to avoid MongoDB Atlas DNS issues
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

/**
 * =========================
 * CORS CONFIG (FIXED)
 * =========================
 */

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return false;

  // exact match
  if (allowedOrigins.includes(origin)) return true;

  // allow all Vercel preview domains (optional but recommended)
  if (/\.vercel\.app$/.test(origin)) return true;

  return false;
};

app.beforeEach((req, res) => {
  const origin = req.headers.origin;

  if (isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  // REQUIRED for cookies / auth headers
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Preflight caching safety
  res.setHeader("Vary", "Origin");

  // Methods allowed
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );

  // Headers allowed from frontend
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept",
  );

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
});

app.beforeEach(parseJSON());

/**
 * =========================
 * SSE SETUP
 * =========================
 */

app.route("get", "/events", (req, res) => {
  const client = setupSSE(req, res);
  if (req.query.room) {
    joinRoom(client, req.query.room);
  }
});

initRedis();
startHeartbeat();

/**
 * =========================
 * ROUTES
 * =========================
 */

const mountRoutes = (prefix, routeHandler) => {
  routeHandler(app, prefix);
};

mountRoutes("/api", authRoute);
mountRoutes("/api", questionRoute);
mountRoutes("/api", answerRoute);
mountRoutes("/api", examRoute);
mountRoutes("/api", resultRoute);

/**
 * =========================
 * ERROR HANDLING
 * =========================
 */

app.fallback((req, res) => {
  return res.status(404).json({ error: "Route not found" });
});

app.handleErr((error, req, res) => {
  console.error("Error:", error);
  return res.status(500).json({ error: "Internal server error" });
});

/**
 * =========================
 * START SERVER
 * =========================
 */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
