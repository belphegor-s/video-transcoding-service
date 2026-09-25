import { ListObjectsV2Command, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import s3 from "./s3";
import { env } from "../config/env";

/**
 * Bucket-wide storage usage, attributed per user.
 *
 * Nothing in Postgres records object sizes, so this walks the bucket. Keys follow
 * two layouts: sources at `uploads/<userId>/…` and renditions/captions/thumbnails
 * at `<userId>/…`. A full listing is O(objects), so the result is cached in memory
 * and concurrent callers share one in-flight scan.
 */

export interface UserStorage {
  source_bytes: number;
  output_bytes: number;
  objects: number;
}

export interface StorageUsage {
  total_bytes: number;
  source_bytes: number;
  output_bytes: number;
  objects: number;
  by_user: Record<string, UserStorage>;
  computed_at: string;
  duration_ms: number;
}

const TTL_MS = 15 * 60 * 1000;

let cached: StorageUsage | null = null;
let inflight: Promise<StorageUsage> | null = null;

async function scan(): Promise<StorageUsage> {
  const started = Date.now();
  const byUser: Record<string, UserStorage> = {};
  let source = 0;
  let output = 0;
  let objects = 0;
  let token: string | undefined;

  do {
    const page: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({ Bucket: env.S3_BUCKET_NAME, ContinuationToken: token, MaxKeys: 1000 }),
    );
    for (const obj of page.Contents ?? []) {
      if (!obj.Key) continue;
      const size = obj.Size ?? 0;
      const segs = obj.Key.split("/");
      const isSource = segs[0] === "uploads";
      const userId = isSource ? segs[1] : segs[0];
      if (!userId) continue;

      const u = (byUser[userId] ??= { source_bytes: 0, output_bytes: 0, objects: 0 });
      u.objects += 1;
      objects += 1;
      if (isSource) {
        u.source_bytes += size;
        source += size;
      } else {
        u.output_bytes += size;
        output += size;
      }
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  return {
    total_bytes: source + output,
    source_bytes: source,
    output_bytes: output,
    objects,
    by_user: byUser,
    computed_at: new Date().toISOString(),
    duration_ms: Date.now() - started,
  };
}

function startScan(): Promise<StorageUsage> {
  if (!inflight) {
    inflight = scan()
      .then((result) => {
        cached = result;
        return result;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

const isFresh = () => !!cached && Date.now() - new Date(cached.computed_at).getTime() < TTL_MS;

/** Cached usage, scanning if stale (or when forced). */
export async function getStorageUsage(force = false): Promise<StorageUsage> {
  if (!force && isFresh()) return cached!;
  return startScan();
}

/** Never blocks: returns whatever is cached and refreshes in the background. */
export function peekStorageUsage(): StorageUsage | null {
  if (!isFresh()) startScan().catch((err) => console.error("Storage scan failed:", err));
  return cached;
}
