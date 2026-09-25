import { NextFunction, Request, Response } from "express";
import { isAdmin as isAdminEmail } from "../utils/account";

/**
 * Runs after isAuth. Admin access is web-session only: API keys never reach the
 * admin console, so a leaked key can't be used to read other users' data.
 */
export default function isAdmin(req: Request, res: Response, next: NextFunction) {
  // @ts-ignore
  if (req.authVia !== "jwt" || !isAdminEmail(req.email)) {
    return res.status(403).json({ error: { message: "Admin access required" } });
  }
  next();
}
