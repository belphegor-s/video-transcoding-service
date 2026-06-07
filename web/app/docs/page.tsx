import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { CodeBlock } from "@/components/code-block";

export const metadata: Metadata = {
  title: "API Documentation",
  description: "Programmatic access to the Transcoder API: upload, transcode, download, captions and embeds via API keys.",
};

const SECTIONS = [
  { id: "introduction", label: "Introduction" },
  { id: "authentication", label: "Authentication" },
  { id: "limits", label: "Limits" },
  { id: "upload", label: "Upload a video" },
  { id: "status", label: "Status lifecycle" },
  { id: "list", label: "List & fetch" },
  { id: "thumbnail", label: "Thumbnails" },
  { id: "transcription", label: "Transcription" },
  { id: "download", label: "Downloads" },
  { id: "visibility", label: "Visibility & embeds" },
  { id: "errors", label: "Errors" },
];

const BASE = "https://api.transcode.pixly.sh/api/v1";

function H({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="display scroll-mt-24 text-[clamp(1.6rem,3vw,2.2rem)] text-ink">
      {children}
    </h2>
  );
}

function Endpoint({ method, path }: { method: string; path: string }) {
  return (
    <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 font-mono text-xs">
      <span className="text-accent">{method}</span>
      <span className="text-muted">{path}</span>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="relative z-10">
      {/* header */}
      <header className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-xl">
        <div className="shell flex h-16 items-center justify-between">
          <Logo />
          <nav className="flex items-center gap-4 font-mono text-xs text-muted sm:gap-6">
            <Link href="/" className="hidden transition-colors hover:text-ink sm:inline">
              Home
            </Link>
            <Link href="/dashboard/api-keys" className="hidden transition-colors hover:text-ink sm:inline">
              API keys
            </Link>
            <Link href="/dashboard" className="btn-primary">
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="shell grid gap-12 py-12 lg:grid-cols-[220px_1fr] lg:py-16">
        {/* sidebar */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-1">
            <p className="eyebrow mb-4">API reference</p>
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-lg px-3 py-1.5 font-mono text-[13px] text-muted transition-colors hover:bg-surface hover:text-ink"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* content */}
        <article className="min-w-0 max-w-3xl space-y-20">
          <section className="space-y-5">
            <p className="eyebrow">Developers</p>
            <h1 className="display text-[clamp(2.4rem,6vw,4rem)] text-ink">
              The <span className="accent-line">Transcoder</span> API
            </h1>
            <p className="text-lg leading-relaxed text-muted">
              Upload source files, get adaptive HLS, captions, thumbnails and downloadable MP4s, all
              programmatically. Everything the dashboard does is available over a simple REST API.
            </p>
            <div className="space-y-2">
              <p className="eyebrow">Base URL</p>
              <CodeBlock code={BASE} />
            </div>
          </section>

          <section className="space-y-5">
            <H id="introduction">Introduction</H>
            <p className="leading-relaxed text-muted">
              The API is JSON over HTTPS. Successful responses are wrapped in a <Code>data</Code> field;
              errors in an <Code>error</Code> field. All timestamps are ISO-8601. You authenticate with an
              API key created from your dashboard.
            </p>
            <CodeBlock label="response envelope" lang="javascript" code={`// success\n{ "data": { /* ... */ } }\n\n// error\n{ "error": { "message": "Human-readable reason" } }`} />
          </section>

          <section className="space-y-5">
            <H id="authentication">Authentication</H>
            <p className="leading-relaxed text-muted">
              Create one or more keys in{" "}
              <Link href="/dashboard/api-keys" className="text-accent hover:underline">
                Dashboard → API keys
              </Link>
              . A key is shown <strong className="text-ink">once</strong> on creation, so store it securely.
              You can set an expiry and revoke keys at any time.
            </p>
            <p className="leading-relaxed text-muted">Send your key as a header, either way works:</p>
            <CodeBlock
              label="bash"
              code={`# preferred\ncurl ${BASE}/video/user-videos \\\n  -H "x-api-key: vtk_your_key_here"\n\n# or as a bearer token\ncurl ${BASE}/video/user-videos \\\n  -H "Authorization: Bearer vtk_your_key_here"`}
            />
            <p className="text-sm text-muted">
              Keys inherit your account's permissions and limits. Revoking a key stops it working
              immediately.
            </p>
          </section>

          <section className="space-y-5">
            <H id="limits">Limits</H>
            <ul className="space-y-2 text-muted">
              <li className="flex gap-3">
                <span className="text-accent">·</span> Up to <strong className="text-ink">5 videos</strong> per account (lifetime).
              </li>
              <li className="flex gap-3">
                <span className="text-accent">·</span> Up to <strong className="text-ink">1 GB</strong> per file.
              </li>
              <li className="flex gap-3">
                <span className="text-accent">·</span> Up to 5 concurrent transcodes.
              </li>
            </ul>
            <p className="leading-relaxed text-muted">
              Need more, or an on-prem deployment? Email{" "}
              <a href="mailto:hello@ayushsharma.me" className="text-accent hover:underline">
                hello@ayushsharma.me
              </a>
              .
            </p>
          </section>

          <section className="space-y-5">
            <H id="upload">Upload a video</H>
            <p className="leading-relaxed text-muted">
              Uploads go straight to object storage via a presigned POST, so bytes never pass through
              the API. It's a two-step flow.
            </p>

            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-label text-faint">Step 1: request an upload URL</p>
              <Endpoint method="GET" path="/upload/upload-videos" />
              <p className="text-sm text-muted">
                Query params: <Code>fileType</Code> (MIME, required), <Code>fileName</Code> (original name,
                optional but recommended).
              </p>
              <CodeBlock
                label="bash"
                code={`curl "${BASE}/upload/upload-videos?fileType=video/mp4&fileName=clip.mp4" \\\n  -H "x-api-key: $API_KEY"`}
              />
              <CodeBlock
                label="response"
              lang="json"
                code={`{\n  "data": {\n    "url": "https://<bucket>.s3.<region>.amazonaws.com",\n    "fields": {\n      "Content-Type": "video/mp4",\n      "x-amz-meta-userId": "...",\n      "bucket": "...",\n      "X-Amz-Algorithm": "...",\n      "X-Amz-Credential": "...",\n      "X-Amz-Date": "...",\n      "key": "uploads/<userId>/video-<uuid>",\n      "Policy": "...",\n      "X-Amz-Signature": "..."\n    }\n  }\n}`}
              />
            </div>

            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-label text-faint">Step 2: POST the file to storage</p>
              <p className="text-sm text-muted">
                Send a multipart form to <Code>url</Code> with every returned <Code>field</Code>, then the
                file <strong className="text-ink">last</strong>. A <Code>204</Code> means success.
              </p>
              <CodeBlock
                label="bash"
                code={`# echo each field from the response as -F flags, file last\ncurl -X POST "$UPLOAD_URL" \\\n  -F key="$KEY" \\\n  -F Content-Type="video/mp4" \\\n  -F x-amz-meta-userId="$USER_ID" \\\n  -F X-Amz-Algorithm="$ALG" \\\n  -F X-Amz-Credential="$CRED" \\\n  -F X-Amz-Date="$DATE" \\\n  -F Policy="$POLICY" \\\n  -F X-Amz-Signature="$SIG" \\\n  -F file=@clip.mp4`}
              />
              <p className="text-sm text-muted">
                Once uploaded, transcoding starts automatically. Poll the video's status (next sections).
              </p>
            </div>
          </section>

          <section className="space-y-5">
            <H id="status">Status lifecycle</H>
            <p className="leading-relaxed text-muted">A video moves through these states:</p>
            <CodeBlock
              label="states"
              lang="text"
              code={`signed_url_generated  -> upload URL issued, awaiting the file\nuploaded              -> file received, queued\ntranscoding           -> ffmpeg is laddering renditions + captions\ntranscoded            -> ready: HLS, MP4 downloads, captions, thumbnail\nerror                 -> processing failed`}
            />
          </section>

          <section className="space-y-5">
            <H id="list">List &amp; fetch videos</H>
            <Endpoint method="GET" path="/video/user-videos" />
            <CodeBlock label="bash" code={`curl ${BASE}/video/user-videos -H "x-api-key: $API_KEY"`} />
            <CodeBlock
              label="response (one video)"
              lang="json"
              code={`{\n  "video_id": "0b3a927e-...",\n  "s3_key": "uploads/<userId>/video-<uuid>",\n  "original_filename": "clip.mp4",\n  "status": "transcoded",\n  "transcoded_urls": ["<userId>/video-<uuid>/1920x1080_hls/index.m3u8", "..."],\n  "master_playlist_url": "<userId>/video-<uuid>/master.m3u8",\n  "is_public": false,\n  "created_at": "2026-06-06T08:00:00.000Z"\n}`}
            />
            <Endpoint method="GET" path="/video/user-video?s3_key=" />
            <CodeBlock label="bash" code={`curl "${BASE}/video/user-video?s3_key=$KEY" -H "x-api-key: $API_KEY"`} />
          </section>

          <section className="space-y-5">
            <H id="thumbnail">Thumbnails</H>
            <Endpoint method="GET" path="/video/thumbnail?video_id=" />
            <p className="leading-relaxed text-muted">
              Returns a short-lived signed image URL. The first call generates and caches it.
            </p>
            <CodeBlock label="bash" code={`curl "${BASE}/video/thumbnail?video_id=$ID" -H "x-api-key: $API_KEY"\n# { "data": { "url": "https://<cdn>/.../thumbnail.jpg?Expires=..." } }`} />
          </section>

          <section className="space-y-5">
            <H id="transcription">Transcription</H>
            <Endpoint method="GET" path="/video/transcription?video_id=" />
            <p className="leading-relaxed text-muted">
              Captions are generated automatically. If no speech was detected, <Code>available</Code> is{" "}
              <Code>false</Code>.
            </p>
            <CodeBlock
              label="response"
              lang="json"
              code={`{\n  "data": {\n    "available": true,\n    "language": "en",\n    "languages": ["en"],\n    "cues": [\n      { "start": 0.0, "end": 2.4, "text": "Hello and welcome." }\n    ]\n  }\n}`}
            />
          </section>

          <section className="space-y-5">
            <H id="download">Downloads</H>
            <p className="leading-relaxed text-muted">
              Get a per-quality MP4 (remuxed on demand) or a zip of all qualities. First mint a short-lived
              download token, then hit the download endpoint with it.
            </p>
            <Endpoint method="GET" path="/video/download-token?video_id=" />
            <Endpoint method="GET" path="/download/video?video_id=&quality=&token=" />
            <Endpoint method="GET" path="/download/all?video_id=&token=" />
            <CodeBlock
              label="bash"
              code={`# 1) mint a token (valid ~10 min)\nTOKEN=$(curl -s "${BASE}/video/download-token?video_id=$ID" \\\n  -H "x-api-key: $API_KEY" | jq -r .data.token)\n\n# 2) download a single quality as MP4\ncurl -L "${BASE}/download/video?video_id=$ID&quality=1080p&token=$TOKEN" -o clip-1080p.mp4\n\n# 3) or all qualities as a zip\ncurl -L "${BASE}/download/all?video_id=$ID&token=$TOKEN" -o clip-all.zip`}
            />
            <p className="text-sm text-muted">
              Valid <Code>quality</Code> values are the video's rendition heights, e.g. <Code>2160p</Code>,{" "}
              <Code>1080p</Code>, <Code>720p</Code>, <Code>360p</Code>.
            </p>
          </section>

          <section className="space-y-5">
            <H id="visibility">Visibility &amp; embeds</H>
            <Endpoint method="PATCH" path="/video/visibility" />
            <p className="leading-relaxed text-muted">
              Make a video public to enable embedding. Body: <Code>{`{ "video_id": "...", "is_public": true }`}</Code>.
            </p>
            <CodeBlock
              label="bash"
              code={`curl -X PATCH ${BASE}/video/visibility \\\n  -H "x-api-key: $API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"video_id":"'$ID'","is_public":true}'`}
            />
            <p className="leading-relaxed text-muted">Once public, embed it anywhere with an iframe:</p>
            <CodeBlock
              label="html"
              lang="html"
              code={`<iframe\n  src="https://transcode.pixly.sh/embed/${"<video_id>"}"\n  width="640" height="360"\n  style="border:0;border-radius:12px"\n  allow="autoplay; fullscreen; picture-in-picture"\n  allowfullscreen\n></iframe>`}
            />
          </section>

          <section className="space-y-5">
            <H id="errors">Errors</H>
            <p className="leading-relaxed text-muted">Standard HTTP status codes; the body always carries a message.</p>
            <CodeBlock
              label="status codes"
              lang="text"
              code={`400  Bad request / validation error\n401  Missing, invalid, or expired API key\n403  Forbidden (e.g. limit reached, not your resource)\n404  Not found\n500  Server error`}
            />
            <CodeBlock label="example" lang="json" code={`{ "error": { "message": "API key expired" } }`} />
          </section>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Questions or higher limits?{" "}
              <a href="mailto:hello@ayushsharma.me" className="text-accent hover:underline">
                hello@ayushsharma.me
              </a>
            </p>
          </div>
        </article>
      </div>

      <SiteFooter />
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-[0.85em] text-ink">{children}</code>;
}
