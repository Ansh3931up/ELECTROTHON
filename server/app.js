import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import morgan from "morgan";
import userRoutes from "./routes/user.routes.js";
// import studentRoutes from "./routes/student.routes.js";
import classRoutes from "./routes/class.routes.js";
import errorMiddleware from "./middlewares/error.middleware.js";
import faceRegistrationRoutes from "./routes/faceRegistration.routes.js";

config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Enable CORS
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost',
  'http://localhost:3000',
  'capacitor://localhost',
  'https://localhost'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(cookieParser());

app.use("/ping", function (req, res) {
  res.send("/pong");
});

app.use("/api/v1/user", userRoutes);
app.use("/api/v1/class", classRoutes);
// app.use("/api/v1/student", studentRoutes);

// Add face registration routes
app.use("/api/v1/face", faceRegistrationRoutes);

app.all("*", (req, res) => {
  res.status(404).send("OOPS! 404 PAGE NOT FOUND");
});

app.use(errorMiddleware);

export default app;
