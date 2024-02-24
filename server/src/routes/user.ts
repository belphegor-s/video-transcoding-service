import { Router } from "express";
import { createUserController, loginUserController, meController, tokenRefreshController } from "../controllers/user";
import isAuth from "../middlewares/isAuth";
const router = Router();

router.post("/create-user", createUserController);
router.post("/login-user", loginUserController);
router.post("/refresh-token", tokenRefreshController);
router.get("/me", isAuth, meController);

export default router;
