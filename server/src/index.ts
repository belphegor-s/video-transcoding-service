import { env } from "./config/env";

import express from "express";
import rootRoutes from "./routes/root";
import sequelize from "./db/sequelize";
import cors from "cors";

const app = express();

// Allowed browser origins for the authed surface (our own app).
const allowedOrigins = [env.CLIENT_APP_URL, "http://localhost:3000"];

const restrictiveCors = cors({
  origin(origin, callback) {
    // Allow non-browser clients (no Origin header) and any whitelisted origin.
    // Disallowed origins are rejected by omitting CORS headers (no thrown error,
    // so they get a clean response the browser still blocks).
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true,
});

// Public video + token-gated download endpoints are meant to be played and
// embedded on any website, so they are CORS-open (like any video CDN).
const openCors = cors({ exposedHeaders: ["Content-Disposition", "X-Total-Bytes"] });

app.use(["/api/v1/public", "/api/v1/download"], openCors);
app.use(["/api/v1/user", "/api/v1/upload", "/api/v1/video", "/api/v1/api-keys"], restrictiveCors);

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

app.listen(env.PORT, () => {
  console.log(`listening on http://localhost:${env.PORT}`);
});
