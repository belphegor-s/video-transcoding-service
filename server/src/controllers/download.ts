import { Request, Response } from "express";
import jwt, { Secret } from "jsonwebtoken";
import fs from "fs";
import fsp from "fs/promises";
// archiver's shipped types expose only classes, not the callable factory; type the require.
const createArchiver = require("archiver") as (
  format: string,
  options?: import("archiver").ArchiverOptions,
) => import("archiver").Archiver;
import { Op } from "sequelize";
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

// Download a whole folder (recursively): one MP4 per video, zipped with the
// nested folder structure preserved.
export const folderDownloadController = async (req: Request, res: Response) => {
  const token = req.query.token as string;
  const folderPath = ((req.query.path as string) || "").trim().replace(/\/+$/, "");
  let claims: { userId: string; purpose: string };
  try {
    claims = jwt.verify(token, env.JWT_ACCESS_TOKEN_SECRET as Secret) as { userId: string; purpose: string };
  } catch {
    return res.status(403).json({ error: { message: "Invalid or expired download link" } });
  }
  if (claims.purpose !== "bulk-download") return res.status(403).json({ error: { message: "Invalid download link" } });
  if (!folderPath) return res.status(400).json({ error: { message: "Folder is required" } });

  const videos = await Video.findAll({
    where: {
      user_id: claims.userId,
      status: "transcoded",
      [Op.or]: [{ folder: folderPath }, { folder: { [Op.like]: `${folderPath}/%` } }],
    },
    limit: 200,
  });
  if (videos.length === 0) return res.status(404).json({ error: { message: "No videos in this folder" } });

  const dirs: string[] = [];
  const cleanup = () => Promise.all(dirs.map((d) => fsp.rm(d, { recursive: true, force: true }).catch(() => {})));

  try {
    const used = new Map<string, number>();
    const files: { path: string; name: string }[] = [];
    for (const v of videos) {
      const top = parseQualities(v)[0];
      if (!top) continue;
      const out = await remuxRenditionToMp4(top.key);
      dirs.push(out.dir);
      // preserve relative subfolder path inside the zip
      const rel = v.folder && v.folder !== folderPath ? v.folder.slice(folderPath.length + 1) + "/" : "";
      let name = `${rel}${downloadBaseName(v)}_${top.label}.mp4`;
      const n = used.get(name) ?? 0;
      used.set(name, n + 1);
      if (n > 0) name = name.replace(/\.mp4$/, ` (${n + 1}).mp4`);
      files.push({ path: out.file, name });
    }
    if (files.length === 0) return res.status(404).json({ error: { message: "Nothing to download" } });

    let total = 0;
    for (const f of files) total += (await fsp.stat(f.path)).size;

    const zipName = (folderPath.split("/").pop() || "folder").replace(/[^a-zA-Z0-9-_]+/g, "_");
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipName}.zip"`);
    res.setHeader("X-Total-Bytes", String(total));

    const archive = createArchiver("zip", { zlib: { level: 0 } });
    archive.on("error", (err: Error) => {
      console.error("folder archive error ->", err);
      if (!res.headersSent) res.status(500).end();
    });
    res.on("close", cleanup);
    archive.on("end", cleanup);
    archive.pipe(res);
    for (const f of files) archive.file(f.path, { name: f.name });
    await archive.finalize();
  } catch (e: any) {
    await cleanup();
    console.error("folderDownloadController ->", e);
    if (!res.headersSent) res.status(500).json({ error: { message: "Failed to prepare download" } });
  }
};

// Bulk download: one MP4 (highest quality) per selected video, zipped + streamed.
export const bulkDownloadController = async (req: Request, res: Response) => {
  const token = req.query.token as string;
  const idsParam = (req.query.ids as string) || "";
  let claims: { userId: string; purpose: string };
  try {
    claims = jwt.verify(token, env.JWT_ACCESS_TOKEN_SECRET as Secret) as { userId: string; purpose: string };
  } catch {
    return res.status(403).json({ error: { message: "Invalid or expired download link" } });
  }
  if (claims.purpose !== "bulk-download") return res.status(403).json({ error: { message: "Invalid download link" } });

  const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 100);
  if (ids.length === 0) return res.status(400).json({ error: { message: "No videos selected" } });

  const videos = await Video.findAll({
    where: { user_id: claims.userId, video_id: { [Op.in]: ids }, status: "transcoded" },
  });
  if (videos.length === 0) return res.status(404).json({ error: { message: "Nothing to download" } });

  const dirs: string[] = [];
  const cleanup = () => Promise.all(dirs.map((d) => fsp.rm(d, { recursive: true, force: true }).catch(() => {})));

  try {
    // Remux each video's top rendition to a temp mp4 (bounded by the 100 cap).
    const used = new Map<string, number>();
    const files: { path: string; name: string }[] = [];
    for (const v of videos) {
      const top = parseQualities(v)[0];
      if (!top) continue;
      const out = await remuxRenditionToMp4(top.key);
      dirs.push(out.dir);
      let name = `${downloadBaseName(v)}_${top.label}.mp4`;
      const n = used.get(name) ?? 0;
      used.set(name, n + 1);
      if (n > 0) name = name.replace(/\.mp4$/, ` (${n + 1}).mp4`);
      files.push({ path: out.file, name });
    }
    if (files.length === 0) return res.status(404).json({ error: { message: "Nothing to download" } });

    // Approx total (store-mode zip ≈ sum of file sizes) so the client can show a
    // real progress %.
    let total = 0;
    for (const f of files) total += (await fsp.stat(f.path)).size;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="videos_${files.length}.zip"`);
    res.setHeader("X-Total-Bytes", String(total));

    const archive = createArchiver("zip", { zlib: { level: 0 } });
    archive.on("error", (err: Error) => {
      console.error("bulk archive error ->", err);
      if (!res.headersSent) res.status(500).end();
    });
    res.on("close", cleanup);
    archive.on("end", cleanup);

    archive.pipe(res);
    for (const f of files) archive.file(f.path, { name: f.name });
    await archive.finalize();
  } catch (e: any) {
    await cleanup();
    console.error("bulkDownloadController ->", e);
    if (!res.headersSent) res.status(500).json({ error: { message: "Failed to prepare download" } });
  }
};
