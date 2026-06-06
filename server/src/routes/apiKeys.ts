import { Router } from "express";
import {
  createApiKeyController,
  listApiKeysController,
  revokeApiKeyController,
  rotateApiKeyController,
} from "../controllers/apiKey";
const router = Router();

router.post("/", createApiKeyController);
router.get("/", listApiKeysController);
router.post("/:id/rotate", rotateApiKeyController);
router.delete("/:id", revokeApiKeyController);

export default router;
