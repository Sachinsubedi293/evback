import Question from "../Models/questions.model.js";
import jwt from "jsonwebtoken";
import Exam from "../Models/exam.model.js";
import mongoose from "mongoose";
import User from "../Models/user.model.js";
import { syncExamStatus } from "./examController.js";

const isValidObjectId = (id) => {
  return (
    typeof id === "string" &&
    id.trim() !== "" &&
    mongoose.Types.ObjectId.isValid(id)
  );
};

/**
 * Helper: Check if a question is referenced by any ongoing exam.
 * Returns the first ongoing exam found, or null.
 */
const isQuestionInOngoingExam = async (questionId) => {
  const ongoingExams = await Exam.find({ status: "ongoing" });
  for (const exam of ongoingExams) {
    const isAssigned = (exam.questions || []).some(
      (qId) => String(qId) === String(questionId),
    );
    if (isAssigned) return exam;
  }
  return null;
};

/**
 * Build a filter query from request query params.
 * Supports: category, search (text), examId, bank, ids (comma-separated list for select-all)
 */
const buildFilterQuery = (query, user) => {
  const { category, search, examId, bank, ids } = query;
  const filter = {};

  // Filter by category
  if (category && typeof category === "string") {
    filter.category = category.trim();
  }

  // Text search on question field
  if (search && typeof search === "string") {
    const trimmed = search.trim();
    if (trimmed) {
      filter.question = { $regex: trimmed, $options: "i" };
    }
  }

  // Filter by specific IDs (for select-all / bulk operations)
  if (ids && typeof ids === "string") {
    const idList = ids.split(",").map((id) => id.trim()).filter(Boolean);
    if (idList.length > 0) {
      filter._id = { $in: idList.filter(isValidObjectId) };
    }
  }

  return filter;
};

/**
 * GET /api/questions/ids
 * Return all matching question IDs (for "select all" button on frontend).
 * Accepts same filters: category, search, examId, bank
 */
const getQuestionIds = async (req, res) => {
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

    const { category, search, examId, bank } = req.query;
    const filter = [];

    // Build query based on user role and filters
    if (user.role === "admin") {
      // Admin sees everything
    } else if (user.role === "teacher") {
      // Teacher sees: their own questions + bank questions + questions in their exams
      const teacherExams = await Exam.find({ createdBy: user._id });
      const examIds = teacherExams.map((e) => e._id);
      filter.push({
        $or: [
          { createdBy: user._id },
          { exam: { $in: examIds } },
          { exam: { $exists: false } },
        ],
      });
    } else {
      return res.status(403).json({ error: "Unauthorized" });
    }

    // Apply filters
    if (category) filter.push({ category });
    if (search) filter.push({ question: { $regex: search.trim(), $options: "i" } });
    if (examId) {
      if (!isValidObjectId(examId)) {
        return res.status(400).json({ error: "Invalid exam ID" });
      }
      filter.push({ exam: examId });
    }
    if (bank === "true") {
      filter.push({ exam: { $exists: false } });
    }

    const query = filter.length > 0 ? { $and: filter } : {};
    const questions = await Question.find(query).select("_id").lean();

    const ids = questions.map((q) => q._id.toString());
    return res.status(200).json({ ids, count: ids.length });
  } catch (error) {
    console.error("Error retrieving question IDs:", error);
    res.status(500).json({ error: "Failed to retrieve question IDs" });
  }
};

/**
 * GET /api/questions/categories
 * Return all unique categories used by questions the user can see.
 */
const getCategories = async (req, res) => {
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

    let filter = {};
    if (user.role === "teacher") {
      const teacherExams = await Exam.find({ createdBy: user._id });
      const examIds = teacherExams.map((e) => e._id);
      filter = {
        $or: [
          { createdBy: user._id },
          { exam: { $in: examIds } },
          { exam: { $exists: false } },
        ],
      };
    }

    const categories = await Question.distinct("category", filter);
    const filtered = categories.filter((c) => c && c.trim());
    return res.status(200).json({ categories: filtered });
  } catch (error) {
    console.error("Error retrieving categories:", error);
    res.status(500).json({ error: "Failed to retrieve categories" });
  }
};

