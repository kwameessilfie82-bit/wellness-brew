import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addMoney,
  compareMoney,
  lineTotal,
  paidStatus,
  subtractMoney,
  sumLines,
} from "../src/lib/orders/money";

describe("money (integer pesewas)", () => {
  it("adds without float drift", () => {
    assert.equal(0.1 + 0.2 === 0.3, false); // the bug we're guarding against
    assert.equal(addMoney(0.1, 0.2), 0.3);
    assert.equal(addMoney(19.99, 0.01, 80), 100);
  });

  it("multiplies and sums lines exactly", () => {
    assert.equal(lineTotal(19.99, 3), 59.97);
    assert.equal(sumLines([{ price: 0.1, quantity: 3 }, { price: 1.15, quantity: 7 }]), 8.35);
  });

  it("subtracts exactly", () => {
    assert.equal(subtractMoney(100, 99.99), 0.01);
    assert.equal(subtractMoney(0.3, 0.1), 0.2);
  });

  it("compares to the pesewa", () => {
    assert.equal(compareMoney(0.1 + 0.2, 0.3), 0);
    assert.ok(compareMoney(80.01, 80) > 0);
    assert.ok(compareMoney(79.99, 80) < 0);
  });

  it("derives payment status", () => {
    assert.equal(paidStatus(0, 50), "unpaid");
    assert.equal(paidStatus(25, 50), "partially_paid");
    assert.equal(paidStatus(addMoney(0.1, 0.2), 0.3), "paid");
    assert.equal(paidStatus(60, 50), "paid");
  });
});
