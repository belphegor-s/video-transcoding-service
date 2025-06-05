import { Request, Response } from "express";
import Video from "../models/Video";
import { z } from "zod";
import { getSignedCloudFrontUrl } from "../utils/getSignedCloudFrontUrl";
import url from "url";
import path from "path";

export const userVideosController = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const videos = await Video.findAll({ where: { user_id: req?.userId } });

    return res.json({ data: videos });
  } catch (e: any) {
    console.error("Error occurred in userVideosController() -> ", e);

    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const userVideoSchema = z.object({
  s3_key: z.string().max(1000),
});

export const userVideoController = async (req: Request, res: Response) => {
  try {
    const { s3_key } = userVideoSchema.parse(req.query);
    const video = await Video.findOne({ where: { s3_key: s3_key } });

    return res.json({ data: video });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      const errorMessage = e.errors.map((err) => err.message).join("; ");
      return res.status(400).json({ error: { message: errorMessage } });
    }

    console.error("Error occurred in userVideoController() -> ", e);

    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};

const streamVideoSchema = z.object({
  video_id: z.string().uuid({ message: "Invalid video_id" }),
});

export const streamVideoController = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.userId;

  const parseResult = streamVideoSchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten().fieldErrors });
  }

  const { video_id, path: resourcePath } = req.query;

  try {
    const video = await Video.findOne({
      where: { video_id: video_id as string, user_id: userId, status: "transcoded" },
    });

    if (!video) {
      return res.status(403).json({ error: "Access denied" });
    }

    const masterPlaylistUrl = video.master_playlist_url!;

    const requestedPath = resourcePath ? (resourcePath as string) : masterPlaylistUrl;

    const ext = path.extname(requestedPath).toLowerCase();

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers.host;

    if (ext === ".m3u8") {
      const signedUrl = getSignedCloudFrontUrl(requestedPath);

      const response = await fetch(signedUrl);
      if (!response.ok) {
        return res.status(500).json({ error: "Failed to fetch playlist" });
      }

      const playlistText = await response.text();

      const playlistBasePath = requestedPath.substring(0, requestedPath.lastIndexOf("/") + 1);

      const lines = playlistText.split("\n");
      const rewrittenLines = lines.map((line) => {
        line = line.trim();
        if (line === "" || line.startsWith("#")) {
          return line;
        }

        let absolutePath = url.resolve(playlistBasePath, line);

        return `${protocol}://${host}/api/v1/video/stream?video_id=${video_id}&path=${encodeURIComponent(absolutePath)}`;
      });

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.send(rewrittenLines.join("\n"));
    } else if ([".ts", ".aac", ".mp4"].includes(ext)) {
      const signedUrl = getSignedCloudFrontUrl(requestedPath);
      return res.redirect(signedUrl);
    } else {
      return res.status(400).json({ error: "Unsupported resource type" });
    }
  } catch (err) {
    console.error("Stream auth error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
