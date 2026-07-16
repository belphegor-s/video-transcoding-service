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
