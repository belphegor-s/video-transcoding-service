import { Request, Response } from "express";
import url from "url";
import path from "path";
import { getSignedCloudFrontUrl } from "./getSignedCloudFrontUrl";
import type Video from "../models/Video";

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

    const rewrittenLines = lines.map((line) => {
      line = line.trim();

      if (line.startsWith("#EXT-X-MEDIA") && line.includes('URI="')) {
        return line.replace(/URI="([^"]+)"/, (_match, uriPath) => {
          const absPath = url.resolve(playlistBasePath, uriPath);
          // Always proxy subtitle URIs (.vtt or child .m3u8) through us so the
          // player never makes a cross-origin request to the CDN (CloudFront
          // does not return CORS headers on preflight, which breaks captions).
          const proxyUrl = `${protocol}://${host}${opts.proxyPath}?video_id=${video.video_id}&path=${encodeURIComponent(absPath)}`;
          return `URI="${proxyUrl}"`;
        });
      }

      if (line && !line.startsWith("#")) {
        const absPath = url.resolve(playlistBasePath, line);
        return `${protocol}://${host}${opts.proxyPath}?video_id=${video.video_id}&path=${encodeURIComponent(absPath)}`;
      }

      return line;
    });

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

    return res.end(Buffer.from(await upstream.arrayBuffer()));
  }

  if (ext === ".vtt") {
    // Proxy caption bytes too (same CORS reasoning as segments).
    const upstream = await fetch(getSignedCloudFrontUrl(requestedPath));
    if (!upstream.ok) return res.status(502).json({ error: "Failed to fetch captions" });
    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.end(Buffer.from(await upstream.arrayBuffer()));
  }

  return res.status(400).json({ error: "Unsupported resource type" });
}
