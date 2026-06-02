import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: false, // Now optional — questions can exist in a question bank without an exam
  },
  category: {
    type: String,
    trim: true,
    default: "", // Subject/category for filtering (e.g., "Math", "Science", "English")
    index: true,
  },
  question: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
  },
  correctAnswer: {
    type: String,
    required: true,
  },
  explanation: {
    type: String,
    default: "",
  },
  marks: {
    type: Number,
    default: 1,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Tracks who created the question
    index: true,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
});

// Text index for search
questionSchema.index({ question: "text", category: 1, createdBy: 1 });

const Question = mongoose.model("Question", questionSchema);

export default Question;