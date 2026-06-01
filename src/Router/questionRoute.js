import questionController from "../Controller/questionController.js";

const questionRoute = (app, prefix) => {
  app.route("post", `${prefix}/questions`, questionController.createQuestion);
  app.route(
    "post",
    `${prefix}/questions/bulk`,
    questionController.bulkCreateQuestions,
  );
  // Assign/unassign routes MUST come before the :id parameterized route
  // to avoid "assign"/"unassign" being matched as an ID
  app.route(
    "post",
    `${prefix}/questions/assign`,
    questionController.assignQuestionsToExam,
  );
  app.route(
    "post",
    `${prefix}/questions/unassign`,
    questionController.unassignQuestionsFromExam,
  );
  app.route("get", `${prefix}/questions`, questionController.getAllQuestions);
  app.route(
    "get",
    `${prefix}/questions/:id`,
    questionController.getQuestionById,
  );
  app.route(
    "put",
    `${prefix}/questions/:id`,
    questionController.updateQuestionById,
  );
  app.route(
    "delete",
    `${prefix}/questions/:id`,
    questionController.deleteQuestionById,
  );
};

export default questionRoute;