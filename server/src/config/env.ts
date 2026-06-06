import "dotenv/config";
import { z } from "zod";

/**
 * Single source of truth for environment configuration. Every var the server
 * needs is declared, validated and typed here. Import `env` from this module
 * instead of touching `process.env` anywhere else.
 *
 * On invalid/missing config the process exits immediately with a clear report,
 * so misconfiguration fails at boot rather than as a confusing runtime error.
 */
const schema = z.object({
  NODE_ENV: z.string().default("production"),
  PORT: z.coerce.number().default(8080),

  JWT_ACCESS_TOKEN_SECRET: z.string().min(1),
  JWT_REFRESH_TOKEN_SECRET: z.string().min(1),

  S3_REGION: z.string().min(1),
  S3_BUCKET_NAME: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),

  DATABASE_URI: z.string().min(1),

  REDIS_USERNAME: z.string().min(1),
  REDIS_PASSWORD: z.string().min(1),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.coerce.number().default(17534),

  CLOUDFRONT_URL: z.string().url(),
  CLOUDFRONT_PUBLIC_KEY_ID: z.string().min(1),
  // Optional: raw or base64 PEM. Falls back to keys/private_key.pem on disk.
  CLOUDFRONT_PRIVATE_KEY: z.string().optional().default(""),

  RESEND_API_KEY: z.string().min(1),

  // Public URL of the frontend; drives the CORS allowlist and email links.
  CLIENT_APP_URL: z.string().url(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n❌ Invalid environment configuration:\n");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  console.error("\nFix the environment variables above and restart.\n");
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
