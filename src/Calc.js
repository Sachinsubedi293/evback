import mongoose from "mongoose";
import Question from "./Models/questions.model.js";
import Answer from "./Models/answer.model.js";
import Result from "./Models/result.model.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Generate a cryptographically-random 6-char uppercase alphanumeric code */
const generateResultCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

/**
 * Verify one answer entry against the stored correct answer.
 * Returns { correct: boolean }.
 */
const checkAnswer = async (questionId, givenAnswer) => {
  if (!mongoose.Types.ObjectId.isValid(questionId)) {
    return { correct: false };
  }
  const question = await Question.findById(questionId).lean();
  if (!question) return { correct: false };
  return { correct: question.correctAnswer === givenAnswer };
};

// ─── Pure score calculation (no DB writes) ──────────────────────────────────

/**
 * Calculate a student's score for an exam without persisting anything.
 * Returns { correctCount, totalAnswered, totalMarks }.
 */
export const calculateScore = async (userId, examId) => {
  const answers = await Answer.find({ user: userId, exam: examId }).lean();
  if (!answers.length) return { correctCount: 0, totalAnswered: 0, totalMarks: 0 };

  let correctCount = 0;
  let totalMarks = 0;

  for (const answerDoc of answers) {
    for (const entry of answerDoc.answers) {
      totalMarks++;
      const { correct } = await checkAnswer(entry.questionId, entry.answer);
      if (correct) correctCount++;
    }
  }

  return { correctCount, totalAnswered: answers.length, totalMarks };
};

// ─── Bulk release (called when exam ends) ───────────────────────────────────

/**
 * Calculate scores for ALL students who submitted answers for this exam,
 * persist Result records (released=true, with a unique resultCode per student),
 * and return an array of { studentId, resultCode } for SSE broadcast.
 *
 * Safe to call multiple times — uses upsert so re-runs don't duplicate records.
 */
export const releaseResultsForExam = async (examId) => {
  try {
    // Find every unique student who submitted for this exam
    const allAnswers = await Answer.find({ exam: examId }).lean();
    const studentIds = [...new Set(allAnswers.map((a) => String(a.user)))];

    const broadcasts = [];

    for (const studentIdStr of studentIds) {
      const studentId = new mongoose.Types.ObjectId(studentIdStr);

      // Calculate score
      const { correctCount, totalMarks } = await calculateScore(studentId, examId);

      // Generate a unique code for this student
      let resultCode = generateResultCode();
      // Collision guard (extremely unlikely but safe)
      let existing = await Result.findOne({ resultCode }).lean();
      while (existing) {
        resultCode = generateResultCode();
        existing = await Result.findOne({ resultCode }).lean();
      }

      // Upsert the result record
      await Result.findOneAndUpdate(
        { examId, studentId },
        {
          $set: {
            obtainedMarks: correctCount,
            totalMarks,
            resultCode,
            released: true,
          },
        },
        { upsert: true, new: true },
      );

      broadcasts.push({ studentId: studentIdStr, resultCode });
      console.log(
        `[Results] Student ${studentIdStr} → ${correctCount}/${totalMarks} | code: ${resultCode}`,
      );
    }

    console.log(`[Results] Released ${broadcasts.length} results for exam ${examId}`);
    return broadcasts;
  } catch (error) {
    console.error(`[Results] Error releasing results for exam ${examId}:`, error);
    return [];
  }
};

// ─── Legacy helper (kept for backwards-compat, now a no-op) ─────────────────

/**
 * @deprecated Results are now released in bulk when the exam ends via
 * releaseResultsForExam(). This function is intentionally a no-op.
 */
export const calculateAndSaveResult = async (_userId, _examId) => {
  // Intentionally empty — results are deferred until exam completion.
};