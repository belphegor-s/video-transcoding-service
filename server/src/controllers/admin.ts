import { Request, Response } from "express";
import { z } from "zod";
import { QueryTypes } from "sequelize";
import sequelize from "../db/sequelize";
import User from "../models/User";
import Video from "../models/Video";
import ApiKey from "../models/ApiKey";
import Folder from "../models/Folder";
import { present as presentApiKey } from "./apiKey";
import { isAdmin, isUnlimited } from "../utils/account";
import { getStorageUsage, peekStorageUsage, StorageUsage } from "../lib/storageUsage";

const DAY_MS = 24 * 60 * 60 * 1000;
const RANGES = [7, 30, 90, 365] as const;

// Statuses that mean the file actually reached S3 (vs an unused presigned URL).
const LANDED = `status <> 'signed_url_generated'`;

type Row = Record<string, any>;

const num = (v: unknown) => Number(v ?? 0);

function select<T extends object = Row>(sql: string, replacements: Record<string, unknown> = {}): Promise<T[]> {
  return sequelize.query<T>(sql, { type: QueryTypes.SELECT, replacements });
}

function zodMessage(e: z.ZodError) {
  return e.errors.map((x) => `${x.path.join(".") || "input"}: ${x.message}`).join("; ");
}

function fail(res: Response, where: string, e: any) {
  if (e instanceof z.ZodError) return res.status(400).json({ error: { message: zodMessage(e) } });
  console.error(`Error occurred in ${where}() -> `, e);
  return res.status(500).json({ error: { message: "Internal server error" } });
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

function storageSummary(s: StorageUsage | null) {
  if (!s) return null;
  const { by_user, ...rest } = s;
  return { ...rest, users_with_data: Object.keys(by_user).length };
}

function userBytes(s: StorageUsage | null, userId: string) {
  const u = s?.by_user[userId];
  return u ? u.source_bytes + u.output_bytes : null;
}

/** Resolve within `ms`, or give up with null (the scan keeps running and caches). */
function withinMs<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]).catch(() => null);
}

/* -------------------------------- overview -------------------------------- */

const overviewSchema = z.object({
  days: z.coerce
    .number()
    .refine((d) => (RANGES as readonly number[]).includes(d), `days must be one of ${RANGES.join(", ")}`)
    .default(30),
});

