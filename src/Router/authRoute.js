import authController from "../Controller/authController.js";

const authRoute = (app, prefix) => {
  app.route("post", `${prefix}/signup`, authController.signup);
  app.route("post", `${prefix}/login`, authController.login);
  app.route("post", `${prefix}/guest`, authController.createGuest);
  app.route("post", `${prefix}/refresh`, authController.refreshToken);
  app.route("get", `${prefix}/students`, authController.getStudents);
  app.route("post", `${prefix}/students`, authController.createStudents);
  app.route("delete", `${prefix}/delstudents`, authController.deleteStudents);
};

export default authRoute;
