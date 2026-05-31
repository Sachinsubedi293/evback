import answerController from "../Controller/answerController.js";

const answerRoute = (app, prefix) => {
  app.route("post", `${prefix}/answers`, answerController.submitAnswers);
  app.route("get", `${prefix}/answers`, answerController.getAnswers);
  app.route("put", `${prefix}/answers/:id`, answerController.updateAnswer);
  app.route("delete", `${prefix}/answers/:id`, answerController.deleteAnswer);
};

export default answerRoute;