import { Router } from "express";
import {
  createApiKeyController,
  deleteApiKeyController,
  listApiKeysController,
  renameApiKeyController,
  rotateApiKeyController,
} from "../controllers/apiKey";
const router = Router();

router.post("/", createApiKeyController);
router.get("/", listApiKeysController);
router.patch("/:id", renameApiKeyController);
router.post("/:id/rotate", rotateApiKeyController);
router.delete("/:id", deleteApiKeyController);

export default router;
