import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import morgan from "morgan";
import teacherRoutes from "./routes/teacher.routes.js";
// import studentRoutes from "./routes/student.routes.js";
import classRoutes from "./routes/class.routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";

config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
  })
);

app.use(cookieParser());

app.use("/ping", function (req, res) {
  res.send("/pong");
});

app.use("/api/v1/user", teacherRoutes);
app.use("/api/v1/class", classRoutes);
// app.use("/api/v1/student", studentRoutes);

app.all("*", (req, res) => {
  res.status(404).send("OOPS! 404 PAGE NOT FOUND");
});

app.use(errorMiddleware);

export default app;
