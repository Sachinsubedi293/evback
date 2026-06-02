import dns from "dns";
// Force IPv4 first to avoid MongoDB Atlas DNS issues
dns.setDefaultResultOrder("ipv4first");

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

/**
 * =========================
 * MongoDB Connection (Serverless-Optimized)
 * =========================
 *
 * Caches the connection across Vercel serverless function invocations.
 * With timeout options to prevent indefinite hanging.
 */
const MONGO_URI = process.env.URI;

if (!MONGO_URI) {
  console.error("FATAL: URI environment variable is not set in .env");
  process.exit(1);
}

// Connection timeout (prevents hanging for > 10 seconds on cold start / DNS issues)
const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 5000,  // fail fast if MongoDB is unreachable
  connectTimeoutMS: 5000,          // fail fast on slow connections
  socketTimeoutMS: 45000,          // keep socket alive for queries (45s)
};

/**
 * Cached connection for Vercel serverless — reuse across invocations.
 * In long-running (PM2) mode, the global.cache is not used.
 */
let cached = globalThis._mongooseCache;
if (!cached) {
  cached = globalThis._mongooseCache = { conn: null, promise: null };
}

async function connectMongo() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    console.log("[MongoDB] Establishing new connection...");
    cached.promise = mongoose
      .connect(MONGO_URI, MONGO_OPTIONS)
      .then((m) => {
        console.log("[MongoDB] Connected successfully");
        return m;
      })
      .catch((err) => {
        console.error("[MongoDB] Connection error:", err.message);
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

mongoose.connection.on("error", (err) => {
  console.error("MongoDB runtime error:", err.message);
});

import express from "express";
import cors from "cors";

import { setupSSE, startHeartbeat, joinRoom, initRedis } from "./sse.js";

import authRoute from "./Router/authRoute.js";
import questionRouter from "./Router/questionRoute.js";
import answerRouter from "./Router/answerRoute.js";
import {
  examRouter,
  allExamRouter,
  myExamsRouter,
  joinExamRouter,
  deleteExamRouter,
  serverTimeRouter,
} from "./Router/examRoute.js";
import resultRouter from "./Router/resultRoute.js";
import { getExamResults, getMyResult } from "./Controller/resultController.js";

const app = express();
const PORT = process.env.PORT || 5000;

/**
 * =========================
 * CORS CONFIG
 * =========================
 */

const allowedOrigins = (
  process.env.CORS_ORIGIN || "https://evmcq.vercel.app"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
  methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept",
};

app.use(cors(corsOptions));

/**
 * =========================
 * REQUEST LOGGING
 * =========================
 */

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

/**
 * =========================
 * REQUEST TIMEOUT SAFETY NET
 * =========================
 * Ensures no request hangs longer than 25 seconds.
 * Responds with 503 so the client gets a proper error instead of "network failed".
 */
app.use((req, res, next) => {
  if (req.url === "/events") return next();

  const timeoutMs = 25000;
  const timer = setTimeout(() => {
    console.error(
      `[TIMEOUT] Request ${req.method} ${req.url} timed out after ${timeoutMs}ms`
    );
    if (!res.headersSent) {
      res.status(503).json({ error: "Request timed out", timeout: timeoutMs });
    }
  }, timeoutMs);

  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));
  next();
});

/**
 * =========================
 * DB CONNECTION MIDDLEWARE
 * =========================
 */
app.use(async (req, res, next) => {
  if (req.url === "/events") return next();

  try {
    await connectMongo();
    next();
  } catch (err) {
    console.error("[DB] Connection failed for request:", err.message);
    if (!res.headersSent) {
      res
        .status(503)
        .json({ error: "Database unavailable. Please try again." });
    }
  }
});

/**
 * =========================
 * JSON BODY PARSER
 * =========================
 */
app.use(express.json({ limit: "10mb" }));

/**
 * =========================
 * SSE SETUP
 * =========================
 */

app.get("/events", (req, res) => {
  const client = setupSSE(req, res);
  if (req.query.room) {
    joinRoom(client, req.query.room);
  }
});

/**
 * =========================
 * ROUTES
 * =========================
 */

// Auth routes (mounted directly to preserve original paths)
authRoute(app);

// Question routes
app.use("/api/questions", questionRouter);

// Answer routes
app.use("/api/answers", answerRouter);

// Exam routes
app.use("/api/exam", examRouter);
app.use("/api/allexam", allExamRouter);
app.use("/api/myexams", myExamsRouter);
app.use("/api/join-exam", joinExamRouter);
app.use("/api/delexam", deleteExamRouter);
app.use("/api/server-time", serverTimeRouter);

// Result routes
app.use("/api/results", resultRouter);

// Exam-result routes (these need to be directly on /api/exam/:examId/...)
app.get("/api/exam/:examId/results", getExamResults);
app.get("/api/exam/:examId/my-result", getMyResult);

/**
 * =========================
 * ERROR HANDLING
 * =========================
 */

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error, req, res, next) => {
  console.error("Error:", error);
  res.status(500).json({ error: "Internal server error" });
});

/**
 * =========================
 * START SERVER
 * =========================
 */

let heartbeatStarted = false;
let redisInitialized = false;

function startBackgroundServices() {
  if (!redisInitialized) {
    initRedis();
    redisInitialized = true;
  }
  if (!heartbeatStarted) {
    startHeartbeat();
    heartbeatStarted = true;
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startBackgroundServices();
});

connectMongo().catch((err) => {
  console.error("Initial MongoDB connection failed:", err.message);
});

export default app;