import { Router } from "express";
import { createApiKeyController, listApiKeysController, revokeApiKeyController } from "../controllers/apiKey";
const router = Router();

router.post("/", createApiKeyController);
router.get("/", listApiKeysController);
router.delete("/:id", revokeApiKeyController);

export default router;
