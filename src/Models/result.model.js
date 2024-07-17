const mongoose = require('mongoose');

// Define the schema for the result model
const resultSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  obtainedMarks: {
    type: Number,
    required: true
  }
}, { timestamps: true }); // This adds createdAt and updatedAt fields

const Result = mongoose.model('Result', resultSchema);

module.exports = Result;
