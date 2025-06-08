import { Router } from "express";
import { createUserController, loginUserController, meController, requestResetPassword, resetPassword, tokenRefreshController, verifyEmailController } from "../controllers/user";
import isAuth from "../middlewares/isAuth";
const router = Router();

router.post("/create-user", createUserController);
router.post("/login-user", loginUserController);
router.post("/refresh-token", tokenRefreshController);
router.get("/me", isAuth, meController);
router.post("/request-reset-password", requestResetPassword);
router.post("/reset-password", resetPassword);
router.get("/verify-email", verifyEmailController);

export default router;
