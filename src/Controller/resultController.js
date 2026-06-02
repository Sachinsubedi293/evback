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

/**
 * GET /api/exam/:examId/my-result?code=XXXXXX
 *
 * Student endpoint — returns their own score for a completed exam.
 * Requires:
 *   - Valid auth token (student)
 *   - `code` query param matching their resultCode
 *   - Exam must be completed and results released
 */
const getMyResult = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { examId } = req.params;
    const { code } = req.query;

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Results only available after exam is completed
    if (exam.status !== "completed") {
      return res.status(202).json({
        pending: true,
        status: exam.status,
        message: "Exam has not ended yet. Results will be available when the exam finishes.",
        endAt: exam.endDate,
      });
    }

    const result = await Result.findOne({ examId, studentId: user._id });

    if (!result) {
      return res.status(404).json({
        error: "No submission found for this exam.",
        noSubmission: true,
      });
    }

    if (!result.released) {
      return res.status(202).json({
        pending: true,
        message: "Results are being processed. Please try again shortly.",
      });
    }

    // Validate result code
    if (!code || code.trim().toUpperCase() !== result.resultCode) {
      return res.status(403).json({
        error: "Invalid result code. Please enter the code sent to you when the exam ended.",
        codeRequired: true,
      });
    }

    // Return the student's result
    return res.status(200).json({
      examId,
      examTitle: exam.name,
      obtainedMarks: result.obtainedMarks,
      totalMarks: result.totalMarks,
      percentage: result.totalMarks > 0
        ? Math.round((result.obtainedMarks / result.totalMarks) * 100)
        : 0,
      submittedAt: result.createdAt,
      released: true,
    });
  } catch (error) {
    console.error("Error retrieving student result:", error);
    return res.status(500).json({ error: "Failed to retrieve result" });
  }
};

export { getresult, getExamResults, getMyResult };
