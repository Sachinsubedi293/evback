import Result from "../Models/result.model.js";
import jwt from "jsonwebtoken";

const getresult = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { role } = decoded;
    if (role !== "admin") {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const latestResult = await Result.findOne().sort({ createdAt: -1 });
    if (!latestResult) {
      return res.status(400).json({ error: "No results found" });
    }

    const examId = latestResult.examId;

    const results = await Result.find({ examId: examId });
    if (!results || results.length === 0) {
      return res.status(400).json({ error: "No results found" });
    }

    res.status(200).json(results);
  } catch (error) {
    console.error("Error retrieving results:", error);
    res.status(500).json({ error: "Failed to retrieve results" });
  }
};

export { getresult };