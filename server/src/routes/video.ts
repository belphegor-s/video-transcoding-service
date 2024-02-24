import { Router } from "express";
import { userVideoController, userVideosController } from "../controllers/video";
const router = Router();

router.get("/user-videos", userVideosController);
router.get("/user-video", userVideoController);

export default router;
