import { getSignedUrl } from "aws-cloudfront-sign";
import fs from "fs";
import path from "path";
import { env } from "../config/env";

let cachedPrivateKey: string | null = null;

/**
 * Resolve the CloudFront private key lazily so importing this module never throws.
 * Prefers the CLOUDFRONT_PRIVATE_KEY env var (raw PEM or base64-encoded PEM) so the
 * server can run in a container without the gitignored keys/private_key.pem file.
 * Falls back to the on-disk key for local development.
 */
const getPrivateKey = (): string => {
  if (cachedPrivateKey) return cachedPrivateKey;

  const fromEnv = env.CLOUDFRONT_PRIVATE_KEY;
  if (fromEnv && fromEnv.trim()) {
    const value = fromEnv.includes("BEGIN") ? fromEnv : Buffer.from(fromEnv, "base64").toString("utf8");
    cachedPrivateKey = value.replace(/\\n/g, "\n");
    return cachedPrivateKey;
  }

  cachedPrivateKey = fs.readFileSync(path.resolve(__dirname, "../../keys/private_key.pem"), "utf8");
  return cachedPrivateKey;
};

/**
 * Sign a CloudFront URL.
 *
 * `stableWindowHours` buckets the expiry to a fixed time boundary so repeated
 * requests for the same object produce the *identical* signed URL within that
 * window. This is essential for segment (.ts) URLs: a per-request expiry (the
 * old behaviour) changed the signature every call, so CloudFront treated each
 * request as a new object and never served from the edge cache. With a stable
 * signature the same segment is cached at the edge and re-served instantly to
 * every viewer / replay.
 */
export const getSignedCloudFrontUrl = (resourcePath: string, expiresInHours = 12, stableWindowHours?: number) => {
  let expireTime: number;
  if (stableWindowHours && stableWindowHours > 0) {
    const windowMs = stableWindowHours * 60 * 60 * 1000;
    // Round up to the next window boundary so the URL is stable for this window
    // and stays valid for between 1x and 2x the window.
    expireTime = Math.ceil(Date.now() / windowMs) * windowMs + windowMs;
  } else {
    expireTime = Math.floor(Date.now()) + expiresInHours * 60 * 60 * 1000;
  }

  const signedUrl = getSignedUrl(`${env.CLOUDFRONT_URL}/${resourcePath}`, {
    keypairId: env.CLOUDFRONT_PUBLIC_KEY_ID,
    privateKeyString: getPrivateKey(),
    expireTime,
  });

  return signedUrl;
};
