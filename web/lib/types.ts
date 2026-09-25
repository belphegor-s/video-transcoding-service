export type VideoStatus =
  | "signed_url_generated"
  | "uploaded"
  | "transcoding"
  | "transcoded"
  | "error";

export interface Video {
  video_id: string;
  user_id: string;
  s3_key: string;
  original_filename: string | null;
  mime_type: string;
  status: VideoStatus;
  transcoded_urls: string[];
  master_playlist_url: string | null;
  caption_urls: string | null;
  is_public: boolean;
  thumbnail_key: string | null;
  folder: string | null;
  created_at: string;
}

export interface TranscriptionCue {
  start: number;
  end: number;
  text: string;
}

export interface Transcription {
  available: boolean;
  language?: string;
  languages?: string[];
  cues?: TranscriptionCue[];
}

export interface Quality {
  label: string;
  height: number;
  width: number;
  p: number; // short edge (the "p" number)
}

export interface RenditionProgress {
  label: string;
  width?: number;
  height?: number;
  p?: number;
  status: "pending" | "processing" | "done" | "skipped";
  percent: number;
}

export interface CaptionTrack {
  lang: string;
  label: string;
  path: string;
}

/** Video count + newest upload for one exact folder path (no nesting rolled in). */
export interface FolderStat {
  path: string;
  videos: number;
  updated_at: string;
}

export interface FolderSummary {
  /** Videos in this folder and everything nested under it. */
  videos: number;
  /** Immediate child folders. */
  subfolders: number;
  /** Newest upload across this folder and its descendants, if any. */
  updated_at?: string;
}

/**
 * Roll per-path stats up a tree: a folder's totals include its descendants, so
 * "Marketing" counts what sits in "Marketing/Q1" too.
 */
export function summarizeFolder(path: string, allPaths: string[], stats: FolderStat[]): FolderSummary {
  const prefix = `${path}/`;
  let videos = 0;
  let updated: string | undefined;

  for (const s of stats) {
    if (s.path !== path && !s.path.startsWith(prefix)) continue;
    videos += s.videos;
    if (s.updated_at && (!updated || s.updated_at > updated)) updated = s.updated_at;
  }

  const subfolders = new Set<string>();
  for (const p of allPaths) {
    if (!p.startsWith(prefix)) continue;
    subfolders.add(p.slice(prefix.length).split("/")[0]);
  }

  return { videos, subfolders: subfolders.size, updated_at: updated };
}

/** Derive available qualities from rendition keys (mirrors the server). */
export function qualitiesFromVideo(video: Pick<Video, "transcoded_urls">): Quality[] {
  return (video.transcoded_urls ?? [])
    .map((key) => {
      const m = key.match(/(\d+)x(\d+)_hls/);
      if (!m) return null;
      const width = Number(m[1]);
      const height = Number(m[2]);
      // Short edge = the "p" number, so portrait reads "1080p" not "1920p".
      const p = Math.min(width, height);
      return { label: `${p}p`, width, height, p };
    })
    .filter((q): q is Quality => q !== null)
    .sort((a, b) => b.p - a.p);
}

export const LIFETIME_VIDEO_LIMIT = 5;
export const MAX_FILE_BYTES = 1024 * 1024 * 1024; // 1 GB

export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  unlimited?: boolean;
  admin?: boolean;
}

export type ApiKeyStatus = "active" | "expired" | "revoked";

export interface ApiKey {
  api_key_id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  status: ApiKeyStatus;
}

export interface CreatedApiKey extends ApiKey {
  key: string; // full secret, returned once
}

export interface PresignedPost {
  url: string;
  fields: Record<string, string>;
  video_id: string;
  s3_key: string;
}

/* --------------------------------- admin ---------------------------------- */

export type AdminRange = 7 | 30 | 90 | 365;

export interface AdminSeriesPoint {
  date: string; // bucket start, YYYY-MM-DD (UTC)
  signups: number;
  ready: number;
  processing: number;
  failed: number;
  abandoned: number;
}

export interface AdminStorage {
  total_bytes: number;
  source_bytes: number;
  output_bytes: number;
  objects: number;
  users_with_data: number;
  computed_at: string;
  duration_ms: number;
}

export interface AdminUserRef {
  user_id: string;
  name: string;
  email: string;
}

export type StatusCounts = Record<VideoStatus, number>;

export interface AdminOverview {
  range: { days: AdminRange; from: string; to: string; bucket: "day" | "week" };
  users: {
    total: number;
    verified: number;
    suspended: number;
    new_in_range: number;
    new_prev: number;
    active_1d: number;
    active_7d: number;
    active_30d: number;
  };
  videos: {
    total: number;
    public: number;
    uploaders: number;
    in_range: number;
    prev: number;
    ready_in_range: number;
    failed_in_range: number;
    success_rate: number | null;
    by_status: StatusCounts;
  };
  api_keys: { active: number; used_30d: number };
  series: AdminSeriesPoint[];
  mime_types: { mime_type: string; count: number }[];
  top_users: (AdminUserRef & { videos: number; last_upload_at: string | null; bytes: number | null })[];
  recent_videos: {
    video_id: string;
    original_filename: string | null;
    status: VideoStatus;
    mime_type: string;
    created_at: string;
    user: AdminUserRef;
  }[];
  storage: AdminStorage | null;
}

export type AdminUserFilter = "all" | "verified" | "unverified" | "suspended" | "active";
export type AdminUserSort = "newest" | "oldest" | "active" | "videos" | "name";

export interface AdminUserRow extends AdminUserRef {
  created_at: string;
  is_verified: boolean;
  is_suspended: boolean;
  last_active_at: string | null;
  last_upload_at: string | null;
  videos: number;
  failed: number;
  bytes: number | null;
  admin: boolean;
}

export interface AdminUserDetail {
  user: AdminUserRef & {
    created_at: string;
    is_verified: boolean;
    is_suspended: boolean;
    last_active_at: string | null;
    admin: boolean;
    unlimited: boolean;
  };
  by_status: StatusCounts;
  public_videos: number;
  folders: number;
  storage: { source_bytes: number; output_bytes: number; objects: number; total_bytes: number; computed_at: string } | null;
  storage_computed_at: string | null;
  recent_videos: {
    video_id: string;
    original_filename: string | null;
    status: VideoStatus;
    mime_type: string;
    is_public: boolean;
    folder: string | null;
    created_at: string;
    renditions: number;
  }[];
  api_keys: ApiKey[];
}