export const overviewController = async (req: Request, res: Response) => {
  try {
    const { days } = overviewSchema.parse(req.query);

    const today = startOfUtcDay(new Date());
    const from = new Date(today.getTime() - (days - 1) * DAY_MS);
    const prevFrom = new Date(from.getTime() - days * DAY_MS);
    const range = { from, prevFrom };

    const [userTotals] = await select(
      `SELECT
         count(*) AS total,
         count(*) FILTER (WHERE is_verified) AS verified,
         count(*) FILTER (WHERE is_suspended) AS suspended,
         count(*) FILTER (WHERE created_at >= :from) AS new_in_range,
         count(*) FILTER (WHERE created_at >= :prevFrom AND created_at < :from) AS new_prev,
         count(*) FILTER (WHERE last_active_at >= now() - interval '1 day') AS active_1d,
         count(*) FILTER (WHERE last_active_at >= now() - interval '7 days') AS active_7d,
         count(*) FILTER (WHERE last_active_at >= now() - interval '30 days') AS active_30d
       FROM "Users"`,
      range,
    );

    const [videoTotals] = await select(
      `SELECT
         count(*) FILTER (WHERE ${LANDED}) AS total,
         count(*) FILTER (WHERE status = 'signed_url_generated') AS signed_url_generated,
         count(*) FILTER (WHERE status = 'uploaded') AS uploaded,
         count(*) FILTER (WHERE status = 'transcoding') AS transcoding,
         count(*) FILTER (WHERE status = 'transcoded') AS transcoded,
         count(*) FILTER (WHERE status = 'error') AS error,
         count(*) FILTER (WHERE is_public AND status = 'transcoded') AS public,
         count(*) FILTER (WHERE ${LANDED} AND created_at >= :from) AS in_range,
         count(*) FILTER (WHERE ${LANDED} AND created_at >= :prevFrom AND created_at < :from) AS prev,
         count(*) FILTER (WHERE status = 'transcoded' AND created_at >= :from) AS ready_in_range,
         count(*) FILTER (WHERE status = 'error' AND created_at >= :from) AS failed_in_range,
         count(DISTINCT user_id) FILTER (WHERE ${LANDED}) AS uploaders
       FROM "Videos"`,
      range,
    );

    const [keyTotals] = await select(
      `SELECT
         count(*) FILTER (WHERE NOT revoked AND (expires_at IS NULL OR expires_at > now())) AS active,
         count(*) FILTER (WHERE last_used_at >= now() - interval '30 days') AS used_30d
       FROM "ApiKeys"`,
    );

    const signupDays = await select<{ d: string; n: string }>(
      `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d, count(*) AS n
       FROM "Users" WHERE created_at >= :from GROUP BY 1`,
      range,
    );

    const videoDays = await select<{ d: string; status: string; n: string }>(
      `SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d, status, count(*) AS n
       FROM "Videos" WHERE created_at >= :from GROUP BY 1, 2`,
      range,
    );

    // Daily up to 90 days; weekly buckets beyond so a year stays readable.
    const step = days > 90 ? 7 : 1;
    const bucketCount = Math.ceil(days / step);
    const series = Array.from({ length: bucketCount }, (_, i) => ({
      date: isoDay(new Date(from.getTime() + i * step * DAY_MS)),
      signups: 0,
      ready: 0,
      processing: 0,
      failed: 0,
      abandoned: 0,
    }));
    const bucketOf = (d: string) => {
      const i = Math.floor((new Date(`${d}T00:00:00Z`).getTime() - from.getTime()) / (step * DAY_MS));
      return series[Math.min(Math.max(i, 0), bucketCount - 1)];
    };
    for (const r of signupDays) bucketOf(r.d).signups += num(r.n);
    for (const r of videoDays) {
      const b = bucketOf(r.d);
      const n = num(r.n);
      if (r.status === "transcoded") b.ready += n;
      else if (r.status === "error") b.failed += n;
      else if (r.status === "signed_url_generated") b.abandoned += n;
      else b.processing += n;
    }

    const mime = await select<{ mime_type: string; n: string }>(
      `SELECT mime_type, count(*) AS n FROM "Videos" WHERE ${LANDED} GROUP BY 1 ORDER BY 2 DESC`,
    );

    const topUsers = await select(
      `SELECT u.user_id, u.name, u.email, count(v.video_id) AS videos, max(v.created_at) AS last_upload_at
       FROM "Users" u JOIN "Videos" v ON v.user_id = u.user_id AND v.${LANDED}
       GROUP BY u.user_id ORDER BY videos DESC, last_upload_at DESC LIMIT 6`,
    );

    const recent = await select(
      `SELECT v.video_id, v.original_filename, v.status, v.mime_type, v.created_at, u.user_id, u.name, u.email
       FROM "Videos" v JOIN "Users" u ON u.user_id = v.user_id
       ORDER BY v.created_at DESC LIMIT 8`,
    );

    const force = req.query.refresh_storage === "1";
    // Don't hold the dashboard on a cold bucket scan; the client fetches /storage if this is null.
    const storage = await withinMs(getStorageUsage(force), force ? 25_000 : 1_500);

    const ready = num(videoTotals.transcoded);
    const failed = num(videoTotals.error);

    return res.json({
      data: {
        range: { days, from: isoDay(from), to: isoDay(today), bucket: step === 1 ? "day" : "week" },
        users: {
          total: num(userTotals.total),
          verified: num(userTotals.verified),
          suspended: num(userTotals.suspended),
          new_in_range: num(userTotals.new_in_range),
          new_prev: num(userTotals.new_prev),
          active_1d: num(userTotals.active_1d),
          active_7d: num(userTotals.active_7d),
          active_30d: num(userTotals.active_30d),
        },
        videos: {
          total: num(videoTotals.total),
          public: num(videoTotals.public),
          uploaders: num(videoTotals.uploaders),
          in_range: num(videoTotals.in_range),
          prev: num(videoTotals.prev),
          ready_in_range: num(videoTotals.ready_in_range),
          failed_in_range: num(videoTotals.failed_in_range),
          success_rate: ready + failed > 0 ? ready / (ready + failed) : null,
          by_status: {
            signed_url_generated: num(videoTotals.signed_url_generated),
            uploaded: num(videoTotals.uploaded),
            transcoding: num(videoTotals.transcoding),
            transcoded: ready,
            error: failed,
          },
        },
        api_keys: { active: num(keyTotals.active), used_30d: num(keyTotals.used_30d) },
        series,
        mime_types: mime.map((m) => ({ mime_type: m.mime_type, count: num(m.n) })),
        top_users: topUsers.map((u) => ({
          user_id: u.user_id,
          name: u.name,
          email: u.email,
          videos: num(u.videos),
          last_upload_at: u.last_upload_at,
          bytes: userBytes(storage, u.user_id),
        })),
        recent_videos: recent.map((v) => ({
          video_id: v.video_id,
          original_filename: v.original_filename,
          status: v.status,
          mime_type: v.mime_type,
          created_at: v.created_at,
          user: { user_id: v.user_id, name: v.name, email: v.email },
        })),
        storage: storageSummary(storage),
      },
    });
  } catch (e) {
    return fail(res, "overviewController", e);
  }
};

