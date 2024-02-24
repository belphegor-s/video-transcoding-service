import { Router } from "express";
import userRoutes from "./user";
import uploadRoutes from "./upload";
import videoRoutes from "./video";
import isAuth from "../middlewares/isAuth";
const router = Router();

router.use("/user", userRoutes);
router.use("/upload", isAuth, uploadRoutes);
router.use("/video", isAuth, videoRoutes);

export default router;
