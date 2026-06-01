import {
  createExam,
  getAllExams,
  getOngoingExams,
  getExamById,
  getInviteLink,
  getMyExams,
  joinExam,
  deleteExam,
} from "../Controller/examController.js";

const examRoute = (app, prefix) => {
  app.route("post", `${prefix}/exam`, createExam);
  app.route("post", `${prefix}/exam/`, createExam);
  app.route("get", `${prefix}/exam`, getOngoingExams);
  app.route("get", `${prefix}/exam/`, getOngoingExams);
  app.route("get", `${prefix}/allexam`, getAllExams);
  app.route("get", `${prefix}/allexam/`, getAllExams);
  app.route("get", `${prefix}/myexams`, getMyExams);
  app.route("get", `${prefix}/myexams/`, getMyExams);
  app.route("get", `${prefix}/exam/:examId`, getExamById);
  app.route("get", `${prefix}/exam/:examId/`, getExamById);
  app.route("post", `${prefix}/exam/join`, joinExam);
  app.route("post", `${prefix}/exam/join/`, joinExam);
  app.route("post", `${prefix}/join-exam`, joinExam);
  app.route("post", `${prefix}/join-exam/`, joinExam);
  app.route("get", `${prefix}/exam/:examId/invite`, getInviteLink);
  app.route("get", `${prefix}/exam/:examId/invite/`, getInviteLink);
  app.route("delete", `${prefix}/delexam`, deleteExam);
  app.route("delete", `${prefix}/delexam/`, deleteExam);
  app.route("get", `${prefix}/server-time`, (req, res) => {
    return res.json({ serverTime: new Date().toISOString() });
  });
};

export default examRoute;
