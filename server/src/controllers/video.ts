import { Request, Response } from "express";
import Video from "../models/Video";
import Folder from "../models/Folder";
import { z } from "zod";
import { Op } from "sequelize";
import { v4 as uuid } from "uuid";

/** Normalize a (possibly nested) folder path: trim segments, drop empties. */
function normalizeFolderPath(input: string): string {
  return input
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("/");
}

/** All ancestor paths inclusive: "A/B/C" -> ["A","A/B","A/B/C"]. */
function ancestorPaths(path: string): string[] {
  const segs = path.split("/");
  const out: string[] = [];
  let cur = "";
  for (const s of segs) {
    cur = cur ? `${cur}/${s}` : s;
    out.push(cur);
  }
  return out;
}

async function ensureFolderPath(userId: string, path: string) {
  for (const p of ancestorPaths(path)) {
    await Folder.findOrCreate({ where: { user_id: userId, path: p }, defaults: { folder_id: uuid(), user_id: userId, path: p } });
  }
}
import jwt, { Secret } from "jsonwebtoken";
import { streamHls } from "../utils/streamHls";
import { getSignedCloudFrontUrl } from "../utils/getSignedCloudFrontUrl";
import { fetchTranscription, getOrCreateThumbnail } from "../utils/media";
import { env } from "../config/env";

export const userVideosController = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 12, 1), 50);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const q = ((req.query.q as string) || "").trim();
    const folder = (req.query.folder as string) || "";

    // @ts-ignore
    const where: Record<string, unknown> = { user_id: req?.userId };
    if (q) where.original_filename = { [Op.iLike]: `%${q}%` };
    if (folder === "uncategorized") where.folder = { [Op.is]: null };
    else if (folder) where.folder = folder;

    const { rows, count } = await Video.findAndCountAll({ where, order: [["created_at", "DESC"]], limit, offset });
    return res.json({ data: { items: rows, total: count, limit, offset } });
  } catch (e: any) {
    console.error("Error occurred in userVideosController() -> ", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const userVideoSchema = z.object({ s3_key: z.string().max(1000) });

export const userVideoController = async (req: Request, res: Response) => {
  try {
    const { s3_key } = userVideoSchema.parse(req.query);
    const video = await Video.findOne({ where: { s3_key } });
    return res.json({ data: video });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: { message: e.errors.map((x) => x.message).join("; ") } });
    }
    console.error("Error occurred in userVideoController() -> ", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const streamVideoSchema = z.object({ video_id: z.string().uuid({ message: "Invalid video_id" }) });

export const streamVideoController = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.userId;
  const parseResult = streamVideoSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten().fieldErrors });
  }
  const { video_id, path: resourcePath } = req.query;

  try {
    const video = await Video.findOne({ where: { video_id: video_id as string, user_id: userId, status: "transcoded" } });
    if (!video) return res.status(403).json({ error: "Access denied" });
    return streamHls(video, req, res, { resourcePath: resourcePath as string | undefined, proxyPath: "/api/v1/video/stream" });
  } catch (err) {
    console.error("Stream error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const visibilitySchema = z.object({
  video_id: z.string().uuid(),
  is_public: z.boolean(),
});

export const setVisibilityController = async (req: Request, res: Response) => {
  try {
    const { video_id, is_public } = visibilitySchema.parse(req.body);
    // @ts-ignore
    const video = await Video.findOne({ where: { video_id, user_id: req.userId } });
    if (!video) return res.status(404).json({ error: { message: "Video not found" } });
    // Allowed before transcoding completes; the public stream still only serves
    // once status is "transcoded", so this just pre-marks intent.
    await video.update({ is_public });
    return res.json({ data: { video_id, is_public } });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: { message: e.errors.map((x) => x.message).join("; ") } });
    }
    console.error("Error in setVisibilityController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const renameSchema = z.object({
  video_id: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(512, "Name too long"),
});

