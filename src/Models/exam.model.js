import mongoose from "mongoose";

const examSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  visibility: {
    type: String,
    enum: ["private", "invite", "public"],
    default: "invite",
    index: true,
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  invitedStudents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  joinedStudents: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  totalStudents: {
    type: Number,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["scheduled", "ongoing", "completed"],
    default: "scheduled",
  },
  startedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  Code: {
    type: Number,
    required: true,
  },
  // Questions assigned to this exam from the question bank
  questions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
    },
  ],
  created_date: {
    type: Date,
    default: Date.now,
  },
});

const Exam = mongoose.model("Exam", examSchema);

export default Exam;
