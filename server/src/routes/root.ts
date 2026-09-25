import { Router } from "express";
import userRoutes from "./user";
import uploadRoutes from "./upload";
import videoRoutes from "./video";
import publicVideoRoutes from "./public";
import downloadRoutes from "./download";
import apiKeyRoutes from "./apiKeys";
import adminRoutes from "./admin";
import isAuth from "../middlewares/isAuth";
import isAdmin from "../middlewares/isAdmin";
const router = Router();

router.use("/user", userRoutes);
// Public (is_public gated) + token-gated download routes: no auth middleware.
router.use("/public/video", publicVideoRoutes);
router.use("/download", downloadRoutes);

router.use("/upload", isAuth, uploadRoutes);
router.use("/video", isAuth, videoRoutes);
router.use("/api-keys", isAuth, apiKeyRoutes);
router.use("/admin", isAuth, isAdmin, adminRoutes);

export default router;
