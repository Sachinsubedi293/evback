import { Router } from "express";
import { getExamResults, getresult, getMyResult } from "../Controller/resultController.js";

const router = Router();

router.get("/", getresult);
router.get("/exam/:examId/results", getExamResults);
router.get("/exam/:examId/my-result", getMyResult);

export default router;