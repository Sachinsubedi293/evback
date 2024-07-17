const Result = require("../Models/result.model");
const jwt = require('jsonwebtoken');

const getresult = async (req, res) => {
  try {
    // Extract and verify the token first
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { role } = decoded;
    if (role !== 'admin') {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find the most recent exam based on the date
    const latestResult = await Result.findOne().sort({ createdAt: -1 });
    if (!latestResult) {
      return res.status(400).json({ error: 'No results found' });
    }

    const examId = latestResult.examId;

    // Fetch all results for the latest examId
    const results = await Result.find({ examId: examId });
    if (!results || results.length === 0) {
      return res.status(400).json({ error: 'No results found' });
    }

    console.log(results);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error retrieving results:', error);
    res.status(500).json({ error: 'Failed to retrieve results' });
  }
};

module.exports = { getresult };