/**
 * POST /api/questions
 * Create a new question. examId is optional — without it the question
 * goes into the general question bank.
 */
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

    const { question, options, correctAnswer, explanation, marks, examId, category } = req.body;

    // If examId is provided, validate it
    if (examId) {
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
    }

    const newQuestion = new Question({
      question,
      options,
      correctAnswer,
      explanation: explanation || "",
      marks: marks || 1,
      category: category || "",
      createdBy: user._id,
      ...(examId ? { exam: examId } : {}),
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

    // Support filtering via query params: examId, bank, category, search, ids
    const { examId, bank, category, search, ids } = req.query;

    // If examId is provided, get questions for that exam
    if (examId) {
      const exam = isValidObjectId(examId)
        ? await Exam.findById(examId)
        : null;
      if (!exam) {
        return res.status(400).json({ error: "Exam not found" });
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

      await syncExamStatus(exam);

      const questions = await Question.find({
        _id: { $in: exam.questions || [] },
      });

      if (user.role === "student") {
        const sanitized = questions.map((q) => {
          const obj = q.toObject();
          delete obj.correctAnswer;
          return obj;
        });

        const { Code } = decoded;
        if (typeof Code !== "number" && typeof Code !== "string") {
          return res.status(400).json({ error: "Invalid Code in token" });
        }

        const shuffledQuestions = shuffleArray(sanitized, Code, exam.Code);
        return res.status(200).json(shuffledQuestions);
      }

      return res.status(200).json(questions);
    }

    // If ?bank=true, return all questions NOT assigned to any exam (question bank)
    if (bank === "true") {
      const filter = buildFilterQuery(req.query, user);
      filter.exam = { $exists: false };
      const questions = await Question.find(filter).sort({ created_date: -1 });
      return res.status(200).json(questions);
    }

    // Default: return all questions the user has access to, with optional filters
    if (user.role === "admin") {
      const filter = buildFilterQuery(req.query, user);
      const questions = await Question.find(filter).sort({ created_date: -1 });
      return res.status(200).json(questions);
    }

    // For teachers
    const teacherExams = await Exam.find({ createdBy: user._id });
    const examIds = teacherExams.map((e) => e._id);
    const baseFilter = {
      $or: [
        { exam: { $in: examIds } },
        { createdBy: user._id },
        { exam: { $exists: false } },
      ],
    };

    // Merge with additional filters (category, search, ids)
    const filter = buildFilterQuery(req.query, user);
    const finalFilter = Object.keys(filter).length > 0
      ? { $and: [baseFilter, filter] }
      : baseFilter;

    const questions = await Question.find(finalFilter).sort({ created_date: -1 });
    return res.status(200).json(questions);
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
    // Check if question is used in any ongoing exam
    const ongoingExam = await isQuestionInOngoingExam(id);
    if (ongoingExam) {
      return res.status(400).json({
        error: `Cannot edit this question — it is currently assigned to an ongoing exam: "${ongoingExam.name}" (${ongoingExam._id}). Wait until the exam is completed.`,
      });
    }

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
    const ongoingExam = await isQuestionInOngoingExam(id);
    if (ongoingExam) {
      return res.status(400).json({
        error: `Cannot delete this question — it is currently assigned to an ongoing exam: "${ongoingExam.name}" (${ongoingExam._id}). Wait until the exam is completed.`,
      });
    }

    const deletedQuestion = await Question.findByIdAndDelete(id.trim());
    if (!deletedQuestion) {
      return res.status(404).json({ error: "Question not found" });
    }

    await Exam.updateMany(
      { questions: id.trim() },
      { $pull: { questions: id.trim() } },
    );

    res.status(200).json({ message: "Question deleted successfully" });
  } catch (error) {
    console.error("Error deleting question by ID:", error);
    res.status(500).json({ error: "Failed to delete question" });
  }
};

/**
 * POST /api/questions/assign
 * Assign question(s) from the bank to an exam.
 * Body: { examId, questionIds: [...] }
 */
const assignQuestionsToExam = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });
    const tokenPart = token.split(" ")[1];
    const decoded = jwt.verify(tokenPart, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { examId, questionIds } = req.body;
    if (!isValidObjectId(examId)) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    await syncExamStatus(exam);

    if (exam.status === "completed") {
      return res
        .status(400)
        .json({ error: "Cannot assign questions to a completed exam" });
    }

    if (
      user.role === "teacher" &&
      String(exam.createdBy) !== String(user._id)
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    const validQuestions = await Question.find({
      _id: { $in: questionIds },
    });

    if (validQuestions.length !== questionIds.length) {
      return res.status(400).json({
        error: "One or more question IDs are invalid",
        validCount: validQuestions.length,
        providedCount: questionIds.length,
      });
    }

    const existingIds = new Set(
      (exam.questions || []).map((qId) => String(qId)),
    );
    const newIds = validQuestions
      .map((q) => q._id)
      .filter((qId) => !existingIds.has(String(qId)));

    if (newIds.length === 0) {
      return res
        .status(400)
        .json({ error: "All questions are already assigned to this exam" });
    }

    exam.questions = [...(exam.questions || []), ...newIds];
    await exam.save();

    await Question.updateMany(
      { _id: { $in: newIds } },
      { $set: { exam: examId } },
    );

    res.status(200).json({
      message: "Questions assigned successfully",
      assignedCount: newIds.length,
      examId: exam._id,
    });
  } catch (error) {
    console.error("Error assigning questions:", error);
    res.status(500).json({ error: "Failed to assign questions" });
  }
};

