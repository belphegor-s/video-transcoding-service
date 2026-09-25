import { DeleteObjectsCommand, ListObjectsV2Command, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { Op, QueryTypes } from "sequelize";
import s3 from "./s3";
import { getRedisClient } from "./redisClient";
import sequelize from "../db/sequelize";
import Video from "../models/Video";
import User from "../models/User";
import { getBasePrefix } from "../utils/media";
import { env } from "../config/env";

/** Statuses that occupy a free-plan slot. */
export const COUNTED_STATUSES = ["uploaded", "transcoding", "transcoded"] as const;

// The presigned upload POST stays valid for 1h. Deleting the row inside that
// window would let the upload land anyway and trigger an untracked transcode.
const UPLOAD_WINDOW_MS = 65 * 60 * 1000;
// A queued/running transcode would keep writing renditions after we purge.
// Past this it is treated as stuck and may be removed.
const TRANSCODE_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Why a video can't be deleted right now, or null if it can. */
export function deleteBlockReason(video: Video, now = Date.now()): string | null {
  const age = now - new Date(video.created_at).getTime();
  if (video.status === "signed_url_generated" && age < UPLOAD_WINDOW_MS) {
    return "Upload still in progress. Try again in about an hour if it never finishes.";
  }
  if ((video.status === "uploaded" || video.status === "transcoding") && age < TRANSCODE_WINDOW_MS) {
    return "Still processing. You can delete it once transcoding finishes.";
  }
  return null;
}

/** Lifetime slot usage: live counted videos plus ones already deleted. */
export async function getLifetimeUsage(userId: string): Promise<number> {
  const [live, user] = await Promise.all([
    Video.count({ where: { user_id: userId, status: { [Op.in]: [...COUNTED_STATUSES] } } }),
    User.findOne({ where: { user_id: userId }, attributes: ["deleted_videos"] }),
  ]);
  return live + (user?.deleted_videos ?? 0);
}

async function listKeys(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({ Bucket: env.S3_BUCKET_NAME, Prefix: prefix, ContinuationToken: token }),
    );
    for (const o of page.Contents ?? []) if (o.Key) keys.push(o.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

async function deleteKeys(keys: string[]) {
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const out = await s3.send(
      new DeleteObjectsCommand({
        Bucket: env.S3_BUCKET_NAME,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    if (out.Errors?.length) {
      const e = out.Errors[0];
      throw new Error(`S3 delete failed for ${out.Errors.length} object(s): ${e.Key} ${e.Code} ${e.Message}`);
    }
  }
}

/** Remove every stored object for a video: source upload plus renditions/captions/thumbnail. */
async function purgeStorage(video: Video) {
  const base = getBasePrefix(video);
  // Never list with a prefix that could match other videos or users.
  if (!base.startsWith(`${video.user_id}/`) || base.length <= video.user_id.length + 1) {
    throw new Error(`Refusing to purge unexpected prefix "${base}"`);
  }
  if (!video.s3_key.startsWith(`uploads/${video.user_id}/`)) {
    throw new Error(`Refusing to purge unexpected source key "${video.s3_key}"`);
  }
  const keys = [video.s3_key, ...(await listKeys(`${base}/`))];
  await deleteKeys(keys);
}

async function purgeRedis(video: Video) {
  try {
    const redis = await getRedisClient();
    await Promise.all([redis.del(`renditions:${video.s3_key}`), redis.hDel(video.user_id, video.s3_key)]);
  } catch (e) {
    // Only progress/queue bookkeeping lives here; never block a delete on it.
    console.error("purgeRedis ->", e);
  }
}

/**
 * Permanently delete the given videos (already ownership-checked and allowed by
 * `deleteBlockReason`). Storage goes first so a failure leaves the row in place
 * and the delete can simply be retried; S3 deletes are idempotent.
 */
export async function deleteVideos(userId: string, videos: Video[]) {
  if (videos.length === 0) return;
  for (const v of videos) await purgeStorage(v);
  await Promise.all(videos.map(purgeRedis));

  await sequelize.transaction(async (transaction) => {
    // Count from what this call actually removed, so concurrent deletes of the
    // same video can't bump the counter twice.
    const removed = await sequelize.query<{ status: string }>(
      `DELETE FROM "Videos" WHERE user_id = :userId AND video_id IN (:ids) RETURNING status`,
      { replacements: { userId, ids: videos.map((v) => v.video_id) }, type: QueryTypes.SELECT, transaction },
    );
    const counted = removed.filter((r) => (COUNTED_STATUSES as readonly string[]).includes(r.status)).length;
    if (counted > 0) await User.increment("deleted_videos", { by: counted, where: { user_id: userId }, transaction });
  });
}
