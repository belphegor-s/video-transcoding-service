import { Request, Response } from "express";
import jwt, { Secret } from "jsonwebtoken";
import fs from "fs";
import fsp from "fs/promises";
// archiver's shipped types expose only classes, not the callable factory; type the require.
const createArchiver = require("archiver") as (
  format: string,
  options?: import("archiver").ArchiverOptions,
) => import("archiver").Archiver;
import Video from "../models/Video";
import { downloadBaseName, parseQualities, remuxRenditionToMp4 } from "../utils/media";
import { env } from "../config/env";

interface DownloadClaims {
  userId: string;
  video_id: string;
  purpose: string;
}

/** Resolve a transcoded video the caller owns, from the ?token + ?video_id pair. */
async function resolveFromToken(req: Request): Promise<Video | null> {
  const token = req.query.token as string;
  const video_id = req.query.video_id as string;
  if (!token || !video_id) return null;

  let claims: DownloadClaims;
  try {
    claims = jwt.verify(token, env.JWT_ACCESS_TOKEN_SECRET as Secret) as DownloadClaims;
  } catch {
    return null;
  }
  if (claims.purpose !== "download" || claims.video_id !== video_id) return null;

  return Video.findOne({ where: { video_id, user_id: claims.userId, status: "transcoded" } });
}

export const downloadVideoController = async (req: Request, res: Response) => {
  const video = await resolveFromToken(req);
  if (!video) return res.status(403).json({ error: { message: "Invalid or expired download link" } });

  const quality = (req.query.quality as string) || "";
  const match = parseQualities(video).find((q) => q.label === quality);
  if (!match) return res.status(404).json({ error: { message: "Quality not available" } });

  let dir: string | null = null;
  try {
    const out = await remuxRenditionToMp4(match.key);
    dir = out.dir;
    const stat = await fsp.stat(out.file);
    const filename = `${downloadBaseName(video)}_${match.label}.mp4`;

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const stream = fs.createReadStream(out.file);
    stream.pipe(res);
    const cleanup = () => dir && fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    stream.on("close", cleanup);
    res.on("close", cleanup);
  } catch (e: any) {
    if (dir) await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    console.error("downloadVideoController ->", e);
    if (!res.headersSent) res.status(500).json({ error: { message: "Failed to prepare download" } });
  }
};

export const downloadAllController = async (req: Request, res: Response) => {
  const video = await resolveFromToken(req);
  if (!video) return res.status(403).json({ error: { message: "Invalid or expired download link" } });

  const qualities = parseQualities(video);
  if (qualities.length === 0) return res.status(404).json({ error: { message: "Nothing to download" } });

  const dirs: string[] = [];
  const cleanup = () => Promise.all(dirs.map((d) => fsp.rm(d, { recursive: true, force: true }).catch(() => {})));

  try {
    // Remux every rendition to a temp mp4 first (bounded by the 5-video / 1GB caps).
    const files: { path: string; name: string }[] = [];
    const base = downloadBaseName(video);
    for (const q of qualities) {
      const out = await remuxRenditionToMp4(q.key);
      dirs.push(out.dir);
      files.push({ path: out.file, name: `${base}_${q.label}.mp4` });
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${base}_all-qualities.zip"`);

    const archive = createArchiver("zip", { zlib: { level: 0 } }); // store: mp4 already compressed
    archive.on("error", (err: Error) => {
      console.error("archive error ->", err);
      if (!res.headersSent) res.status(500).end();
    });
    res.on("close", cleanup);
    archive.on("end", cleanup);

    archive.pipe(res);
    for (const f of files) archive.file(f.path, { name: f.name });
    await archive.finalize();
  } catch (e: any) {
    await cleanup();
    console.error("downloadAllController ->", e);
    if (!res.headersSent) res.status(500).json({ error: { message: "Failed to prepare download" } });
  }
};
