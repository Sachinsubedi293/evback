const express = require('express');
const router = express.Router();
const answerController = require('../Controller/answerController');

// Route for submitting answers
router.post('/answers', answerController.submitAnswers);

// Route for retrieving answers
router.get('/answers', answerController.getAnswers);

// Route for updating answers
router.put('/answers/:id', answerController.updateAnswer);

// Route for deleting answers
router.delete('/answers/:id', answerController.deleteAnswer);



module.exports = router;
