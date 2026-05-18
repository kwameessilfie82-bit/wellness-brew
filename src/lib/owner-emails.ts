import "server-only";

/**
 * Owner emails from env. Supports multiple addresses separated by commas,
 * semicolons, or newlines.
 *
 * OWNER_EMAILS=one@gmail.com,two@gmail.com
 * OWNER_EMAIL=one@gmail.com;two@gmail.com
 */
export function getOwnerEmails(): string[] {
  const raw =
    process.env.OWNER_EMAILS ??
    process.env.OWNER_EMAIL ??
    process.env.ADMIN_OWNER_EMAIL ??
    process.env.ADMIN_OWNER_EMAILS ??
    "";

  return raw
    .split(/[,;\n]+/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return getOwnerEmails().includes(normalized);
}
