import { getSignedUrl } from "aws-cloudfront-sign";
import fs from "fs";
import path from "path";

let cachedPrivateKey: string | null = null;

/**
 * Resolve the CloudFront private key lazily so importing this module never throws.
 * Prefers the CLOUDFRONT_PRIVATE_KEY env var (raw PEM or base64-encoded PEM) so the
 * server can run in a container without the gitignored keys/private_key.pem file.
 * Falls back to the on-disk key for local development.
 */
const getPrivateKey = (): string => {
  if (cachedPrivateKey) return cachedPrivateKey;

  const fromEnv = process.env.CLOUDFRONT_PRIVATE_KEY;
  if (fromEnv && fromEnv.trim()) {
    const value = fromEnv.includes("BEGIN") ? fromEnv : Buffer.from(fromEnv, "base64").toString("utf8");
    cachedPrivateKey = value.replace(/\\n/g, "\n");
    return cachedPrivateKey;
  }

  cachedPrivateKey = fs.readFileSync(path.resolve(__dirname, "../../keys/private_key.pem"), "utf8");
  return cachedPrivateKey;
};

export const getSignedCloudFrontUrl = (resourcePath: string, expiresInHours = 12) => {
  const expireTime = Math.floor(Date.now()) + expiresInHours * 60 * 60 * 1000;

  const signedUrl = getSignedUrl(`${process.env.CLOUDFRONT_URL!}/${resourcePath}`, {
    keypairId: process.env.CLOUDFRONT_PUBLIC_KEY_ID!,
    privateKeyString: getPrivateKey(),
    expireTime,
  });

  return signedUrl;
};
