/** KPI tracker constants and helpers. Client + server safe (no DB imports). */

export const CHANNELS = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "website", label: "Website" },
] as const;
export type ChannelKey = (typeof CHANNELS)[number]["key"];

export const INPUT_METRICS = [
  { key: "reach", label: "Reach" },
  { key: "engagements", label: "Engagements" },
  { key: "saves", label: "Saves" },
  { key: "shares", label: "Shares" },
  { key: "linkClicks", label: "Link clicks" },
  { key: "dms", label: "DMs" },
  { key: "whatsappEnquiries", label: "WhatsApp enquiries" },
  { key: "orders", label: "Orders" },
  { key: "repeatOrders", label: "Repeat orders" },
  { key: "revenue", label: "Revenue (GHS)" },
  { key: "medianResponseMin", label: "Median response (min)" },
] as const;
export type InputMetricKey = (typeof INPUT_METRICS)[number]["key"];

/** Rates computed per channel-week; blank when the denominator is empty or 0. */
export const RATE_METRICS = [
  { key: "engagementRate", label: "Engagement rate", num: "engagements", den: "reach" },
  { key: "ctr", label: "CTR", num: "linkClicks", den: "reach" },
  { key: "leadToOrder", label: "Lead→order", num: "orders", den: "whatsappEnquiries" },
  { key: "repeatRate", label: "Repeat rate", num: "repeatOrders", den: "orders" },
] as const satisfies readonly { key: string; label: string; num: InputMetricKey; den: InputMetricKey }[];

export const computeRate = (num: number | null | undefined, den: number | null | undefined): number | null =>
  num == null || !den ? null : num / den;

export const metricKey = (channel: ChannelKey, metric: InputMetricKey) => `${channel}.${metric}` as const;

const VALID_KEYS = new Set<string>(CHANNELS.flatMap((c) => INPUT_METRICS.map((m) => metricKey(c.key, m.key))));
export const isMetricKey = (k: string) => VALID_KEYS.has(k);
export const ALL_METRIC_KEYS: readonly string[] = [...VALID_KEYS];

export const metricLabel = (key: string) => {
  const [c, m] = key.split(".");
  return `${CHANNELS.find((x) => x.key === c)?.label ?? c} ${INPUT_METRICS.find((x) => x.key === m)?.label ?? m}`;
};

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const parseDay = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** Monday (UTC) of the week containing `date`, as YYYY-MM-DD. Ghana is UTC. */
export function weekStart(date: Date | string = new Date()): string {
  const ms = typeof date === "string" ? parseDay(date.slice(0, 10)) : Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dow = (new Date(ms).getUTCDay() + 6) % 7; // Mon = 0
  return isoDay(ms - dow * DAY);
}

export const addWeeks = (week: string, n: number) => isoDay(parseDay(week) + n * 7 * DAY);

/** `count` consecutive week starts ending at (and including) `endWeek`, oldest first. */
export const weekRange = (endWeek: string, count: number) => Array.from({ length: count }, (_, i) => addWeeks(endWeek, i - (count - 1)));

export const isWeekStart = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(parseDay(v)) && weekStart(v) === v;
