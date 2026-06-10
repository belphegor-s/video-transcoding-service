import { Request, Response } from "express";
import url from "url";
import path from "path";
import { Readable } from "stream";
import { getSignedCloudFrontUrl } from "./getSignedCloudFrontUrl";
import type Video from "../models/Video";

/**
 * Pipe an upstream fetch() body straight to the response instead of buffering
 * the whole payload into memory first. Buffering a 6s .ts segment added the
 * segment's full download time before the player saw a single byte (the cause
 * of slow/janky streaming); piping forwards bytes as they arrive.
 */
function pipeUpstream(res: Response, body: unknown) {
  if (!body) return res.end();
  const stream = Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]);
  // Client went away (seek / tab close): stop pulling from the CDN.
  res.on("close", () => stream.destroy());
  stream.on("error", () => {
    if (!res.headersSent) res.status(502).end();
    else res.destroy();
  });
  return stream.pipe(res);
}

/**
 * Proxy an HLS resource (master/variant .m3u8 or .ts segment) for a video.
 * - .m3u8: fetched from the signed CDN, segment lines rewritten back through
 *   `proxyPath` (so the player keeps hitting us), caption URIs signed inline.
 * - .ts: 302 to the signed CDN URL.
 *
 * `proxyPath` lets the same logic serve both the authed route and the public
 * embed route (each rewrites child requests to its own endpoint).
 */
export async function streamHls(
  video: Video,
  req: Request,
  res: Response,
  opts: { resourcePath?: string; proxyPath: string },
) {
  const requestedPath = opts.resourcePath ? opts.resourcePath : video.master_playlist_url!;
  const ext = path.extname(requestedPath).toLowerCase();
  const protocol = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = req.headers.host;

  if (ext === ".m3u8") {
    const signedUrl = getSignedCloudFrontUrl(requestedPath);
    const response = await fetch(signedUrl);
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch playlist" });
    }

    const playlistText = await response.text();
    const playlistBasePath = requestedPath.substring(0, requestedPath.lastIndexOf("/") + 1);
    const lines = playlistText.split("\n");

    const rewrittenLines: string[] = [];
    for (const raw of lines) {
      const line = raw.trim();

      // Drop subtitle declarations from the manifest: the player (Vidstack/hls.js)
      // tries to load the .vtt as a cross-origin / auth-less native text track,
      // which is blocked ("Unsafe attempt to load URL") and stalls playback.
      // Captions remain available via the /transcription endpoint + panel.
      if (line.startsWith("#EXT-X-MEDIA") && line.includes("TYPE=SUBTITLES")) continue;

      if (line && !line.startsWith("#")) {
        const absPath = url.resolve(playlistBasePath, line);
        rewrittenLines.push(`${protocol}://${host}${opts.proxyPath}?video_id=${video.video_id}&path=${encodeURIComponent(absPath)}`);
        continue;
      }

      rewrittenLines.push(raw.replace(/\r$/, ""));
    }

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    return res.send(rewrittenLines.join("\n"));
  }

  if (ext === ".ts") {
    // Proxy the segment bytes through this (CORS-open) endpoint rather than
    // 302-redirecting to the signed CDN URL. Browsers refuse to follow a
    // cross-origin redirect for preflighted/credentialed XHRs (hls.js), which
    // otherwise breaks playback on any embedding site.
    const signedUrl = getSignedCloudFrontUrl(requestedPath);
    const range = req.headers["range"] as string | undefined;
    const upstream = await fetch(signedUrl, range ? { headers: { Range: range } } : undefined);

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ error: "Failed to fetch segment" });
    }

    res.status(upstream.status);
    res.setHeader("Content-Type", "video/mp2t");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) res.setHeader("Content-Range", contentRange);
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) res.setHeader("Content-Length", contentLength);

    return pipeUpstream(res, upstream.body);
  }

  if (ext === ".vtt") {
    // Proxy caption bytes too (same CORS reasoning as segments).
    const upstream = await fetch(getSignedCloudFrontUrl(requestedPath));
    if (!upstream.ok) return res.status(502).json({ error: "Failed to fetch captions" });
    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return pipeUpstream(res, upstream.body);
  }

  return res.status(400).json({ error: "Unsupported resource type" });
}
