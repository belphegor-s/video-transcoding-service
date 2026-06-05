import "dotenv/config";
const PORT = process.env?.PORT ?? 8080;

import express from "express";
import rootRoutes from "./routes/root";
import sequelize from "./db/sequelize";
import cors from "cors";

const app = express();

// Allowed browser origins, env-driven for production + localhost for local dev.
const allowedOrigins = [process.env.CLIENT_APP_URL, "http://localhost:3000"].filter(Boolean) as string[];

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (no Origin header) and any whitelisted origin.
      // Disallowed origins are rejected by omitting CORS headers (no thrown error,
      // so they get a clean response the browser still blocks).
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/v1", rootRoutes);

// Sync the schema in the background. A DB hiccup must not stop the HTTP listener
// from coming up, otherwise the platform health check never goes green.
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
