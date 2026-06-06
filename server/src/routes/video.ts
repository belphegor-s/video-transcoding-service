import { Router } from "express";
import {
  bulkDownloadTokenController,
  captionsController,
  createFolderController,
  deleteFolderController,
  downloadTokenController,
  foldersController,
  moveVideosController,
  renameFolderController,
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
router.post("/folders", createFolderController);
router.patch("/folders/rename", renameFolderController);
router.delete("/folders", deleteFolderController);
router.patch("/move", moveVideosController);
router.get("/stream", streamVideoController);
router.get("/thumbnail", thumbnailController);
router.get("/transcription", transcriptionController);
router.get("/captions", captionsController);
router.get("/download-token", downloadTokenController);
router.get("/bulk-download-token", bulkDownloadTokenController);
router.patch("/visibility", setVisibilityController);
router.patch("/rename", renameVideoController);
router.patch("/folder", setFolderController);

export default router;
