import Answer from "../Models/answer.model.js";
import Exam from "../Models/exam.model.js";
import jwt from "jsonwebtoken";
import User from "../Models/user.model.js";
import { calculateAndSaveResult } from "../Calc.js";
import mongoose from "mongoose";
import { syncExamStatus } from "./examController.js";

const jwtverify = (token) => {
  const tokenPart = token.split(" ")[1];
  return jwt.verify(tokenPart, process.env.JWT_SECRET);
};

const answerController = {
  submitAnswers: async (req, res) => {
    try {
      const token = req.headers.authorization;
      if (!token) {
        return res.status(401).json({ error: "No token provided" });
      }

      const decodedToken = jwtverify(token);

      const user = await User.findById(decodedToken.userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { answers, exam } = req.body;

      if (!mongoose.Types.ObjectId.isValid(exam)) {
        return res.status(400).json({ error: "Invalid exam ID" });
      }

      const existing = await Answer.findOne({ user: user._id, exam });
      if (existing) {
        return res.status(200).json({ error: "Already Submitted" });
      }

      const allowedExam = await Exam.findById(exam);
      if (!allowedExam) {
        return res.status(404).json({ error: "Exam not found" });
      }

      await syncExamStatus(allowedExam);

      if (allowedExam.status !== "ongoing") {
        return res.status(400).json({ error: "Exam is not active" });
      }

      const allowedStudent =
        allowedExam.visibility === "public" ||
        (allowedExam.invitedStudents || []).some(
          (studentId) => String(studentId) === String(user._id),
        ) ||
        (allowedExam.joinedStudents || []).some(
          (studentId) => String(studentId) === String(user._id),
        );

      if (!allowedStudent && user.role === "student") {
        return res.status(403).json({
          error: "You are not allowed to submit answers for this exam",
        });
      }

      if (!answers || typeof answers !== "object") {
        return res.status(400).json({ error: "Answers payload is required" });
      }

      const answersArray = Object.keys(answers).map((questionId) => ({
        questionId: new mongoose.Types.ObjectId(questionId),
        answer: answers[questionId],
      }));

      const newAnswer = new Answer({
        user: new mongoose.Types.ObjectId(user._id),
        answers: answersArray,
        exam: new mongoose.Types.ObjectId(exam),
      });

      await newAnswer.save();

      await calculateAndSaveResult(user._id, exam);

      res.status(201).json({ message: "Answers submitted successfully" });
    } catch (error) {
      console.error("Error submitting answers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getAnswers: async (req, res) => {
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

      const answers = await Answer.find().populate("user exam");
      res.json(answers);
    } catch (error) {
      console.error("Error retrieving answers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  updateAnswer: async (req, res) => {
    try {
      const answerId = req.params.id;
      const { userId, answers } = req.body;
      await Answer.findByIdAndUpdate(answerId, {
        user: userId,
        answers: answers,
      });
      res.json({ message: "Answer updated successfully" });
    } catch (error) {
      console.error("Error updating answer:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  deleteAnswer: async (req, res) => {
    try {
      const answerId = req.params.id;
      await Answer.findByIdAndDelete(answerId);
      res.json({ message: "Answer deleted successfully" });
    } catch (error) {
      console.error("Error deleting answer:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default answerController;
