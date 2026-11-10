/**
 * WhatsApp message building (client + server safe).
 *
 * Templates are owner-editable (Settings → WhatsApp) and use {placeholders}.
 * Unknown placeholders are left as-is so typos are visible, not silently blank.
 * wa.me links get long fast; `buildOrderMessage` keeps the encoded text under
 * a cap by listing the first items and pointing to the order link for the rest.
 */

export type MessageVars = Record<string, string | number | null | undefined>;

export function fillTemplate(template: string, vars: MessageVars): string {
  return template
    .replace(/\{(\w+)\}/g, (whole, key: string) => {
      const v = vars[key];
      return v === undefined || v === null ? whole : String(v);
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Remove lines that still contain an empty-valued placeholder marker. */
function dropEmptyLines(text: string, emptyKeys: string[]): string {
  if (emptyKeys.length === 0) return text;
  const re = new RegExp(`\\{(${emptyKeys.join("|")})\\}`);
  return text
    .split("\n")
    .filter((line) => !re.test(line))
    .join("\n");
}

/** fillTemplate, but lines whose placeholders are all-empty (e.g. "Gift: {gift}") are removed. */
export function fillTemplateCompact(template: string, vars: MessageVars): string {
  const emptyKeys = Object.entries(vars)
    .filter(([, v]) => v === "" || v === null || v === undefined)
    .map(([k]) => k);
  return fillTemplate(dropEmptyLines(template, emptyKeys), vars);
}

export type MessageItem ={ name: string; quantity: number; unitPrice: string; lineTotal: string };

export function formatItemLines(items: MessageItem[]): string[] {
  return items.map((i) => `• ${i.quantity} × ${i.name} (${i.unitPrice}) = ${i.lineTotal}`);
}

/** Encoded-length cap for the ?text= parameter (wa.me fails on very long URLs in some clients). */
export const WA_TEXT_MAX_ENCODED = 1800;

/**
 * Fill the order template. `{items}` expands to item lines, truncated with
 * "+ N more items (see link)" so the encoded message fits `maxEncoded`.
 * Lines whose only placeholders are empty (e.g. no gift) are dropped.
 */
export function buildOrderMessage(
  template: string,
  vars: MessageVars,
  items: MessageItem[],
  maxEncoded = WA_TEXT_MAX_ENCODED,
): string {
  const emptyKeys = Object.entries(vars)
    .filter(([, v]) => v === "" || v === null || v === undefined)
    .map(([k]) => k);
  const base = dropEmptyLines(template, emptyKeys);
  const lines = formatItemLines(items);

  const render = (shown: number) => {
    const list = lines.slice(0, shown);
    const rest = lines.length - shown;
    if (rest > 0) list.push(`+ ${rest} more item${rest === 1 ? "" : "s"} (see link)`);
    return fillTemplate(base, { ...vars, items: list.join("\n") });
  };

  let shown = lines.length;
  let text = render(shown);
  while (encodeURIComponent(text).length > maxEncoded && shown > 0) {
    shown--;
    text = render(shown);
  }
  // Still too long (huge free-text fields): hard-trim but keep the link line if present.
  if (encodeURIComponent(text).length > maxEncoded) {
    const link = typeof vars.link === "string" ? vars.link : "";
    let body = text.replace(link, "").trim();
    while (encodeURIComponent(`${body}…\n${link}`).length > maxEncoded && body.length > 0) {
      body = body.slice(0, Math.floor(body.length * 0.9));
    }
    text = link ? `${body}…\n${link}` : `${body}…`;
  }
  return text;
}

export function waLink(digits: string, text?: string): string {
  const d = digits.replace(/\D/g, "");
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Native deep link; more reliable inside some in-app browsers. */
export function waDeepLink(digits: string, text?: string): string {
  const d = digits.replace(/\D/g, "");
  return `whatsapp://send?phone=${d}${text ? `&text=${encodeURIComponent(text)}` : ""}`;
}
