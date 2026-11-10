import "server-only";

/**
 * Server-only settings registry: every section's schema and defaults,
 * including payments (bank / MoMo details), which must never reach the
 * client bundle. Client code imports ./schemas instead.
 */
import {
  brandSchema,
  contactSchema,
  locationsSchema,
  paymentsSchema,
  PUBLIC_DEFAULTS,
  type SettingsMap,
  type SettingsSection,
  socialSchema,
} from "./schemas";

export const SETTINGS_SCHEMAS = {
  brand: brandSchema,
  contact: contactSchema,
  locations: locationsSchema,
  social: socialSchema,
  payments: paymentsSchema,
} as const;

export const SETTINGS_SECTIONS = Object.keys(SETTINGS_SCHEMAS) as SettingsSection[];

export function isSettingsSection(v: unknown): v is SettingsSection {
  return typeof v === "string" && Object.hasOwn(SETTINGS_SCHEMAS, v);
}

export const SETTINGS_DEFAULTS: SettingsMap = {
  ...PUBLIC_DEFAULTS,
  payments: {
    momoProvider: "MTN",
    momoMerchantId: "974356",
    momoMerchantName: "PillJoint Pharmacy Limited",
    momoReference: "leafyvibestea",
    momoContactLine: "0540734749",
    bankName: "SINAPI ABA SAVINGS AND LOANS",
    bankAccountName: "PILLJOINT PHARMACY LTD",
    bankAccountNumber: "260969426301",
    bankBranch: "",
    invoiceTitle: "Hibiscus Teas",
    invoiceAddress: "Parakuo Estate, Dome, Accra",
    invoiceTaxId: "",
    chequesPayableTo: "PillJoint Pharmacy Ltd",
    invoiceNotes: "We appreciate your trust in Wellness Brew.",
    latePaymentPolicy:
      "Payment is due within 90 days. Late payments may incur a 2% monthly interest charge.",
  },
};

/** Merge a stored value over defaults; fall back to defaults if it no longer validates. */
export function resolveSection<K extends SettingsSection>(
  section: K,
  stored: unknown,
): SettingsMap[K] {
  const defaults = SETTINGS_DEFAULTS[section];
  if (!stored || typeof stored !== "object") return defaults;
  const parsed = SETTINGS_SCHEMAS[section].safeParse({ ...defaults, ...(stored as object) });
  if (!parsed.success) {
    console.warn(`[settings] stored "${section}" no longer validates; using defaults`, parsed.error.issues);
    return defaults;
  }
  return parsed.data as SettingsMap[K];
}
