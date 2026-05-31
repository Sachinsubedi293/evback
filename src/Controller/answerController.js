import Answer from "../Models/answer.model.js";
import jwt from "jsonwebtoken";
import User from "../Models/user.model.js";
import { calculateAndSaveResult } from "../Calc.js";
import mongoose from "mongoose";

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

      const { userId, answers, exam } = req.body;

      const ans = await Answer.find({ user: userId });
      const alreadySubmitted = ans.some((a) => String(a.exam) === exam);
      if (alreadySubmitted) {
        return res.status(200).json({ error: "Already Submitted" });
      }

      const answersArray = Object.keys(answers).map((questionId) => ({
        questionId: new mongoose.Types.ObjectId(questionId),
        answer: answers[questionId],
      }));

      const newAnswer = new Answer({
        user: new mongoose.Types.ObjectId(userId),
        answers: answersArray,
        exam: new mongoose.Types.ObjectId(exam),
      });

      await newAnswer.save();

      calculateAndSaveResult(userId, exam);

      res.status(201).json({ message: "Answers submitted successfully" });
    } catch (error) {
      console.error("Error submitting answers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  getAnswers: async (req, res) => {
    try {
      const answers = await Answer.find();
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