import mongoose from "mongoose";
import Question from "./Models/questions.model.js";
import questions from "./Data.js";

async function populateQuestions() {
  try {
    await Question.deleteMany();
    const insertedQuestions = await Question.insertMany(questions);
    console.log(`${insertedQuestions.length} questions inserted successfully`);

    mongoose.connection.close();
    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error populating questions:", error);
    process.exit(1);
  }
}

export { populateQuestions };