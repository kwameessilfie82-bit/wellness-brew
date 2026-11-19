import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { safeNextPath } from "../src/lib/auth-redirect";

describe("safeNextPath", () => {
  it("keeps same-origin relative paths", () => {
    assert.equal(safeNextPath("/admin"), "/admin");
    assert.equal(safeNextPath("/shop/green-tea?ref=home#top"), "/shop/green-tea?ref=home#top");
  });

  it("falls back for empty input", () => {
    assert.equal(safeNextPath(null), "/");
    assert.equal(safeNextPath(undefined, "/account"), "/account");
    assert.equal(safeNextPath(""), "/");
  });

  it("rejects open-redirect payloads", () => {
    for (const evil of [
      "//evil.com",
      "/\\evil.com",
      "@evil.com",
      "/@evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "/redirect?u=https://evil.com",
      "evil.com",
      " /admin",
    ]) {
      assert.equal(safeNextPath(evil), "/", `should reject ${JSON.stringify(evil)}`);
    }
  });
});
