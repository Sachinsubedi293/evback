import authController from "../Controller/authController.js";

const authRoute = (app) => {
  app.post("/api/signup", authController.signup);
  app.post("/api/login", authController.login);
  app.post("/api/guest", authController.createGuest);
  app.post("/api/refresh", authController.refreshToken);
  app.get("/api/students", authController.getStudents);
  app.post("/api/students", authController.createStudents);
  app.delete("/api/delstudents", authController.deleteStudents);
};

export default authRoute;
