const express = require('express');
const router = express.Router();
const questionController = require('../Controller/questionController');

// Route to create a new quiz question
router.post('/questions', questionController.createQuestion);

// Route to get all quiz questions
router.get('/questions', questionController.getAllQuestions);

// Route to get a specific quiz question by ID
router.get('/questions/:id', questionController.getQuestionById);

// Route to update a quiz question by ID
router.put('/questions/:id', questionController.updateQuestionById);

// Route to delete a quiz question by ID
router.delete('/questions/:id', questionController.deleteQuestionById);

module.exports = router;
