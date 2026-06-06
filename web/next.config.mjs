/** @type {import('next').NextConfig} */

// CSP allows: our API, S3 uploads, CloudFront (thumbnails/captions), hls.js
// blob workers, and Cloudflare Web Analytics. `frameAncestors` differs so the
// /embed route can be framed anywhere while the rest of the app cannot.
const csp = (frameAncestors) =>
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.cloudfront.net",
    "media-src 'self' blob: https://api.transcode.pixly.sh https://*.cloudfront.net",
    "font-src 'self' data:",
    "connect-src 'self' https://api.transcode.pixly.sh https://*.s3.amazonaws.com https://*.s3.eu-central-1.amazonaws.com https://*.cloudfront.net https://cloudflareinsights.com https://static.cloudflareinsights.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");

const baseHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "accelerometer=(), autoplay=(self), camera=(), encrypted-media=(self), fullscreen=(self), geolocation=(), gyroscope=(), microphone=(), payment=(), picture-in-picture=(self)",
  },
];

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async headers() {
    return [
      // Embeddable player: framable by any site.
      {
        source: "/embed/:path*",
        headers: [...baseHeaders, { key: "Content-Security-Policy", value: csp("*") }],
      },
      // Everything else: same-origin framing only.
      {
        source: "/((?!embed).*)",
        headers: [
          ...baseHeaders,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: csp("'self'") },
        ],
      },
    ];
  },
};

export default nextConfig;
