import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import jwt, { Secret } from "jsonwebtoken";
import User from "../models/User";

export default async function isAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: { message: "Not authenticated" } });
  }

  const token = authHeader.split(" ")[1] ?? "";

  let decodedToken: any;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET as Secret);
  } catch (err: any) {
    return res.status(401).json({ error: { message: "Invalid or expired token" } });
  }

  if (!decodedToken || !decodedToken.userId) {
    return res.status(401).json({ error: { message: "Not authenticated" } });
  }

  try {
    const user = await User.findOne({ where: { user_id: decodedToken.userId } });

    if (!user) {
      return res.status(401).json({ error: { message: "User not found" } });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: { message: "Email not verified" } });
    }

    // Attach user info to request
    // @ts-ignore
    req.name = user.name;
    // @ts-ignore
    req.userId = user.user_id;
    // @ts-ignore
    req.email = user.email;

    next();
  } catch (error: any) {
    console.error("Error in isAuth middleware:", error);
    return res.status(500).json({ error: { message: "Internal server error" } });
  }
}
