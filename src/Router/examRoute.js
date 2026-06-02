import { Router } from "express";
import {
  createExam,
  getAllExams,
  getOngoingExams,
  getExamById,
  getInviteLink,
  getMyExams,
  joinExam,
  deleteExam,
  startExamNow,
} from "../Controller/examController.js";

// Router for /exam paths
export const examRouter = Router();

examRouter.post("/", createExam);
examRouter.get("/", getOngoingExams);
examRouter.post("/join", joinExam);
examRouter.get("/join/:inviteCode", joinExam);
examRouter.get("/:examId", getExamById);
examRouter.get("/:examId/invite", getInviteLink);
examRouter.post("/:examId/start", startExamNow);

// Router for /allexam
export const allExamRouter = Router();
allExamRouter.get("/", getAllExams);

// Router for /myexams
export const myExamsRouter = Router();
myExamsRouter.get("/", getMyExams);

// Router for /join-exam
export const joinExamRouter = Router();
joinExamRouter.post("/", joinExam);

// Router for /delexam
export const deleteExamRouter = Router();
deleteExamRouter.delete("/", deleteExam);

// Router for /server-time
export const serverTimeRouter = Router();
serverTimeRouter.get("/", (req, res) => {
  res.json({ serverTime: new Date().toISOString() });
});