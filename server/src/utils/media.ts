import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { spawn } from "child_process";
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { Readable } from "stream";
import s3 from "../lib/s3";
import { env } from "../config/env";
import type Video from "../models/Video";

const BUCKET = env.S3_BUCKET_NAME;

/* --------------------------------- S3 I/O --------------------------------- */

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return streamToBuffer(res.Body as Readable);
}

export async function getObjectText(key: string): Promise<string> {
  return (await getObjectBuffer(key)).toString("utf8");
}

export async function putObject(key: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }));
}

/* ------------------------------ key helpers ------------------------------- */

/** Folder that holds master.m3u8 / renditions / captions for a video. */
export function getBasePrefix(video: Video): string {
  if (video.master_playlist_url) {
    return video.master_playlist_url.replace(/\/master\.m3u8$/, "");
  }
  // Fallback: worker uses `${userId}/${basename(s3_key without ext)}`
  const base = video.s3_key.split("/").pop()!.replace(/\.[^.]+$/, "");
  return `${video.user_id}/${base}`;
}

export interface Quality {
  label: string; // e.g. "1080p"
  width: number;
  height: number;
  key: string; // rendition index.m3u8 key
}

/** Available qualities derived from transcoded rendition keys, sorted high -> low. */
export function parseQualities(video: Video): Quality[] {
  return (video.transcoded_urls ?? [])
    .map((key) => {
      const m = key.match(/(\d+)x(\d+)_hls/);
      if (!m) return null;
      const width = Number(m[1]);
      const height = Number(m[2]);
      return { label: `${height}p`, width, height, key };
    })
    .filter((q): q is Quality => q !== null)
    .sort((a, b) => b.height - a.height);
}

/* -------------------------------- ffmpeg ---------------------------------- */

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", ...args]);
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", reject);
    proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`))));
  });
}

function tmpDir(): string {
  const dir = path.join(os.tmpdir(), `vt-${randomUUID()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Segment file names referenced by an HLS media playlist. */
function segmentNames(playlist: string): string[] {
  return playlist
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.toLowerCase().endsWith(".ts"));
}

/**
 * Download a rendition's playlist + segments from S3 and remux (stream copy)
 * into a single faststart MP4. Returns { file, dir } — caller must rm the dir.
 */
export async function remuxRenditionToMp4(renditionKey: string): Promise<{ file: string; dir: string }> {
  const dir = tmpDir();
  try {
    const baseDir = renditionKey.substring(0, renditionKey.lastIndexOf("/"));
    const playlist = await getObjectText(renditionKey);
    await fsp.writeFile(path.join(dir, "index.m3u8"), playlist);

    const names = segmentNames(playlist);
    if (names.length === 0) throw new Error("No segments in rendition playlist");

    // Download segments (bounded concurrency)
    const concurrency = 6;
    for (let i = 0; i < names.length; i += concurrency) {
      await Promise.all(
        names.slice(i, i + concurrency).map(async (name) => {
          const buf = await getObjectBuffer(`${baseDir}/${name}`);
          await fsp.writeFile(path.join(dir, name), buf);
        }),
      );
    }

    const out = path.join(dir, "output.mp4");
    await runFfmpeg([
      "-allowed_extensions", "ALL",
      "-i", path.join(dir, "index.m3u8"),
      "-c", "copy",
      "-bsf:a", "aac_adtstoasc",
      "-movflags", "+faststart",
      out,
    ]);
    return { file: out, dir };
  } catch (e) {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
    throw e;
  }
}

/* ------------------------------- thumbnail -------------------------------- */

/**
 * Return the thumbnail S3 key, generating + caching it on first request.
 * Grabs a frame from the lowest-resolution rendition for speed.
 */
export async function getOrCreateThumbnail(video: Video): Promise<string> {
  if (video.thumbnail_key) return video.thumbnail_key;

  const qualities = parseQualities(video);
  if (qualities.length === 0) throw new Error("No renditions to thumbnail");
  // Prefer the sharpest rendition <= 720p (good quality, modest segment size),
  // else fall back to the lowest available.
  const rendition = qualities.find((q) => q.height <= 720) ?? qualities[qualities.length - 1];

  const dir = tmpDir();
  try {
    const baseDir = rendition.key.substring(0, rendition.key.lastIndexOf("/"));
    const playlist = await getObjectText(rendition.key);
    const names = segmentNames(playlist);
    if (names.length === 0) throw new Error("No segments for thumbnail");

    const firstSeg = names[0];
    await fsp.writeFile(path.join(dir, firstSeg), await getObjectBuffer(`${baseDir}/${firstSeg}`));

    const out = path.join(dir, "thumb.jpg");
    // `thumbnail` filter scans frames and picks a representative one (no seeking
    // guesswork that can yield an empty/black/no-frame output).
    await runFfmpeg([
      "-i", path.join(dir, firstSeg),
      "-vf", "thumbnail,scale=640:-2",
      "-frames:v", "1",
      "-q:v", "3",
      out,
    ]);

    const key = `${getBasePrefix(video)}/thumbnail.jpg`;
    await putObject(key, await fsp.readFile(out), "image/jpeg");

    await video.update({ thumbnail_key: key });
    return key;
  } finally {
    await fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

/* ------------------------------ transcription ----------------------------- */

export interface TranscriptionCue {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  available: boolean;
  language?: string;
  languages?: string[];
  cues?: TranscriptionCue[];
}

function parseVttTimestamp(ts: string): number {
  // [hh:]mm:ss.mmm
  const parts = ts.trim().split(":");
  let h = 0,
    m = 0,
    s = 0;
  if (parts.length === 3) [h, m, s] = parts.map(Number);
  else if (parts.length === 2) [m, s] = parts.map(Number);
  return h * 3600 + m * 60 + s;
}

function parseVtt(vtt: string): TranscriptionCue[] {
  const cues: TranscriptionCue[] = [];
  const blocks = vtt.replace(/\r/g, "").split("\n\n");
  for (const block of blocks) {
    const line = block.split("\n").find((l) => l.includes("-->"));
    if (!line) continue;
    const [from, to] = line.split("-->");
    const text = block
      .split("\n")
      .filter((l) => l && !l.includes("-->") && l.trim() !== "WEBVTT" && !/^\d+$/.test(l.trim()))
      .join(" ")
      .trim();
    if (!text) continue;
    cues.push({ start: parseVttTimestamp(from), end: parseVttTimestamp(to.split(" ")[0]), text });
  }
  return cues;
}

export async function fetchTranscription(video: Video): Promise<TranscriptionResult> {
  if (!video.caption_urls) return { available: false };
  let map: Record<string, { vtt?: string; srt?: string }>;
  try {
    map = JSON.parse(video.caption_urls);
  } catch {
    return { available: false };
  }
  const languages = Object.keys(map || {});
  if (languages.length === 0) return { available: false };

  const language = languages.includes("en") ? "en" : languages[0];
  const vttKey = map[language]?.vtt;
  if (!vttKey) return { available: false };

  try {
    const cues = parseVtt(await getObjectText(vttKey));
    if (cues.length === 0) return { available: false, languages };
    return { available: true, language, languages, cues };
  } catch {
    return { available: false, languages };
  }
}

/** Build a download filename from the original name (or fall back to the id). */
export function downloadBaseName(video: Video): string {
  const raw = video.original_filename?.replace(/\.[^.]+$/, "") || video.s3_key.split("/").pop() || "video";
  return raw.replace(/[^a-zA-Z0-9-_]+/g, "_").slice(0, 80) || "video";
}
