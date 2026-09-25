import { env } from "../config/env";

const OWNER_EMAIL = "ayush2162002@gmail.com";

// Accounts exempt from the free-plan limits (the owner).
const UNLIMITED_EMAILS = new Set<string>([OWNER_EMAIL]);

// Accounts allowed into the admin console: the owner plus ADMIN_EMAILS.
const ADMIN_EMAILS = new Set<string>([
  OWNER_EMAIL,
  ...env.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
]);

export function isUnlimited(email?: string | null): boolean {
  return !!email && UNLIMITED_EMAILS.has(email.toLowerCase());
}

export function isAdmin(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}

// Per-file upload ceiling for unlimited accounts (vs 1GB on the free plan).
export const UNLIMITED_MAX_FILE_BYTES = 50 * 1024 * 1024 * 1024; // 50GB
export const FREE_MAX_FILE_BYTES = 1024 * 1024 * 1024; // 1GB
