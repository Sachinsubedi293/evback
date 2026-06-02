import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    obtainedMarks: {
      type: Number,
      required: true,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    // Short alphanumeric code issued to the student when results are released.
    // The student must present this code to view their score.
    resultCode: {
      type: String,
      default: null,
      index: true,
    },
    // Results are only released (visible to the student) after the exam ends.
    released: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

// Compound index — one result record per student per exam
resultSchema.index({ examId: 1, studentId: 1 }, { unique: true });

const Result = mongoose.model("Result", resultSchema);

export default Result;