const mongoose = require("mongoose");

// Define a schema for the quiz Answer
const answerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true // Index user field for faster query
  },
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true,
    index: true // Index exam field for faster query
  },
  answers: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true
    },
    answer: {
      type: String,
      trim: true,
      required: true
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true // Index createdAt field for sorting and querying
  },
});

const Answer = mongoose.model("Answer", answerSchema);

module.exports = Answer;
