import mongoose from "mongoose";

const answerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
    index: true,
  },
  answers: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
        required: true,
      },
      answer: {
        type: String,
        trim: true,
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

const Answer = mongoose.model("Answer", answerSchema);

export default Answer;