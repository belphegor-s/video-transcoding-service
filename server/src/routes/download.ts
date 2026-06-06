import { Router } from "express";
import { bulkDownloadController, downloadAllController, downloadVideoController, folderDownloadController } from "../controllers/download";
const router = Router();

// Token-gated (not behind isAuth) so the browser can stream via a plain URL.
router.get("/video", downloadVideoController);
router.get("/all", downloadAllController);
router.get("/bulk", bulkDownloadController);
router.get("/folder", folderDownloadController);

export default router;
