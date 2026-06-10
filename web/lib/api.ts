import type { ApiKey, AuthUser, CaptionTrack, CreatedApiKey, Paginated, PresignedPost, RenditionProgress, Transcription, Video, VideoStatus } from "./types";

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:9191/api/v1").replace(/\/$/, "");

const ACCESS_KEY = "vt_access";
const REFRESH_KEY = "vt_refresh";

/* ----------------------------- token storage ----------------------------- */

export const tokens = {
  access: () => (typeof window === "undefined" ? null : localStorage.getItem(ACCESS_KEY)),
  refresh: () => (typeof window === "undefined" ? null : localStorage.getItem(REFRESH_KEY)),
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** True if a URL targets our own API (vs a signed CDN URL). Used to decide
 *  whether to attach the auth header on hls.js segment/playlist requests. */
export function isApiUrl(u: string): boolean {
  try {
    const apiOrigin = new URL(BASE, typeof window !== "undefined" ? window.location.href : "http://localhost").origin;
    return new URL(u, typeof window !== "undefined" ? window.location.href : "http://localhost").origin === apiOrigin;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function extractError(body: any, fallback: string): string {
  const err = body?.error;
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err.message === "string") return err.message;
  // field-error maps -> first message we can find
  const first = Object.values(err)[0];
  if (Array.isArray(first) && first.length) return String(first[0]);
  if (typeof first === "string") return first;
  return fallback;
}

/* ------------------------------- core fetch ------------------------------- */

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
  query?: Record<string, string | undefined>;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refresh = tokens.refresh();
  if (!refresh) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${BASE}/user/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: refresh }),
        });
        if (!res.ok) return false;
        const json = await res.json();
        const { accessToken, refreshToken } = json.data ?? {};
        if (!accessToken || !refreshToken) return false;
        tokens.set(accessToken, refreshToken);
        return true;
      } catch {
        return false;
      } finally {
        // reset gate on next tick
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

async function request<T>(path: string, opts: RequestOptions = {}, _retried = false): Promise<T> {
  const { method = "GET", body, auth = false, query } = opts;

  const url = new URL(`${BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = tokens.access();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth && !_retried) {
    const ok = await tryRefresh();
    if (ok) return request<T>(path, opts, true);
    tokens.clear();
    throw new ApiError("Session expired. Please sign in again.", 401);
  }

  let json: any = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    throw new ApiError(extractError(json, `Request failed (${res.status})`), res.status);
  }

  return (json?.data ?? json) as T;
}

/* -------------------------------- endpoints ------------------------------- */

export const api = {
  signup: (input: { name: string; email: string; password: string }) =>
    request<{ message: string }>("/user/create-user", { method: "POST", body: input }),

  login: (input: { email: string; password: string }) =>
    request<{ user: AuthUser; accessToken: string; refreshToken: string }>("/user/login-user", {
      method: "POST",
      body: input,
    }),

  verifyEmail: (token: string) =>
    request<{ message: string }>("/user/verify-email", { query: { token } }),

  requestReset: (email: string) =>
    request<{ message: string }>("/user/request-reset-password", { method: "POST", body: { email } }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ message: string }>("/user/reset-password", { method: "POST", body: { token, newPassword } }),

  me: () => request<AuthUser>("/user/me", { auth: true }),

  presignUpload: (fileType: string, fileName?: string) =>
    request<PresignedPost>("/upload/upload-videos", { auth: true, query: { fileType, fileName } }),

  videos: (limit = 12, offset = 0, opts?: { q?: string; folder?: string; sort?: string }) =>
    request<Paginated<Video>>("/video/user-videos", {
      auth: true,
      query: {
        limit: String(limit),
        offset: String(offset),
        q: opts?.q || undefined,
        folder: opts?.folder || undefined,
        sort: opts?.sort || undefined,
      },
    }),

  videoById: (videoId: string) => request<Video>("/video/by-id", { auth: true, query: { video_id: videoId } }),

  renditionProgress: (videoId: string) =>
    request<{ status: VideoStatus; renditions: RenditionProgress[] }>("/video/progress", {
      auth: true,
      query: { video_id: videoId },
    }),

  folders: () => request<string[]>("/video/folders", { auth: true }),

  setFolder: (videoId: string, folder: string | null) =>
    request<{ video_id: string; folder: string | null }>("/video/folder", {
      method: "PATCH",
      auth: true,
      body: { video_id: videoId, folder },
    }),

  createFolder: (path: string) =>
    request<{ path: string }>("/video/folders", { method: "POST", auth: true, body: { path } }),

  renameFolder: (from: string, to: string) =>
    request<{ from: string; to: string }>("/video/folders/rename", { method: "PATCH", auth: true, body: { from, to } }),

  deleteFolder: (path: string) =>
    request<{ path: string }>("/video/folders", { method: "DELETE", auth: true, query: { path } }),

  moveVideos: (videoIds: string[], folder: string | null) =>
    request<{ moved: number; folder: string | null }>("/video/move", {
      method: "PATCH",
      auth: true,
      body: { video_ids: videoIds, folder },
    }),

  video: (s3_key: string) => request<Video>("/video/user-video", { auth: true, query: { s3_key } }),

  thumbnail: (videoId: string) =>
    request<{ url: string }>("/video/thumbnail", { auth: true, query: { video_id: videoId } }),

  transcription: (videoId: string) =>
    request<Transcription>("/video/transcription", { auth: true, query: { video_id: videoId } }),

  captions: (videoId: string) =>
    request<{ tracks: CaptionTrack[] }>("/video/captions", { auth: true, query: { video_id: videoId } }),

  publicCaptions: (videoId: string) =>
    request<{ tracks: CaptionTrack[] }>("/public/video/captions", { query: { video_id: videoId } }),

  setVisibility: (videoId: string, isPublic: boolean) =>
    request<{ video_id: string; is_public: boolean }>("/video/visibility", {
      method: "PATCH",
      auth: true,
      body: { video_id: videoId, is_public: isPublic },
    }),

  renameVideo: (videoId: string, name: string) =>
    request<{ video_id: string; original_filename: string }>("/video/rename", {
      method: "PATCH",
      auth: true,
      body: { video_id: videoId, name },
    }),

  downloadToken: (videoId: string) =>
    request<{ token: string }>("/video/download-token", { auth: true, query: { video_id: videoId } }),

  bulkDownloadToken: () => request<{ token: string }>("/video/bulk-download-token", { auth: true }),

  // Public (embed) endpoints: no auth, gated on is_public server-side.
  publicMeta: (videoId: string) =>
    request<{ video_id: string; title: string; qualities: string[]; has_transcription: boolean; created_at: string }>(
      "/public/video/meta",
      { query: { video_id: videoId } },
    ),

  publicTranscription: (videoId: string) =>
    request<Transcription>("/public/video/transcription", { query: { video_id: videoId } }),

  publicThumbnail: (videoId: string) =>
    request<{ url: string }>("/public/video/thumbnail", { query: { video_id: videoId } }),

  // API keys
  listApiKeys: (limit = 10, offset = 0) =>
    request<Paginated<ApiKey>>("/api-keys", { auth: true, query: { limit: String(limit), offset: String(offset) } }),

  createApiKey: (name: string, expiresAt?: string | null) =>
    request<CreatedApiKey>("/api-keys", { method: "POST", auth: true, body: { name, expires_at: expiresAt ?? null } }),

  rotateApiKey: (id: string) => request<CreatedApiKey>(`/api-keys/${id}/rotate`, { method: "POST", auth: true }),

  deleteApiKey: (id: string) => request<{ api_key_id: string }>(`/api-keys/${id}`, { method: "DELETE", auth: true }),

  renameApiKey: (id: string, name: string) => request<ApiKey>(`/api-keys/${id}`, { method: "PATCH", auth: true, body: { name } }),
};

/** Authed master-playlist URL for the player (Bearer attached via xhrSetup). */
export function streamUrl(videoId: string): string {
  return `${BASE}/video/stream?video_id=${encodeURIComponent(videoId)}`;
}

/** Public master-playlist URL for the embed player (no auth). */
export function publicStreamUrl(videoId: string): string {
  return `${BASE}/public/video/stream?video_id=${encodeURIComponent(videoId)}`;
}

export function downloadQualityUrl(videoId: string, quality: string, token: string): string {
  return `${BASE}/download/video?video_id=${encodeURIComponent(videoId)}&quality=${encodeURIComponent(quality)}&token=${encodeURIComponent(token)}`;
}

export function downloadAllUrl(videoId: string, token: string): string {
  return `${BASE}/download/all?video_id=${encodeURIComponent(videoId)}&token=${encodeURIComponent(token)}`;
}

export function bulkDownloadUrl(videoIds: string[], token: string): string {
  return `${BASE}/download/bulk?ids=${encodeURIComponent(videoIds.join(","))}&token=${encodeURIComponent(token)}`;
}

export function folderDownloadUrl(path: string, token: string): string {
  return `${BASE}/download/folder?path=${encodeURIComponent(path)}&token=${encodeURIComponent(token)}`;
}

/** URL that serves a caption .vtt (via the stream proxy) for the given path. */
export function captionVttUrl(videoId: string, path: string, isPublic: boolean): string {
  const base = isPublic ? "/public/video/stream" : "/video/stream";
  return `${BASE}${base}?video_id=${encodeURIComponent(videoId)}&path=${encodeURIComponent(path)}`;
}
