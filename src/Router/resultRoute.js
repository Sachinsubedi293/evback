const express = require('express');
const router = express.Router();
const resultController = require('../Controller/resultController'); // Import the controller

// Route for retrieving answers
router.get('/results', resultController.getresult);

module.exports = router;
