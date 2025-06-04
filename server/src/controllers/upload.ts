import "dotenv/config";
import { Request, Response } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { getPresignedUrl } from "../utils/getPresignedUrl";
import Video from "../models/Video";
import { createClient } from "redis";

const client = createClient({
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: 17534,
  },
});

const getQueueSize = async (userId: string) => {
  const objectKeys = await client.hKeys(userId);
  return objectKeys.length;
};

const allowedVideoTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-flv"];

const uploadVideosSchema = z.object({
  fileType: z
    .string({
      required_error: "fileType is required",
      invalid_type_error: "fileType must be a string",
    })
    .refine((value) => allowedVideoTypes.includes(value), {
      message: `Invalid file type. Allowed types are: ${allowedVideoTypes.join(", ")}`,
    }),
});

export const uploadVideosController = async (req: Request, res: Response) => {
  try {
    const { fileType } = uploadVideosSchema.parse(req.query);

    // @ts-ignore
    const userId = req.userId;

    const queueSize = await getQueueSize(userId);

    if (queueSize >= 5) {
      return res.status(400).json({ error: { message: "Queue limit reached for userId" } });
    }

    const id = `uploads/${userId}/video-${uuid()}`;
    const url = await getPresignedUrl(id, fileType, userId);

    await Video.create({
      video_id: uuid(),
      user_id: userId,
      s3_key: id,
      mime_type: fileType,
      status: "signed_url_generated",
    });

    return res.json({ data: url });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      const errorMessage = e.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
      return res.status(400).json({ error: { message: errorMessage } });
    }

    console.error("Error occurred in uploadVideosController() -> ", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};
