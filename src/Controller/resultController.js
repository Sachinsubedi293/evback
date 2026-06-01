import Result from "../Models/result.model.js";
import jwt from "jsonwebtoken";
import Exam from "../Models/exam.model.js";
import Answer from "../Models/answer.model.js";
import Question from "../Models/questions.model.js";
import User from "../Models/user.model.js";

const getresult = async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authorization.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { role } = decoded;
    if (role !== "admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const latestResult = await Result.findOne().sort({ createdAt: -1 });
    if (!latestResult) {
      return res.status(400).json({ error: "No results found" });
    }

    const examId = latestResult.examId;

    const results = await Result.find({ examId: examId });
    if (!results || results.length === 0) {
      return res.status(400).json({ error: "No results found" });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Error retrieving results:", error);
    res.status(500).json({ error: "Failed to retrieve results" });
  }
};

const getExamResults = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    const { examId } = req.params;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const isOwner =
      user &&
      (user.role === "admin" ||
        (user.role === "teacher" &&
          String(exam.createdBy) === String(user._id)));
    if (!isOwner) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const answers = await Answer.find({ exam: examId })
      .populate("user")
      .populate("answers.questionId");
    const questions = await Question.find({ exam: examId }).select(
      "question options",
    );

    const results = answers.map((answerDoc) => ({
      student: answerDoc.user,
      submittedAt: answerDoc.createdAt,
      answers: answerDoc.answers.map((entry) => ({
        questionId: entry.questionId?._id || entry.questionId,
        question: entry.questionId?.question || null,
        selectedAnswer: entry.answer,
      })),
    }));

    return res.status(200).json({
      exam,
      questions,
      results,
    });
  } catch (error) {
    console.error("Error retrieving exam results:", error);
    return res.status(500).json({ error: "Failed to retrieve exam results" });
  }
};

export { getresult, getExamResults };
