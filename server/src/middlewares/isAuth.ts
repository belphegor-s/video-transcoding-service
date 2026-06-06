import "dotenv/config";
import { NextFunction, Request, Response } from "express";
import jwt, { Secret } from "jsonwebtoken";
import User from "../models/User";
import ApiKey from "../models/ApiKey";
import { hashApiKey, looksLikeApiKey } from "../utils/apiKey";

function attach(req: Request, user: User, via: "jwt" | "apikey") {
  // @ts-ignore
  req.userId = user.user_id;
  // @ts-ignore
  req.email = user.email;
  // @ts-ignore
  req.name = user.name;
  // @ts-ignore
  req.authVia = via;
}

/**
 * Authenticates a request via either a JWT access token (web app) or an
 * API key (programmatic clients). API keys are accepted as `x-api-key: vtk_…`
 * or `Authorization: Bearer vtk_…`.
 */
export default async function isAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const apiKeyHeader = req.headers["x-api-key"] as string | undefined;
  const bearer = authHeader ? authHeader.split(" ")[1] ?? "" : "";
  const apiKey = apiKeyHeader || (bearer && looksLikeApiKey(bearer) ? bearer : "");

  // ---- API key path ----
  if (apiKey) {
    try {
      const record = await ApiKey.findOne({ where: { key_hash: hashApiKey(apiKey) } });
      if (!record || record.revoked) {
        return res.status(401).json({ error: { message: "Invalid API key" } });
      }
      if (record.expires_at && record.expires_at.getTime() < Date.now()) {
        return res.status(401).json({ error: { message: "API key expired" } });
      }
      const user = await User.findOne({ where: { user_id: record.user_id } });
      if (!user) return res.status(401).json({ error: { message: "Invalid API key" } });
      if (!user.is_verified) return res.status(403).json({ error: { message: "Email not verified" } });

      record.update({ last_used_at: new Date() }).catch(() => {});
      attach(req, user, "apikey");
      return next();
    } catch (err) {
      console.error("API key auth error:", err);
      return res.status(500).json({ error: { message: "Internal server error" } });
    }
  }

  // ---- JWT path ----
  if (!authHeader) {
    return res.status(401).json({ error: { message: "Not authenticated" } });
  }

  let decodedToken: any;
  try {
    decodedToken = jwt.verify(bearer, process.env.JWT_ACCESS_TOKEN_SECRET as Secret);
  } catch {
    return res.status(401).json({ error: { message: "Invalid or expired token" } });
  }
  if (!decodedToken || !decodedToken.userId) {
    return res.status(401).json({ error: { message: "Not authenticated" } });
  }

  try {
    const user = await User.findOne({ where: { user_id: decodedToken.userId } });
    if (!user) return res.status(401).json({ error: { message: "User not found" } });
    if (!user.is_verified) return res.status(403).json({ error: { message: "Email not verified" } });

    attach(req, user, "jwt");
    next();
  } catch (error) {
    console.error("Error in isAuth middleware:", error);
    return res.status(500).json({ error: { message: "Internal server error" } });
  }
}
