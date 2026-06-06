import { Request, Response } from "express";
import Video from "../models/Video";
import { z } from "zod";
import jwt, { Secret } from "jsonwebtoken";
import { streamHls } from "../utils/streamHls";
import { getSignedCloudFrontUrl } from "../utils/getSignedCloudFrontUrl";
import { fetchTranscription, getOrCreateThumbnail } from "../utils/media";

export const userVideosController = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const videos = await Video.findAll({ where: { user_id: req?.userId }, order: [["created_at", "DESC"]] });
    return res.json({ data: videos });
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
    if (is_public && video.status !== "transcoded") {
      return res.status(400).json({ error: { message: "Only transcoded videos can be made public" } });
    }
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

const videoIdQuery = z.object({ video_id: z.string().uuid() });

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

    const token = jwt.sign({ userId, video_id, purpose: "download" }, process.env.JWT_ACCESS_TOKEN_SECRET as Secret, {
      expiresIn: "10m",
    });
    return res.json({ data: { token } });
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: { message: "Invalid video_id" } });
    console.error("Error in downloadTokenController ->", e);
    return res.status(500).json({ error: { message: "Internal server error" } });
  }
};
