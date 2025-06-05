import { Router } from "express";
import { streamVideoController, userVideoController, userVideosController } from "../controllers/video";
const router = Router();

router.get("/user-videos", userVideosController);
router.get("/user-video", userVideoController);
router.get("/stream", streamVideoController);

export default router;
