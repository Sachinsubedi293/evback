import { Router } from "express";
import answerController from "../Controller/answerController.js";

const router = Router();

router.post("/", answerController.submitAnswers);
router.get("/", answerController.getAnswers);
router.put("/:id", answerController.updateAnswer);
router.delete("/:id", answerController.deleteAnswer);

export default router;