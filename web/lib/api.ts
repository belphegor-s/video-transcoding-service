import type { AuthUser, PresignedPost, Video } from "./types";

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

  presignUpload: (fileType: string) =>
    request<PresignedPost>("/upload/upload-videos", { auth: true, query: { fileType } }),

  videos: () => request<Video[]>("/video/user-videos", { auth: true }),

  video: (s3_key: string) => request<Video>("/video/user-video", { auth: true, query: { s3_key } }),
};

/** Master playlist URL for hls.js (auth header attached via xhrSetup). */
export function streamUrl(videoId: string): string {
  return `${BASE}/video/stream?video_id=${encodeURIComponent(videoId)}`;
}
