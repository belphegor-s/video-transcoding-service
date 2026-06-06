import { Request, Response } from "express";
import { z } from "zod";
import Video from "../models/Video";
import { streamHls } from "../utils/streamHls";
import { getSignedCloudFrontUrl } from "../utils/getSignedCloudFrontUrl";
import { fetchTranscription, getOrCreateThumbnail, parseQualities } from "../utils/media";

const idQuery = z.object({ video_id: z.string().uuid({ message: "Invalid video_id" }) });

async function loadPublicVideo(video_id: string): Promise<Video | null> {
  return Video.findOne({ where: { video_id, is_public: true, status: "transcoded" } });
}

export const publicMetaController = async (req: Request, res: Response) => {
  const parsed = idQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: { message: "Invalid video_id" } });

  const video = await loadPublicVideo(parsed.data.video_id);
  if (!video) return res.status(404).json({ error: { message: "Video not found or not public" } });

  return res.json({
    data: {
      video_id: video.video_id,
      title: video.original_filename ?? "Untitled video",
      qualities: parseQualities(video).map((q) => q.label),
      has_transcription: !!video.caption_urls && video.caption_urls !== "{}",
      created_at: video.created_at,
    },
  });
};

export const publicStreamController = async (req: Request, res: Response) => {
  const parsed = idQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });

  const video = await loadPublicVideo(parsed.data.video_id);
  if (!video) return res.status(403).json({ error: "Access denied" });

  try {
    return streamHls(video, req, res, {
      resourcePath: req.query.path as string | undefined,
      proxyPath: "/api/v1/public/video/stream",
    });
  } catch (err) {
    console.error("publicStream error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const publicThumbnailController = async (req: Request, res: Response) => {
  const parsed = idQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: { message: "Invalid video_id" } });

  const video = await loadPublicVideo(parsed.data.video_id);
  if (!video) return res.status(404).json({ error: { message: "Not found" } });

  try {
    const key = await getOrCreateThumbnail(video);
    return res.json({ data: { url: getSignedCloudFrontUrl(key) } });
  } catch (e) {
    return res.status(500).json({ error: { message: "Failed to generate thumbnail" } });
  }
};

export const publicTranscriptionController = async (req: Request, res: Response) => {
  const parsed = idQuery.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: { message: "Invalid video_id" } });

  const video = await loadPublicVideo(parsed.data.video_id);
  if (!video) return res.status(404).json({ error: { message: "Not found" } });

  return res.json({ data: await fetchTranscription(video) });
};
