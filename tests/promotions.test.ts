import assert from "node:assert/strict";
import { test } from "node:test";

import { computePromo, normalizeCode, orderTotal, type PromoRule } from "../src/lib/promotions/compute";

const base: PromoRule = {
  code: "TEA10",
  kind: "discount",
  discountType: "percent",
  value: 10,
  minSubtotal: 0,
  bundleProductIds: [],
  startsAt: null,
  endsAt: null,
  maxUses: null,
  uses: 0,
  isActive: true,
};
const lines = [
  { productId: "a", price: 45.5, quantity: 2 },
  { productId: "b", price: 30, quantity: 1 },
];

test("percent discount on the cart, exact pesewas", () => {
  const r = computePromo(base, lines);
  assert.deepEqual(r.ok && r.discount, 12.1); // 10% of 121.00
});

test("fixed discount never exceeds the subtotal", () => {
  const r = computePromo({ ...base, discountType: "fixed", value: 500 }, lines);
  assert.equal(r.ok && r.discount, 121);
});

test("minimum spend, dates, usage and inactive codes are rejected", () => {
  assert.equal(computePromo({ ...base, minSubtotal: 200 }, lines).ok, false);
  assert.equal(computePromo({ ...base, endsAt: new Date("2000-01-01") }, lines).ok, false);
  assert.equal(computePromo({ ...base, startsAt: new Date("2999-01-01") }, lines).ok, false);
  assert.equal(computePromo({ ...base, maxUses: 3, uses: 3 }, lines).ok, false);
  assert.equal(computePromo({ ...base, isActive: false }, lines).ok, false);
});

test("bundle needs every product and discounts one of each", () => {
  const bundle = { ...base, kind: "bundle" as const, bundleProductIds: ["a", "b"], discountType: "percent" as const, value: 20 };
  const r = computePromo(bundle, lines);
  assert.equal(r.ok && r.discount, 15.1); // 20% of (45.50 + 30)
  assert.equal(computePromo(bundle, [lines[0]]).ok, false);
});

test("orderTotal clamps the discount and adds delivery", () => {
  assert.equal(orderTotal(121, 12.1, 20), 128.9);
  assert.equal(orderTotal(50, 80, 10), 10);
  assert.equal(orderTotal(0.1, 0, 0.2), 0.3);
});

test("codes are case-insensitive", () => {
  assert.equal(normalizeCode(" tea 10 "), "TEA10");
});
