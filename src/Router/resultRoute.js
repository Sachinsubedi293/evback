import { getresult } from "../Controller/resultController.js";

const resultRoute = (app, prefix) => {
  app.route("get", `${prefix}/results`, getresult);
};

export default resultRoute;