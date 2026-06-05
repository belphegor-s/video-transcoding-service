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
  mime_type: string;
  status: VideoStatus;
  transcoded_urls: string[];
  master_playlist_url: string | null;
  caption_urls: string | null;
  created_at: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
}

export interface PresignedPost {
  url: string;
  fields: Record<string, string>;
}
