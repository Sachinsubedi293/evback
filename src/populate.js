const mongoose = require('mongoose');
const Question = require('./Models/questions.model'); // Import your Question model
const {questions} = require('./Data'); // Import the array of questions

async function populateQuestions() {
  try {
    // Delete existing questions (optional)
    await Question.deleteMany();

    // Insert new questions from the array
    const insertedQuestions = await Question.insertMany(questions);
    console.log(`${insertedQuestions.length} questions inserted successfully`);

    // Disconnect from MongoDB
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error populating questions:', error);
    process.exit(1);
  }
}
module.exports={populateQuestions};