/**
 * POST /api/questions/unassign
 * Remove question(s) from an exam.
 * Body: { examId, questionIds: [...] }
 */
const unassignQuestionsFromExam = async (req, res) => {
  try {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });
    const tokenPart = token.split(" ")[1];
    const decoded = jwt.verify(tokenPart, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user || (user.role !== "admin" && user.role !== "teacher")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { examId, questionIds } = req.body;
    if (!isValidObjectId(examId)) {
      return res.status(400).json({ error: "Invalid exam ID" });
    }
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    await syncExamStatus(exam);

    if (exam.status === "ongoing") {
      return res
        .status(400)
        .json({ error: "Cannot unassign questions from an ongoing exam" });
    }

    if (exam.status === "completed") {
      return res
        .status(400)
        .json({ error: "Cannot unassign questions from a completed exam" });
    }

    if (
      user.role === "teacher" &&
      String(exam.createdBy) !== String(user._id)
    ) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return res.status(400).json({ error: "questionIds array is required" });
    }

    exam.questions = (exam.questions || []).filter(
      (qId) => !questionIds.some((removeId) => String(removeId) === String(qId)),
    );
    await exam.save();

    await Question.updateMany(
      { _id: { $in: questionIds } },
      { $unset: { exam: "" } },
    );

    res.status(200).json({
      message: "Questions unassigned successfully",
      examId: exam._id,
    });
  } catch (error) {
    console.error("Error unassigning questions:", error);
    res.status(500).json({ error: "Failed to unassign questions" });
  }
};

export default {
  createQuestion,
  getQuestionIds,
  getCategories,
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

      if (examId) {
        if (!isValidObjectId(examId)) {
          return res.status(400).json({ error: "Invalid exam ID" });
        }
        const exam = await Exam.findById(examId);
        if (!exam) {
          return res.status(404).json({ error: "Exam not found" });
        }

        await syncExamStatus(exam);
        if (
          user.role === "teacher" &&
          String(exam.createdBy) !== String(user._id)
        ) {
          return res.status(403).json({ error: "Unauthorized" });
        }
      }

      if (!Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ error: "Questions array required" });
      }

      const docs = questions.map((q) => ({
        ...(examId ? { exam: examId } : {}),
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || "",
        marks: q.marks || 1,
        category: q.category || "",
        createdBy: user._id,
      }));

      const created = await Question.insertMany(docs);

      if (examId) {
        const exam = await Exam.findById(examId);
        if (exam) {
          const newIds = created.map((c) => c._id);
          exam.questions = [...(exam.questions || []), ...newIds];
          await exam.save();
        }
      }

      return res.status(201).json({
        message: "Questions uploaded",
        createdCount: created.length,
      });
    } catch (error) {
      console.error("Bulk upload error:", error);
      return res.status(500).json({ error: "Failed to upload questions" });
    }
  },
  getAllQuestions,
  getQuestionById,
  updateQuestionById,
  deleteQuestionById,
  assignQuestionsToExam,
  unassignQuestionsFromExam,
};