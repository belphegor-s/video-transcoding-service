import { Router } from "express";
import { uploadVideosController } from "../controllers/upload";
const router = Router();

router.get("/upload-videos", uploadVideosController);

export default router;
