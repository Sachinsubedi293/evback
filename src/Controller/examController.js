import jwt from "jsonwebtoken";
import schedule from "node-schedule";
import User from "../Models/user.model.js";
import Exam from "../Models/exam.model.js";
import { emit, emitToRoom } from "../sse.js";
import { v4 as uuidv4 } from "uuid";

const jwtverify = (token) => {
  const tokenPart = token.split(" ")[1];
  return jwt.verify(tokenPart, process.env.JWT_SECRET);
};

// Function to start the exam
const startExam = async (examId) => {
  try {
    const exam = await Exam.findById(examId);
    if (!exam) {
      console.error(`Exam with ID ${examId} not found`);
      return;
    }

    if (exam.startDate <= new Date() && exam.status === "scheduled") {
      exam.status = "ongoing";
      await exam.save();
      console.log(`Exam ${examId} has started`);

      // Notify only clients in this exam room that the exam has started
      emitToRoom(String(examId), "ExamStarted", true);

      // Schedule the exam stop
      scheduleExamStop(examId, exam.endDate);
    }
  } catch (error) {
    console.error(`Error starting exam ${examId}:`, error);
  }
};

const scheduleExamStop = (examId, endDate) => {
  schedule.scheduleJob(endDate, () => closeExam(examId));
};

const closeExam = async (examId) => {
  try {
    const exam = await Exam.findById(examId);
    if (!exam) {
      console.error(`Exam with ID ${examId} not found`);
      return;
    }

    if (exam.endDate <= new Date() && exam.status === "ongoing") {
      exam.status = "completed";
      await exam.save();
      console.log(`Exam ${examId} has completed`);

      // Notify only clients in this exam room that the exam has completed
      emitToRoom(String(examId), "ExamComplete", true);
    }
  } catch (error) {
    console.error(`Error completing exam ${examId}:`, error);
  }
};

// Schedule the exam start
const scheduleExamStart = (examId, startDate) => {
  schedule.scheduleJob(startDate, () => startExam(examId));
};

const generateUniqueCode = () => {
  const uuid = uuidv4().replace(/-/g, "");
  const intVal = BigInt("0x" + uuid);
  const normalizedVal = Number(intVal % BigInt(1e18)) / 1e18;
  const uniqueCode = 0.001 + normalizedVal * (0.999 - 0.001);
  return uniqueCode.toFixed(3);
};

// Function to create a new exam
export const createExam = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decodedToken = jwtverify(token);

    const user = await User.findById(decodedToken.userId);
    if (!user || user.role !== "admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, startDate, endDate } = req.body;

    const Code = generateUniqueCode();
    const students = User.find({ role: "student" });
    const durationInMilliseconds = new Date(endDate) - new Date(startDate);
    const duration = durationInMilliseconds / (1000 * 60);

    const overlappingExam = await Exam.findOne({
      $or: [
        { startDate: { $lt: endDate, $gt: startDate } },
        { endDate: { $gt: startDate, $lt: endDate } },
        { startDate: { $lt: startDate }, endDate: { $gt: endDate } },
      ],
    });

    if (overlappingExam) {
      return res.status(400).json({
        error: "An exam is already scheduled during this time period",
      });
    }

    const exam = new Exam({
      name,
      totalStudents: (await students).length,
      duration,
      startDate,
      endDate,
      Code,
      status: "scheduled",
    });

    await exam.save();

    scheduleExamStart(exam._id, startDate, endDate);

    res.status(201).json({ message: "Exam created successfully" });
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({ error: "Failed to create exam" });
  }
};

export const getOngoingExams = async (req, res) => {
  try {
    const exams = await Exam.find({ status: { $in: ["ongoing"] } });
    res.status(200).json(exams);
  } catch (error) {
    console.error("Error retrieving exams:", error);
    res.status(500).json({ error: "Failed to retrieve exams" });
  }
};

export const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find();
    res.status(200).json(exams);
  } catch (error) {
    console.error("Error retrieving exams:", error);
    res.status(500).json({ error: "Failed to retrieve exams" });
  }
};

export const deleteExam = async (req, res) => {
  try {
    const { examid } = req.body;
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const tokenPart = token.split(" ")[1];
    const decodedToken = jwt.verify(tokenPart, process.env.JWT_SECRET);

    const user = await User.findById(decodedToken.userId);
    if (!user || user.role !== "admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    await Exam.deleteOne({ _id: examid });
    res.status(200).json({ message: "Exam deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete exam" });
  }
};