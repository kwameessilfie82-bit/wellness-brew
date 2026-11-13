/**
 * The pour story as a function of `p` (0 → 1). The hero autoplays p over
 * POUR_SECONDS once the scene is ready — it never gates scrolling, so shoppers
 * can head straight to the products.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (t: number) => t * t * (3 - 2 * t);

/** 0 → 1 as p moves from a to b, eased. */
export const seg = (p: number, a: number, b: number) => smooth(clamp01((p - a) / (b - a)));

export const POUR_SECONDS = 11;

export function pourState(p: number) {
  const flowStart = seg(p, 0.28, 0.34);
  const flowEnd = seg(p, 0.8, 0.86);
  return {
    move: seg(p, 0.06, 0.22),
    tilt: seg(p, 0.22, 0.32) - seg(p, 0.82, 0.92),
    /** Stream front falling from the spout (0 → 1). */
    flowStart,
    /** Stream tail leaving the spout once pouring stops (0 → 1). */
    flowEnd,
    flow: flowStart - flowEnd,
    fill: seg(p, 0.31, 0.86),
    settle: seg(p, 0.86, 1),
    steam: seg(p, 0.6, 1),
  };
}
