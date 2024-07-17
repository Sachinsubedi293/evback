// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../Controller/authController');

// Route for user signup
router.post('/signup', authController.signup);

// Route for user login
router.post('/login', authController.login);

//Route for Refresh Token
router.post('/refresh', authController.refreshToken);

router.get('/students',authController.getStudents);

router.post('/students', authController.createStudents);

router.delete('/delstudents', authController.deleteStudents);

module.exports = router;
