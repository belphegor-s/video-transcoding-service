import "dotenv/config";
const PORT = process.env?.PORT ?? 8080;

import express from "express";
import rootRoutes from "./routes/root";
import sequelize from "./db/sequelize";
import cors from "cors";
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("Server is live 🍵");
});

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
