import { Router } from "express";
import {
  publicMetaController,
  publicStreamController,
  publicThumbnailController,
  publicTranscriptionController,
} from "../controllers/public";
const router = Router();

// All routes are gated on is_public inside the controllers (no auth).
router.get("/meta", publicMetaController);
router.get("/stream", publicStreamController);
router.get("/thumbnail", publicThumbnailController);
router.get("/transcription", publicTranscriptionController);

export default router;
