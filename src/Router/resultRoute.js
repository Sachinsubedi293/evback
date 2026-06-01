import { getExamResults, getresult } from "../Controller/resultController.js";

const resultRoute = (app, prefix) => {
  app.route("get", `${prefix}/results`, getresult);
  app.route("get", `${prefix}/exam/:examId/results`, getExamResults);
};

export default resultRoute;
