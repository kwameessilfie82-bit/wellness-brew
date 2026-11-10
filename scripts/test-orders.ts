/**
 * Unit tests for the pure order modules. Run: npx tsx scripts/test-orders.ts
 */
import assert from "node:assert/strict";

import { buildOrderMessage, fillTemplate, WA_TEXT_MAX_ENCODED } from "../src/lib/orders/message";
import { maskPhone, normalizePhone } from "../src/lib/orders/phone";
import {
  canTransition,
  deriveCompletion,
  nextStatuses,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
} from "../src/lib/orders/status";

let passed = 0;
const test = (name: string, fn: () => void) => {
  fn();
  passed++;
  console.log("ok -", name);
};

test("phone normalisation", () => {
  for (const v of ["054 073 4749", "0540734749", "+233 54 073 4749", "233540734749", "00233540734749", "540734749"]) {
    assert.equal(normalizePhone(v), "+233540734749", v);
  }
  assert.equal(normalizePhone("+44 7700 900123"), "+447700900123");
  assert.equal(normalizePhone("12345"), null);
  assert.equal(normalizePhone("05407347"), null);
  assert.equal(normalizePhone(""), null);
  assert.equal(maskPhone("+233540734749"), "+233 •• ••• 4749");
});

test("transition map is closed and sane", () => {
  for (const [from, tos] of Object.entries(ORDER_TRANSITIONS)) {
    for (const to of tos) assert.ok(ORDER_STATUSES.includes(to), `${from}->${to}`);
  }
  assert.ok(canTransition("awaiting_customer", "received"));
  assert.ok(!canTransition("delivered", "preparing"));
  assert.ok(!canTransition("cancelled", "confirmed"));
  assert.ok(!canTransition("delivered", "out_for_delivery"));
  assert.ok(canTransition("delivered", "out_for_delivery", { undo: true }));
  assert.ok(!nextStatuses("confirmed", "pickup").includes("out_for_delivery"));
  assert.ok(!nextStatuses("confirmed", "delivery").includes("ready_for_pickup"));
});

test("completion requires delivered AND paid", () => {
  assert.equal(deriveCompletion("delivered", "paid"), "completed");
  assert.equal(deriveCompletion("picked_up", "paid"), "completed");
  assert.equal(deriveCompletion("delivered", "unpaid"), "delivered");
  assert.equal(deriveCompletion("confirmed", "paid"), "confirmed");
});

test("template fill keeps unknown placeholders and drops empty lines", () => {
  assert.equal(fillTemplate("Hi {name} {x}", { name: "Ama" }), "Hi Ama {x}");
  const msg = buildOrderMessage("A {orderNumber}\nGift: {gift}\n{items}\n{link}", { orderNumber: "WB-1", gift: "", link: "L" }, [
    { name: "Tea", quantity: 2, unitPrice: "GHS 80", lineTotal: "GHS 160" },
  ]);
  assert.equal(msg, "A WB-1\n• 2 × Tea (GHS 80) = GHS 160\nL");
});

test("long carts are truncated but keep the link", () => {
  const items = Array.from({ length: 80 }, (_, i) => ({
    name: `Hibiscus Cloves Ginger Special Blend ${i}`,
    quantity: 3,
    unitPrice: "GHS 100",
    lineTotal: "GHS 300",
  }));
  const link = "https://www.wellnessgroupgh.com/o/abcdefghijklmnopqrstuv";
  const msg = buildOrderMessage("Order {orderNumber}\n{items}\nKwame's order — ✓\n{link}", { orderNumber: "WB-2611-0042", link }, items);
  assert.ok(encodeURIComponent(msg).length <= WA_TEXT_MAX_ENCODED, String(encodeURIComponent(msg).length));
  assert.ok(msg.includes(link));
  assert.match(msg, /\+ \d+ more items \(see link\)/);
  assert.ok(msg.includes("Kwame's"));
});

console.log(`\n${passed} passed`);
