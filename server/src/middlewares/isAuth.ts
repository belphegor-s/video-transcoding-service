import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import jwt, { Secret } from "jsonwebtoken";

export default function isAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: { message: "Not authenticated" } });
  }

  const token = authHeader.split(" ")[1] ?? "";

  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET as Secret);
  } catch (err: any) {
    return res.status(500).json({
      error: {
        message: err.message,
      },
    });
  }

  if (!decodedToken) {
    return res.status(401).json({ error: { message: "Not authenticated" } });
  }

  // @ts-ignore
  req.userId = decodedToken.userId;
  // @ts-ignore
  req.email = decodedToken.email;

  next();
}
