import { Router } from "express";
import userRoutes from "./user";
import uploadRoutes from "./upload";
import videoRoutes from "./video";
import publicVideoRoutes from "./public";
import downloadRoutes from "./download";
import isAuth from "../middlewares/isAuth";
const router = Router();

router.use("/user", userRoutes);
// Public (is_public gated) + token-gated download routes: no auth middleware.
router.use("/public/video", publicVideoRoutes);
router.use("/download", downloadRoutes);

router.use("/upload", isAuth, uploadRoutes);
router.use("/video", isAuth, videoRoutes);

export default router;
