const Answer = require("../Models/answer.model");
const jwt = require("jsonwebtoken");
const User = require("../Models/user.model");
const { calculateAndSaveResult } = require("../Calc");
const mongoose = require("mongoose");
const jwtverify = (token) => {
  const tokenPart = token.split(" ")[1]; // Splitting 'Bearer <token>' to get '<token>'
  return jwt.verify(tokenPart, process.env.JWT_SECRET);
};

const answerController = {
  // Controller function to submit answers
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

      const ans = Answer.find({ user: userId });
      if (ans.exam == exam) {
        return res.status(200).json({ error: "Already Submitted" });
      }
      // Convert answers object into an array of answer objects for Mongoose schema
      const answersArray = Object.keys(answers).map((questionId) => ({
        questionId: new mongoose.Types.ObjectId(questionId), // Correct usage with 'new'
        answer: answers[questionId],
      }));

      // Create a new Answer instance
      const newAnswer = new Answer({
        user: new mongoose.Types.ObjectId(userId), // Correct usage with 'new'
        answers: answersArray,
        exam: new mongoose.Types.ObjectId(exam), // Correct usage with 'new'
      });

      // Save the Answer document to the database
      await newAnswer.save();

      calculateAndSaveResult(userId, exam);

      res.status(201).json({ message: "Answers submitted successfully" });
    } catch (error) {
      console.error("Error submitting answers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Controller function to retrieve answers
  getAnswers: async (req, res) => {
    try {
      const answers = await Answer.find();
      res.json(answers);
    } catch (error) {
      console.error("Error retrieving answers:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  // Controller function to update an answer
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

  // Controller function to delete an answer
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

module.exports = answerController;
