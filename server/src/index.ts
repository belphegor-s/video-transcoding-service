import "dotenv/config";
const PORT = process.env?.PORT ?? 8080;

import express from "express";
import rootRoutes from "./routes/root";
import sequelize from "./db/sequelize";
import cors from "cors";

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use("/api/v1", rootRoutes);

sequelize
  .sync({ alter: true })
  .then(() => {
    console.info("Database synchronized successfully");
  })
  .catch((err) => {
    console.error("Error synchronizing database:", err);
  });

app.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
