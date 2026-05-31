import questionController from "../Controller/questionController.js";

const questionRoute = (app, prefix) => {
  app.route("post", `${prefix}/questions`, questionController.createQuestion);
  app.route("get", `${prefix}/questions`, questionController.getAllQuestions);
  app.route("get", `${prefix}/questions/:id`, questionController.getQuestionById);
  app.route("put", `${prefix}/questions/:id`, questionController.updateQuestionById);
  app.route("delete", `${prefix}/questions/:id`, questionController.deleteQuestionById);
};

export default questionRoute;