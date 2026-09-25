import { Router } from "express";
import { listUsersController, overviewController, storageController, updateUserController, userDetailController } from "../controllers/admin";
const router = Router();

router.get("/overview", overviewController);
router.get("/storage", storageController);
router.get("/users", listUsersController);
router.get("/users/:id", userDetailController);
router.patch("/users/:id", updateUserController);

export default router;
