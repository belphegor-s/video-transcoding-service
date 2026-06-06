import { Router } from "express";
import {
  downloadTokenController,
  foldersController,
  renameVideoController,
  setFolderController,
  setVisibilityController,
  streamVideoController,
  thumbnailController,
  transcriptionController,
  userVideoController,
  userVideosController,
  videoByIdController,
} from "../controllers/video";
const router = Router();

router.get("/user-videos", userVideosController);
router.get("/user-video", userVideoController);
router.get("/by-id", videoByIdController);
router.get("/folders", foldersController);
router.get("/stream", streamVideoController);
router.get("/thumbnail", thumbnailController);
router.get("/transcription", transcriptionController);
router.get("/download-token", downloadTokenController);
router.patch("/visibility", setVisibilityController);
router.patch("/rename", renameVideoController);
router.patch("/folder", setFolderController);

export default router;
