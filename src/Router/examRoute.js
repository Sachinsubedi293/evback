const express = require('express');
const router = express.Router();
const { createExam, getAllExams,getOngoingExams, deleteExam } = require('../Controller/examController');

// Route for creating a new exam
router.post('/exam', createExam);

// Route for getting all exams

router.get('/exam',getOngoingExams );

router.get('/allexam', getAllExams);

router.delete('/delexam', deleteExam );


router.get('/server-time', (req, res) => {
    res.json({ serverTime: new Date().toISOString() });
  });

module.exports = router;