export const storageController = async (req: Request, res: Response) => {
  try {
    const usage = await getStorageUsage(req.query.refresh === "1");
    return res.json({ data: storageSummary(usage) });
  } catch (e) {
    return fail(res, "storageController", e);
  }
};

/* ---------------------------------- users --------------------------------- */

const listSchema = z.object({
  q: z.string().trim().max(200).optional().default(""),
  status: z.enum(["all", "verified", "unverified", "suspended", "active"]).default("all"),
  sort: z.enum(["newest", "oldest", "active", "videos", "name"]).default("newest"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const SORTS: Record<string, string> = {
  newest: `u.created_at DESC`,
  oldest: `u.created_at ASC`,
  active: `u.last_active_at DESC NULLS LAST, u.created_at DESC`,
  videos: `videos DESC, u.created_at DESC`,
  name: `lower(u.name) ASC`,
};

const STATUS_FILTERS: Record<string, string> = {
  all: `TRUE`,
  verified: `u.is_verified AND NOT u.is_suspended`,
  unverified: `NOT u.is_verified`,
  suspended: `u.is_suspended`,
  active: `u.last_active_at >= now() - interval '30 days'`,
};

export const listUsersController = async (req: Request, res: Response) => {
  try {
    const { q, status, sort, limit, offset } = listSchema.parse(req.query);

    const conditions = [STATUS_FILTERS[status]];
    const replacements: Record<string, unknown> = { limit, offset };
    if (q) {
      conditions.push(`(u.name ILIKE :q OR u.email ILIKE :q)`);
      replacements.q = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    }
    const where = conditions.join(" AND ");

    const [{ n }] = await select<{ n: string }>(`SELECT count(*) AS n FROM "Users" u WHERE ${where}`, replacements);

    const rows = await select(
      `SELECT u.user_id, u.name, u.email, u.created_at, u.is_verified, u.is_suspended, u.last_active_at,
              count(v.video_id) FILTER (WHERE v.${LANDED}) AS videos,
              count(v.video_id) FILTER (WHERE v.status = 'error') AS failed,
              max(v.created_at) AS last_upload_at
       FROM "Users" u LEFT JOIN "Videos" v ON v.user_id = u.user_id
       WHERE ${where}
       GROUP BY u.user_id
       ORDER BY ${SORTS[sort]}
       LIMIT :limit OFFSET :offset`,
      replacements,
    );

    const storage = peekStorageUsage();

    return res.json({
      data: {
        items: rows.map((u) => ({
          user_id: u.user_id,
          name: u.name,
          email: u.email,
          created_at: u.created_at,
          is_verified: !!u.is_verified,
          is_suspended: !!u.is_suspended,
          last_active_at: u.last_active_at,
          last_upload_at: u.last_upload_at,
          videos: num(u.videos),
          failed: num(u.failed),
          bytes: userBytes(storage, u.user_id),
          admin: isAdmin(u.email),
        })),
        total: num(n),
        limit,
        offset,
      },
    });
  } catch (e) {
    return fail(res, "listUsersController", e);
  }
};

const idSchema = z.object({ id: z.string().uuid("Invalid user id") });

export const userDetailController = async (req: Request, res: Response) => {
  try {
    const { id } = idSchema.parse(req.params);
    const user = await User.findOne({ where: { user_id: id } });
    if (!user) return res.status(404).json({ error: { message: "User not found" } });

    const [counts] = await select(
      `SELECT
         count(*) FILTER (WHERE status = 'signed_url_generated') AS signed_url_generated,
         count(*) FILTER (WHERE status = 'uploaded') AS uploaded,
         count(*) FILTER (WHERE status = 'transcoding') AS transcoding,
         count(*) FILTER (WHERE status = 'transcoded') AS transcoded,
         count(*) FILTER (WHERE status = 'error') AS error,
         count(*) FILTER (WHERE is_public AND status = 'transcoded') AS public
       FROM "Videos" WHERE user_id = :id`,
      { id },
    );

    const [videos, keys, folders] = await Promise.all([
      Video.findAll({
        where: { user_id: id },
        order: [["created_at", "DESC"]],
        limit: 25,
        attributes: ["video_id", "original_filename", "status", "mime_type", "is_public", "folder", "created_at", "transcoded_urls"],
      }),
      ApiKey.findAll({ where: { user_id: id }, order: [["created_at", "DESC"]] }),
      Folder.count({ where: { user_id: id } }),
    ]);

    const storage = peekStorageUsage();
    const usage = storage?.by_user[id];

    return res.json({
      data: {
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          created_at: user.created_at,
          is_verified: !!user.is_verified,
          is_suspended: !!user.is_suspended,
          last_active_at: user.last_active_at ?? null,
          admin: isAdmin(user.email),
          unlimited: isUnlimited(user.email),
        },
        by_status: {
          signed_url_generated: num(counts.signed_url_generated),
          uploaded: num(counts.uploaded),
          transcoding: num(counts.transcoding),
          transcoded: num(counts.transcoded),
          error: num(counts.error),
        },
        public_videos: num(counts.public),
        deleted_videos: user.deleted_videos ?? 0,
        folders,
        storage: usage ? { ...usage, total_bytes: usage.source_bytes + usage.output_bytes, computed_at: storage!.computed_at } : null,
        storage_computed_at: storage?.computed_at ?? null,
        recent_videos: videos.map((v) => ({
          video_id: v.video_id,
          original_filename: v.original_filename,
          status: v.status,
          mime_type: v.mime_type,
          is_public: v.is_public,
          folder: v.folder,
          created_at: v.created_at,
          renditions: v.transcoded_urls?.length ?? 0,
        })),
        api_keys: keys.map(presentApiKey),
      },
    });
  } catch (e) {
    return fail(res, "userDetailController", e);
  }
};

const updateSchema = z
  .object({
    is_suspended: z.boolean().optional(),
    is_verified: z.boolean().optional(),
  })
  .strict()
  .refine((b) => b.is_suspended !== undefined || b.is_verified !== undefined, "Nothing to update");

export const updateUserController = async (req: Request, res: Response) => {
  try {
    const { id } = idSchema.parse(req.params);
    const body = updateSchema.parse(req.body);

    const user = await User.findOne({ where: { user_id: id } });
    if (!user) return res.status(404).json({ error: { message: "User not found" } });

    if (body.is_suspended === true && isAdmin(user.email)) {
      return res.status(400).json({ error: { message: "Admin accounts can't be suspended" } });
    }

    const patch: Partial<User> = {};
    if (body.is_suspended !== undefined) patch.is_suspended = body.is_suspended;
    if (body.is_verified !== undefined) {
      patch.is_verified = body.is_verified;
      // A manual verification supersedes any pending email link.
      if (body.is_verified) Object.assign(patch, { verify_token: null, verify_token_expiry: null });
    }
    await user.update(patch);

    // @ts-ignore
    console.info(`[admin] ${req.email} updated user ${user.user_id}:`, JSON.stringify(body));

    return res.json({
      data: { user_id: user.user_id, is_suspended: !!user.is_suspended, is_verified: !!user.is_verified },
    });
  } catch (e) {
    return fail(res, "updateUserController", e);
  }
};
