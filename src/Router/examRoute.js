import {
  createExam,
  getAllExams,
  getOngoingExams,
  deleteExam,
} from "../Controller/examController.js";

const examRoute = (app, prefix) => {
  app.route("post", `${prefix}/exam`, createExam);
  app.route("get", `${prefix}/exam`, getOngoingExams);
  app.route("get", `${prefix}/allexam`, getAllExams);
  app.route("delete", `${prefix}/delexam`, deleteExam);
  app.route("get", `${prefix}/server-time`, (req, res) => {
    return res.json({ serverTime: new Date().toISOString() });
  });
};

export default examRoute;