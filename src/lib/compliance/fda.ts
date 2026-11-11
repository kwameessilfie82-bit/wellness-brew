import type { ComplianceSettings } from "@/lib/settings/schemas";

/**
 * FDA Ghana registration helpers. We only ever say "FDA registered" and always
 * show the number — never "FDA approved" (see the banned-phrases register).
 * Per-product numbers win; otherwise the site-wide approved registration applies.
 */

type Regs = Pick<ComplianceSettings, "registrations">;

/** The site-wide FDA registration number: an approved registration with a number, FDA-labelled first. */
export function siteFdaNumber(compliance: Regs | null | undefined): string | null {
  const approved = (compliance?.registrations ?? []).filter((r) => r.status === "approved" && r.number.trim());
  const fda = approved.find((r) => /\bfda\b/i.test(r.label));
  return fda?.number.trim() ?? null;
}

/** The number to show for a product, or null when nothing is registered. */
export function productFdaNumber(
  productNumber: string | null | undefined,
  compliance: Regs | null | undefined,
): string | null {
  return productNumber?.trim() || siteFdaNumber(compliance);
}

export const FDA_LABEL = "FDA Ghana registered";
