import Question from "../Models/questions.model.js";
import jwt from "jsonwebtoken";
import Exam from "../Models/exam.model.js";
import mongoose from "mongoose";
import User from "../Models/user.model.js";

const isValidObjectId = (id) => {
  return (
    typeof id === "string" &&
    id.trim() !== "" &&
    mongoose.Types.ObjectId.isValid(id)
  );
};

const createQuestion = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const tokenPart = token.split(" ")[1];
    const decoded = jwt.verify(tokenPart, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { question, options, correctAnswer, examId } = req.body;
    if (!isValidObjectId(examId)) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    if (
      user.role === "teacher" &&
      String(exam.createdBy) !== String(user._id)
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    const newQuestion = new Question({
      question,
      options,
      correctAnswer,
      exam: examId,
    });
    await newQuestion.save();
    res.status(201).json({
      message: "Question created successfully",
      question: newQuestion,
    });
  } catch (error) {
    console.error("Error creating question:", error);
    res.status(500).json({ error: "Failed to create question" });
  }
};

const shuffleArray = (array, uuid, code) => {
  const seed = parseFloat(uuid) + parseFloat(code);
  let rand = seed * 1e9;

  const random = () => {
    const x = Math.sin(rand++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const getAllQuestions = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const tokenPart = token.split(" ")[1];
    const decoded = jwt.verify(tokenPart, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { examId } = req.query;
    const exam = isValidObjectId(examId)
      ? await Exam.findById(examId)
      : await Exam.findOne({ status: "ongoing" });
    if (!exam) {
      return res.status(400).json({ error: "Exam has not started yet" });
    }

    if (
      user.role === "teacher" &&
      String(exam.createdBy) !== String(user._id)
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (user.role === "student") {
      const allowed =
        exam.visibility === "public" ||
        (exam.joinedStudents || []).some(
          (studentId) => String(studentId) === String(user._id),
        ) ||
        (exam.invitedStudents || []).some(
          (studentId) => String(studentId) === String(user._id),
        );

      if (!allowed) {
        return res
          .status(403)
          .json({ error: "You are not allowed to view this exam" });
      }
    }

    const { Code } = decoded;
    if (typeof Code !== "number" && typeof Code !== "string") {
      return res.status(400).json({ error: "Invalid Code in token" });
    }

    const questions = await Question.find({}, { correctAnswer: 0 }).limit(20);
    const shuffledQuestions = shuffleArray(questions, Code, exam.Code);

    res.status(200).json(shuffledQuestions);
  } catch (error) {
    console.error("Error retrieving questions:", error);
    res.status(500).json({ error: "Failed to retrieve questions" });
  }
};

const getQuestionById = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid question ID" });
  }

  try {
    const question = await Question.findById(id.trim());
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.status(200).json(question);
  } catch (error) {
    console.error("Error retrieving question by ID:", error);
    res.status(500).json({ error: "Failed to retrieve question" });
  }
};

const updateQuestionById = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid question ID" });
  }

  try {
    const updatedQuestion = await Question.findByIdAndUpdate(
      id.trim(),
      req.body,
      { new: true },
    );
    if (!updatedQuestion) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.status(200).json({
      message: "Question updated successfully",
      question: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating question by ID:", error);
    res.status(500).json({ error: "Failed to update question" });
  }
};

const deleteQuestionById = async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid question ID" });
  }

  try {
    const deletedQuestion = await Question.findByIdAndDelete(id.trim());
    if (!deletedQuestion) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question by ID:", error);
    res.status(500).json({ error: "Failed to delete question" });
  }
};

export default {
  createQuestion,
  // bulk create questions for an exam
  bulkCreateQuestions: async (req, res) => {
    try {
      const token = req.headers.authorization;
      if (!token) return res.status(401).json({ error: "No token provided" });
      const tokenPart = token.split(" ")[1];
      const decoded = jwt.verify(tokenPart, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      if (!user || (user.role !== "admin" && user.role !== "teacher")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { examId, questions } = req.body;
      if (!isValidObjectId(examId)) {
        return res.status(400).json({ error: "Invalid exam ID" });
      }
      const exam = await Exam.findById(examId);
      if (!exam) {
        return res.status(404).json({ error: "Exam not found" });
      }
      if (
        user.role === "teacher" &&
        String(exam.createdBy) !== String(user._id)
      ) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Questions array required" });
      }

      const docs = questions.map((q) => ({
        exam: examId,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
      }));

      const created = await Question.insertMany(docs);
      return res
        .status(201)
        .json({ message: "Questions uploaded", createdCount: created.length });
    } catch (error) {
      console.error("Bulk upload error:", error);
      return res.status(500).json({ error: "Failed to upload questions" });
    }
  },
  getAllQuestions,
  getQuestionById,
  updateQuestionById,
  deleteQuestionById,
};
