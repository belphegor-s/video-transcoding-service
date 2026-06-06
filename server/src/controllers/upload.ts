import { Request, Response } from "express";
import { z } from "zod";
import { Op } from "sequelize";
import { v4 as uuid } from "uuid";
import { getPresignedUrl } from "../utils/getPresignedUrl";
import Video from "../models/Video";
import { FREE_MAX_FILE_BYTES, UNLIMITED_MAX_FILE_BYTES, isUnlimited } from "../utils/account";

// Lifetime cap: a user may keep at most this many real (uploaded+) videos.
export const LIFETIME_VIDEO_LIMIT = 5;
const COUNTED_STATUSES = ["uploaded", "transcoding", "transcoded"];

const getLifetimeCount = (userId: string) =>
  Video.count({ where: { user_id: userId, status: { [Op.in]: COUNTED_STATUSES } } });

const allowedVideoTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/x-flv", "video/webm"];

const uploadVideosSchema = z.object({
  fileType: z
    .string({ required_error: "fileType is required", invalid_type_error: "fileType must be a string" })
    .refine((value) => allowedVideoTypes.includes(value), {
      message: `Invalid file type. Allowed types are: ${allowedVideoTypes.join(", ")}`,
    }),
  fileName: z.string().max(512).optional(),
});

export const uploadVideosController = async (req: Request, res: Response) => {
  try {
    const { fileType, fileName } = uploadVideosSchema.parse(req.query);

    // @ts-ignore
    const userId = req.userId;
    // @ts-ignore
    const unlimited = isUnlimited(req.email);

    if (!unlimited) {
      const count = await getLifetimeCount(userId);
      if (count >= LIFETIME_VIDEO_LIMIT) {
        return res.status(403).json({
          error: {
            code: "LIMIT_REACHED",
            message: `You've reached the free limit of ${LIFETIME_VIDEO_LIMIT} videos. Contact hello@ayushsharma.me for higher limits or on-prem deployment.`,
          },
        });
      }
    }

    const id = `uploads/${userId}/video-${uuid()}`;
    const maxBytes = unlimited ? UNLIMITED_MAX_FILE_BYTES : FREE_MAX_FILE_BYTES;
    const url = await getPresignedUrl(id, fileType, userId, maxBytes);

    const videoId = uuid();
    await Video.create({
      video_id: videoId,
      user_id: userId,
      s3_key: id,
      original_filename: fileName ?? null,
      mime_type: fileType,
      status: "signed_url_generated",
    });

    // `url` is the presigned POST ({ url, fields }); also return the video_id +
    // s3_key so programmatic clients can reference the video immediately.
    return res.json({ data: { ...url, video_id: videoId, s3_key: id } });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      const errorMessage = e.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");
      return res.status(400).json({ error: { message: errorMessage } });
    }

    console.error("Error occurred in uploadVideosController() -> ", e);
    return res.status(500).json({ error: { message: e?.message ?? "Internal server error!" } });
  }
};
