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
}

/** Derive available qualities from rendition keys (mirrors the server). */
export function qualitiesFromVideo(video: Pick<Video, "transcoded_urls">): Quality[] {
  return (video.transcoded_urls ?? [])
    .map((key) => {
      const m = key.match(/(\d+)x(\d+)_hls/);
      if (!m) return null;
      return { label: `${m[2]}p`, width: Number(m[1]), height: Number(m[2]) };
    })
    .filter((q): q is Quality => q !== null)
    .sort((a, b) => b.height - a.height);
}

export const LIFETIME_VIDEO_LIMIT = 5;
export const MAX_FILE_BYTES = 1024 * 1024 * 1024; // 1 GB

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
}
