const mongoose = require('mongoose');

// Define a schema for the quiz question
const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true
  },
  options: {
    type: [String], // Array of strings representing the choices
    required: true
  },
  correctAnswer: {
    type: String,
    required: true
  }
});

// Create a Mongoose model based on the schema
const Question = mongoose.model('Question', questionSchema);

module.exports = Question;
