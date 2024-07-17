const mongoose = require("mongoose");
const Question = require("./Models/questions.model");
const Answer = require("./Models/answer.model");
const Result = require("./Models/result.model");

const fetchandcalc = async (questionId, ans) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      throw new Error(`Invalid question ID: ${questionId}`);
    }

    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error(`Question not found with ID: ${questionId}`);
    }

    const correct = question.correctAnswer === ans;
    return { correct };
  } catch (error) {
    throw new Error(`Failed to fetch question: ${error.message}`);
  }
};

const calculateAndSaveResult = async (userId, examId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error(`Invalid user ID: ${userId}`);
    }

    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw new Error(`Invalid exam ID: ${examId}`);
    }

    const answers = await Answer.find({ user: userId, exam: examId });
    const resultDetails = [];

    for (const answer of answers) {
      let correctCount = 0;
      const answerResults = [];

      for (const answerEntry of answer.answers) {
        const questionId = answerEntry.questionId;
        const givenAnswer = answerEntry.answer;

        const { correct } = await fetchandcalc(questionId, givenAnswer);
        answerResults.push({ questionId, correct });

        if (correct) {
          correctCount++;
        }
      }

      await saveResult(examId, userId, correctCount);
      resultDetails.push({ answer, answerResults, correctCount });
    }

    console.log("Result Details:", resultDetails);
    return resultDetails;
  } catch (error) {
    throw new Error(`Error calculating and saving result: ${error.message}`);
  }
};

async function saveResult(examId, studentId, obtainedMarks) {
  try {
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      throw new Error(`Invalid exam ID: ${examId}`);
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error(`Invalid student ID: ${studentId}`);
    }

    if (obtainedMarks < 0) {
      throw new Error(`Invalid obtained marks: ${obtainedMarks}`);
    }

    const result = new Result({
      examId,
      studentId,
      obtainedMarks,
    });
    await result.save();
    console.log("Result saved successfully");
  } catch (error) {
    console.error("Error saving result:", error);
    throw error;
  }
}

module.exports = { calculateAndSaveResult };