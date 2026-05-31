import mongoose from "mongoose";

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
    enum: ["scheduled", "ongoing", "completed"],
    default: "scheduled",
  },
  Code: {
    type: Number,
    required: true,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
});

const Exam = mongoose.model("Exam", examSchema);

export default Exam;