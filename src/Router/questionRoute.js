import { Router } from "express";
import questionController from "../Controller/questionController.js";

const router = Router();

router.post("/", questionController.createQuestion);
router.post("/bulk", questionController.bulkCreateQuestions);
router.post("/assign", questionController.assignQuestionsToExam);
router.post("/unassign", questionController.unassignQuestionsFromExam);
router.get("/", questionController.getAllQuestions);
router.get("/:id", questionController.getQuestionById);
router.put("/:id", questionController.updateQuestionById);
router.delete("/:id", questionController.deleteQuestionById);

export default router;