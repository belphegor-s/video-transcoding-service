// Accounts exempt from the free-plan limits (the owner).
const UNLIMITED_EMAILS = new Set<string>(["ayush2162002@gmail.com"]);

export function isUnlimited(email?: string | null): boolean {
  return !!email && UNLIMITED_EMAILS.has(email.toLowerCase());
}

// Per-file upload ceiling for unlimited accounts (vs 1GB on the free plan).
export const UNLIMITED_MAX_FILE_BYTES = 50 * 1024 * 1024 * 1024; // 50GB
export const FREE_MAX_FILE_BYTES = 1024 * 1024 * 1024; // 1GB
