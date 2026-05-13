/**
 * Lightweight regression checks — keep escape rules aligned with index.html `escapeHtml`.
 * Run: npm test
 */
import assert from "node:assert/strict";

function escapeHtml(value){
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

assert.equal(escapeHtml("<b>"), "&lt;b&gt;");
assert.equal(escapeHtml(`a"b'c`), "a&quot;b&#039;c");
assert.equal(escapeHtml("&"), "&amp;");
console.log("tests/unit.mjs: escapeHtml checks passed.");
