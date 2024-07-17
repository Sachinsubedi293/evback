const Question = require('../Models/questions.model');
const jwt = require('jsonwebtoken');
const Exam = require('../Models/exam.model');

// Controller to create a new quiz question
const createQuestion = async (req, res) => {
  try {
    const { question, options, correctAnswer } = req.body;
    const newQuestion = new Question({ question, options, correctAnswer });
    await newQuestion.save();
    res.status(201).json({ message: 'Question created successfully', question: newQuestion });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
};

const shuffleArray = (array, uuid, code) => {
  // Create a seed using the uuid and code by converting them into a single numerical value
  const seed = parseFloat(uuid) + parseFloat(code);

  // Seeded pseudo-random number generator using the seed
  let rand = seed * 1e9;  // Convert the seed to a large integer for better randomness

  const random = () => {
    const x = Math.sin(rand++) * 10000;
    return x - Math.floor(x);
  };

  // Use Fisher-Yates (aka Knuth) Shuffle algorithm to shuffle the array
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

const getAllQuestions = async (req, res) => {
  try {
    // Check if the exam has started
    const exam = await Exam.findOne({ status: 'ongoing' });
    if (!exam) {
      return res.status(400).json({ error: 'Exam has not started yet' });
    }
    console.log(exam);

    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Decode the token to extract the code
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    const { Code } = decoded;
    if (typeof Code !== 'number' || Code < 0.001 || Code > 0.999) {
      return res.status(400).json({ error: 'Invalid Code in token' });
    }

    // Retrieve only 20 questions from the database
    const questions = await Question.find({}, { correctAnswer: 0 }).limit(20); // Exclude correctAnswer field

    // Shuffle the array of questions using the extracted Code
    const shuffledQuestions = shuffleArray(questions, Code,exam.Code);

    // Send the shuffled questions as the response
    res.status(200).json(shuffledQuestions);
  } catch (error) {
    console.error('Error retrieving questions:', error);
    res.status(500).json({ error: 'Failed to retrieve questions' });
  }
};




// Controller to retrieve a specific quiz question by ID
const getQuestionById = async (req, res) => {
  const { id } = req.params;
  try {
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(200).json(question);
  } catch (error) {
    console.error('Error retrieving question by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve question' });
  }
};

// Controller to update a quiz question by ID
const updateQuestionById = async (req, res) => {
  const { id } = req.params;
  try {
    const updatedQuestion = await Question.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(200).json({ message: 'Question updated successfully', question: updatedQuestion });
  } catch (error) {
    console.error('Error updating question by ID:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
};

// Controller to delete a quiz question by ID
const deleteQuestionById = async (req, res) => {
  const { id } = req.params;
  try {
    const deletedQuestion = await Question.findByIdAndDelete(id);
    if (!deletedQuestion) {
      return res.status(404).json({ error: 'Question not found' });
    }
    res.status(200).json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question by ID:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
};

module.exports = {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestionById,
  deleteQuestionById
};
