# evback - MCQ Exam Backend

A real-time MCQ exam backend built with **Cpeak** (Express-compatible minimal framework) and **Server-Sent Events (SSE)** for real-time exam notifications.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **HTTP Framework** | [Cpeak](https://socket.dev/npm/package/cpeak) (zero-dependency, Fastify-like performance) |
| **Real-time** | Server-Sent Events (SSE) — replaces Socket.IO/WebSocket |
| **Database** | MongoDB + Mongoose ODM |
| **Auth** | JSON Web Tokens (JWT) |
| **Scheduling** | node-schedule for exam start/stop automation |

## Key Architecture Decisions

### Why SSE over WebSocket?

SSE is a simpler, HTTP-native protocol that is **perfect for exam scenarios** where:

- Notifications flow **one-way**: server → clients (exam started, exam completed)
- No client→server messaging is needed (answers use REST API)
- Works over standard HTTP/1.1 and HTTP/2, no upgrade handshake
- Auto-reconnects natively in browsers via `EventSource`

### Real-Time Performance & Scalability

#### Single-Process Capacity

| Metric | Estimated Limit |
|--------|----------------|
| Concurrent SSE clients | **2,000 - 3,000** per Node.js process |
| Active exam rooms | Limited only by memory (~10M possible) |
| Events per second (broadcast) | ~50k writes/sec per process |

#### Optimization Features in Place

1. **Room Isolation** — Events are scoped to exam rooms via `emitToRoom(examId, event, data)`. Clients join a room by connecting to `/events?room=exam123`. This prevents students in Exam A from receiving events for Exam B.

2. **Non-blocking Emit** — All `emit()` and `emitToRoom()` calls use `setImmediate()` per client write. This prevents a slow client from blocking the event loop for other clients.

3. **Heartbeat** — Automatic 30-second keepalive pings detect and clean up stale/disconnected clients, preventing memory leaks.

4. **Auto-cleanup** — Client connections are automatically removed from the client set when the `close` event fires.

#### Scaling Beyond a Single Process

| Scale | Strategy |
|-------|----------|
| **3,000 - 10,000** users | Add Node.js `cluster` module + Redis Pub/Sub as a cross-process message broker |
| **10,000 - 50,000** users | Dedicated SSE server with Redis-backed rooms (e.g., `ioredis` subscription per exam) |
| **100,000+** users | Managed real-time service (Pusher, Ably, Supabase Realtime) or WebSocket on horizontally scaled infrastructure |

#### Scaling Blueprint for Cluster Mode

```javascript
// Concept — not implemented yet
import { createClient } from "redis";
import { Cluster } from "cluster";

const pub = createClient();
const sub = createClient();

sub.subscribe("exam:events", (message) => {
  const { room, event, data } = JSON.parse(message);
  emitToRoom(room, event, data);
});

// When emitting across processes:
pub.publish("exam:events", JSON.stringify({ room, event, data }));
```

## API Endpoints

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/signup` | Create new user |
| POST | `/api/login` | Login, returns JWT tokens |
| POST | `/api/refresh` | Refresh access token |
| GET | `/api/students` | Get all students (admin) |
| POST | `/api/students` | Create batch students (admin) |
| DELETE | `/api/delstudents` | Delete all students (admin) |

### Questions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/questions` | Create a question |
| GET | `/api/questions` | Get 20 shuffled questions (active exam only) |
| GET | `/api/questions/:id` | Get question by ID |
| PUT | `/api/questions/:id` | Update question |
| DELETE | `/api/questions/:id` | Delete question |

### Exams

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/exam` | Create a new exam (scheduled) |
| GET | `/api/exam` | Get ongoing exams |
| GET | `/api/allexam` | Get all exams |
| DELETE | `/api/delexam` | Delete an exam |
| GET | `/api/server-time` | Get server current time |

### Answers & Results

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/answers` | Submit answers |
| GET | `/api/answers` | Get all answers |
| GET | `/api/results` | Get latest exam results (admin) |

### Real-Time Events (SSE)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/events` | SSE connection endpoint |
| GET | `/events?room=examId` | SSE + auto-join exam room |

#### Event Types

| Event Name | Direction | Description |
|-----------|-----------|-------------|
| `ExamStarted` | Server→Client | Exam has begun, questions available |
| `ExamComplete` | Server→Client | Exam time is up, answers locked |

**Client-side connection example:**
```javascript
const eventSource = new EventSource("https://your-server.com/events?room=exam123");

eventSource.addEventListener("ExamStarted", (e) => {
  console.log("Exam started!", JSON.parse(e.data));
});

eventSource.addEventListener("ExamComplete", (e) => {
  console.log("Exam completed!", JSON.parse(e.data));
});
```

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Start the server
npm run server    # with nodemon (dev)
npm start         # production
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `URI` | MongoDB connection string |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `PORT` | Server port (default: 8000) |
| `TZ` | Timezone (e.g., `Asia/Kathmandu`) |

## Client Integration

### SSE Event Stream

```javascript
// Connect to SSE with optional room joining
const es = new EventSource("http://localhost:8000/events?room=exam123");

es.onopen = () => console.log("SSE connected");

es.addEventListener("ExamStarted", (e) => {
  // Fetch questions: GET /api/questions
  // Start exam timer
});

es.addEventListener("ExamComplete", (e) => {
  // Disable answer submission
  // Show results
});

es.onerror = (err) => console.error("SSE error", err);
```

### Submit Answers

```javascript
const response = await fetch("/api/answers", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    userId: "...",
    exam: "examId",
    answers: {
      "questionId1": "Paris",
      "questionId2": "Mars",
    },
  }),
});
```

## Project Structure

```
evback/
├── src/
│   ├── index.js            # Entry point, Cpeak setup, SSE, routes
│   ├── sse.js              # SSE manager with room isolation
│   ├── Calc.js             # Answer correction & result calculation
│   ├── Data.js             # Seed questions data
│   ├── populate.js         # Database populator
│   ├── Controller/         # Route handler logic
│   ├── Models/             # Mongoose schemas
│   └── Router/             # Route definitions
├── .env                    # Environment variables
└── package.json
```

## Migration from Express

This project was migrated from Express + Socket.IO to Cpeak + SSE:

- **Express** → **Cpeak**: Same API patterns (`req`, `res`, `next`), but zero dependencies and ~3x faster routing
- **body-parser** → **Cpeak's `parseJSON()`**: Built-in
- **cors** → **Cpeak's `cors()`**: Built-in
- **Socket.IO** → **SSE**: One-way server→client push with native HTTP
- **CommonJS** → **ESM**: Cpeak requires ESM (`"type": "module"`)

### Vulnerability Fix

Updated `bcrypt` from `^5.1.1` → `^6.0.0` to eliminate 2 high-severity `tar` vulnerabilities (GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97).