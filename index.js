const mongoose = require("mongoose");
require("dotenv").config();
const {populateQuestions} =require('./src/populate')
const authRoute = require("./src/Router/authRoute");
const questionRoute = require("./src/Router/questionRoute");
const answerRoute = require("./src/Router/answerRoute");
const examRoute = require("./src/Router/examRoute");
const resultRoute = require("./src/Router/resultRoute");
const express = require("express");
const http = require("http");
const cors = require('cors');
const { init: initSocketIo } = require("./src/socket"); // Adjust the path as per your project structure
const { calculateAndSaveResult } = require('./src/Calc');
const app = express();
const server = http.createServer(app);
const io = initSocketIo(server); // Initialize Socket.IO with the HTTP server instance

const PORT = process.env.PORT || 8000;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1); // Exit process with failure
  }
};
connectDB();

app.use(express.json());

app.use(cors());

// Mount routes under the '/api' namespace
app.use("/api", questionRoute, authRoute, answerRoute, examRoute,resultRoute);

// Handle invalid routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New client connected");
  // Join the room for a specific exam
  socket.on("joinExam", (examId) => {
    socket.join(examId);
    console.log(`Client joined exam room: ${examId}`);
  });

  socket.on("ExamStarted", (data) => {
    // Handle the event data here
    console.log("New exam created:", data);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});



module.exports = { socket: io }; // Corrected module export
