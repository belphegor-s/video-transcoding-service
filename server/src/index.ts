import "dotenv/config";
const PORT = process.env?.PORT ?? 8080;

import express from "express";
import rootRoutes from "./routes/root";
import sequelize from "./db/sequelize";
const app = express();

app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
	res.send("Server is live 🍵");
});

app.use("/api/v1", rootRoutes);

sequelize
	.sync()
	.then(() => {
		console.info("Database synchronized successfully");
	})
	.catch((err) => {
		console.error("Error synchronizing database:", err);
	});

app.listen(PORT, () => {
	console.log(`listening on http://localhost:${PORT}`);
});
