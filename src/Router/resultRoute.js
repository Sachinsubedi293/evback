import { getExamResults, getresult, getMyResult } from "../Controller/resultController.js";

const resultRoute = (app, prefix) => {
  app.route("get", `${prefix}/results`, getresult);
  app.route("get", `${prefix}/exam/:examId/results`, getExamResults);
  // Student's own result — requires resultCode query param
  app.route("get", `${prefix}/exam/:examId/my-result`, getMyResult);
  app.route("get", `${prefix}/exam/:examId/my-result/`, getMyResult);
};

export default resultRoute;
