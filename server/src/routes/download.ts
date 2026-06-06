import { Router } from "express";
import { downloadAllController, downloadVideoController } from "../controllers/download";
const router = Router();

// Token-gated (not behind isAuth) so the browser can stream via a plain URL.
router.get("/video", downloadVideoController);
router.get("/all", downloadAllController);

export default router;