export const renameVideoController = async (req: Request, res: Response) => {
  try {
    const { video_id, name } = renameSchema.parse(req.body);
    // @ts-ignore
    const video = await Video.findOne({ where: { video_id, user_id: req.userId } });
    if (!video) return res.status(404).json({ error: { message: "Video not found" } });
    await video.update({ original_filename: name });
    return res.json({ data: { video_id, original_filename: name } });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: { message: e.errors.map((x) => x.message).join("; ") } });
    }
    console.error("renameVideoController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

export const foldersController = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;
    const [folderRows, videoRows] = await Promise.all([
      Folder.findAll({ where: { user_id: userId }, attributes: ["path"] }),
      Video.findAll({ where: { user_id: userId, folder: { [Op.ne]: null } }, attributes: ["folder"], group: ["folder"] }),
    ]);
    const set = new Set<string>();
    folderRows.forEach((r) => r.path && set.add(r.path));
    videoRows.forEach((r) => r.folder && set.add(r.folder));
    const folders = [...set].sort((a, b) => a.localeCompare(b));
    return res.json({ data: folders });
  } catch (e: any) {
    console.error("foldersController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const createFolderSchema = z.object({ path: z.string().min(1).max(500) });

export const createFolderController = async (req: Request, res: Response) => {
  try {
    const { path } = createFolderSchema.parse(req.body);
    const norm = normalizeFolderPath(path);
    if (!norm) return res.status(400).json({ error: { message: "Folder name is required" } });
    if (norm.split("/").some((s) => s.length > 200)) {
      return res.status(400).json({ error: { message: "Each folder name must be 200 characters or fewer" } });
    }
    if (norm.split("/").length > 10) {
      return res.status(400).json({ error: { message: "Folders can be nested up to 10 levels" } });
    }
    // @ts-ignore
    await ensureFolderPath(req.userId, norm);
    return res.status(201).json({ data: { path: norm } });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: { message: e.errors.map((x) => x.message).join("; ") } });
    console.error("createFolderController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const moveVideosSchema = z.object({
  video_ids: z.array(z.string().uuid()).min(1).max(100),
  folder: z.string().max(500).nullable().optional(),
});

export const moveVideosController = async (req: Request, res: Response) => {
  try {
    const { video_ids, folder } = moveVideosSchema.parse(req.body);
    const norm = folder ? normalizeFolderPath(folder) : null;
    // @ts-ignore
    const userId = req.userId;
    if (norm) await ensureFolderPath(userId, norm);
    const [count] = await Video.update(
      { folder: norm },
      { where: { user_id: userId, video_id: { [Op.in]: video_ids } } },
    );
    return res.json({ data: { moved: count, folder: norm } });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: { message: e.errors.map((x) => x.message).join("; ") } });
    console.error("moveVideosController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const setFolderSchema = z.object({
  video_id: z.string().uuid(),
  folder: z.string().trim().max(200).nullable().optional(),
});

export const setFolderController = async (req: Request, res: Response) => {
  try {
    const { video_id, folder } = setFolderSchema.parse(req.body);
    // @ts-ignore
    const video = await Video.findOne({ where: { video_id, user_id: req.userId } });
    if (!video) return res.status(404).json({ error: { message: "Video not found" } });
    const value = folder && folder.trim() ? folder.trim() : null;
    await video.update({ folder: value });
    return res.json({ data: { video_id, folder: value } });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({ error: { message: e.errors.map((x) => x.message).join("; ") } });
    }
    console.error("setFolderController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const videoIdQuery = z.object({ video_id: z.string().uuid() });

export const videoByIdController = async (req: Request, res: Response) => {
  try {
    const { video_id } = videoIdQuery.parse(req.query);
    // @ts-ignore
    const video = await Video.findOne({ where: { video_id, user_id: req.userId } });
    if (!video) return res.status(404).json({ error: { message: "Video not found" } });
    return res.json({ data: video });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: { message: "Invalid video_id" } });
    console.error("videoByIdController ->", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

export const thumbnailController = async (req: Request, res: Response) => {
  try {
    const { video_id } = videoIdQuery.parse(req.query);
    // @ts-ignore
    const video = await Video.findOne({ where: { video_id, user_id: req.userId } });
    if (!video || video.status !== "transcoded") {
      return res.status(404).json({ error: { message: "Thumbnail not available" } });
    }
    const key = await getOrCreateThumbnail(video);
    return res.json({ data: { url: getSignedCloudFrontUrl(key) } });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: { message: "Invalid video_id" } });
    console.error("Error in thumbnailController ->", e);
    return res.status(500).json({ error: { message: "Failed to generate thumbnail" } });
  }
};

export const transcriptionController = async (req: Request, res: Response) => {
  try {
    const { video_id } = videoIdQuery.parse(req.query);
    // @ts-ignore
    const video = await Video.findOne({ where: { video_id, user_id: req.userId } });
    if (!video || video.status !== "transcoded") {
      return res.status(404).json({ error: { message: "Video not available" } });
    }
    return res.json({ data: await fetchTranscription(video) });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: { message: "Invalid video_id" } });
    console.error("Error in transcriptionController ->", e);
    return res.status(500).json({ error: { message: "Failed to load transcription" } });
  }
};

// Short-lived token so the browser can stream a download via a plain URL
// (no Authorization header on <a download>/navigation).
export const downloadTokenController = async (req: Request, res: Response) => {
  try {
    const { video_id } = videoIdQuery.parse(req.query);
    // @ts-ignore
    const userId = req.userId;
    const video = await Video.findOne({ where: { video_id, user_id: userId, status: "transcoded" } });
    if (!video) return res.status(404).json({ error: { message: "Video not available" } });

    const token = jwt.sign({ userId, video_id, purpose: "download" }, env.JWT_ACCESS_TOKEN_SECRET as Secret, {
      expiresIn: "10m",
    });
    return res.json({ data: { token } });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: { message: "Invalid video_id" } });
    console.error("Error in downloadTokenController ->", e);
    return res.status(500).json({ error: { message: "Internal server error" } });
  }
};

// Token authorizing a bulk download for the whole account (the download
// endpoint re-checks ownership of each id).
export const bulkDownloadTokenController = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.userId;
  const token = jwt.sign({ userId, purpose: "bulk-download" }, env.JWT_ACCESS_TOKEN_SECRET as Secret, { expiresIn: "15m" });
  return res.json({ data: { token } });
};
