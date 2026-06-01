import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: false, // Now optional — questions can exist in a question bank without an exam
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
});

const Question = mongoose.model("Question", questionSchema);

export default Question;