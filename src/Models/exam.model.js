const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
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
    enum: ['scheduled', 'ongoing', 'completed'], // Define possible values for status
    default: 'scheduled', // Default status when creating a new exam
  },
  Code:{
    type:Number,
    required: true
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
});
// Create Exam model from the schema
const Exam = mongoose.model('Exam', examSchema);

// Export the Exam model
module.exports = Exam;