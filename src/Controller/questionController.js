import Question from "../Models/questions.model.js";
import jwt from "jsonwebtoken";
import Exam from "../Models/exam.model.js";

const createQuestion = async (req, res) => {
  try {
    const { question, options, correctAnswer } = req.body;
    const newQuestion = new Question({ question, options, correctAnswer });
    await newQuestion.save();
    res.status(201).json({ message: "Question created successfully", question: newQuestion });
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
    const exam = await Exam.findOne({ status: "ongoing" });
    if (!exam) {
      return res.status(400).json({ error: "Exam has not started yet" });
    }

    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { Code } = decoded;
    if (typeof Code !== "number" || Code < 0.001 || Code > 0.999) {
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
  try {
    const question = await Question.findById(id);
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
  try {
    const updatedQuestion = await Question.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedQuestion) {
      return res.status(404).json({ error: "Question not found" });
    }
    res.status(200).json({ message: "Question updated successfully", question: updatedQuestion });
  } catch (error) {
    console.error("Error updating question by ID:", error);
    res.status(500).json({ error: "Failed to update question" });
  }
};

const deleteQuestionById = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedQuestion = await Question.findByIdAndDelete(id);
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
  getAllQuestions,
  getQuestionById,
  updateQuestionById,
  deleteQuestionById,
};