import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import cpeak, { parseJSON, cors } from "cpeak";

import { setupSSE, startHeartbeat, joinRoom } from "./sse.js";

import authRoute from "./Router/authRoute.js";
import questionRoute from "./Router/questionRoute.js";
import answerRoute from "./Router/answerRoute.js";
import examRoute from "./Router/examRoute.js";
import resultRoute from "./Router/resultRoute.js";

const app = cpeak();

const PORT = process.env.PORT || 8000;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};
connectDB();

// Global middleware
app.beforeEach(cors());
app.beforeEach(parseJSON());

// SSE endpoint - clients connect here for real-time events
// Query param ?room=examId optionally joins them to an exam room immediately
app.route("get", "/events", (req, res) => {
  const client = setupSSE(req, res);
  if (req.query.room) {
    joinRoom(client, req.query.room);
  }
});

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