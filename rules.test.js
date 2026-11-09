// Run with: node rules.test.js   (no install needed)
const fs = require("fs"), path = require("path"), vm = require("vm");
const root = __dirname;
const ctx = {module: {exports: {}}}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "checks.js"), "utf8") + "\nthis.E = module.exports;", ctx);
const E = ctx.E;
const SAMPLES = vm.runInNewContext(fs.readFileSync(path.join(root, "samples.js"), "utf8") + "\nSAMPLES");
let fails = 0; const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const rules = E.buildRuleset(E.SEED_RULES, []);

// 1. GSTIN checksum against a known-valid number
ok(E.validateGstin("27AAPFU0939F1ZV").ok, "known-valid GSTIN passes");
ok(!E.validateGstin("27AAPFU0939F1ZW").ok, "changing the last character fails");

// 2. The 20 made-up invoices: 4 clean raise nothing, 16 planted errors are all caught
let missed = 0, falseFlags = 0;
for (const s of SAMPLES) {
  const n = E.runChecks(s.inv, "2026-11-09", rules).findings.length;
  if (s.expect.length && !n) missed++;
  if (!s.expect.length && n) falseFlags++;
}
ok(SAMPLES.length === 20, "20 samples");
ok(missed === 0, "planted errors missed: " + missed);
ok(falseFlags === 0, "false flags on clean invoices: " + falseFlags);

// 3. Approval rules
const analyst = {name: "Riya Shah", role: "analyst"}, admin = {name: "Arjun Rao", role: "admin"};
const base = {id: "CR-T1", type: "slabs", title: "t", payload: {from: "2027-04-01", rates: [0, 5, 18], special: []}, reason: "r", sourceRef: "n", proposedBy: "Arjun Rao", status: "pending"};
const rumour = Object.assign({}, base, {sourceUrl: "https://example-news.test/x", sourceClass: "unverified", proposedBy: "Riya Shah"});
ok(!!E.whyNotApprove(rumour, admin), "rate change from a news link cannot be approved");
const official = Object.assign({}, base, {sourceUrl: "https://www.pib.gov.in/x", sourceClass: "official", proposedBy: "Riya Shah"});
ok(!!E.whyNotApprove(official, analyst), "an analyst cannot approve");
ok(!E.whyNotApprove(official, admin), "an admin can approve an official-source change from someone else");
ok(!!E.whyNotApprove(Object.assign({}, official, {proposedBy: "Arjun Rao"}), admin), "nobody approves their own change");
ok(E.classifySource("https://pib.gov.in.evil.com/x") !== "official", "look-alike domain is not official");
ok(E.classifySource("http://www.pib.gov.in/x") !== "official", "plain http is not official");

// 4. Approved change reaches the checker; revoking restores the baseline
const approved = Object.assign({}, official, {status: "approved", decidedBy: "Arjun Rao", decidedAt: new Date().toISOString(), payload: {key: "toleranceInr", value: 2}, type: "setting", sourceUrl: "", sourceClass: "internal"});
const r2 = E.buildRuleset(E.SEED_RULES, [approved]);
ok(r2.settings.toleranceInr.value === 2 && r2.version !== rules.version, "approved setting change applies and bumps the version");
const r3 = E.buildRuleset(E.SEED_RULES, [Object.assign({}, approved, {status: "revoked"})]);
ok(r3.settings.toleranceInr.value === rules.settings.toleranceInr.value, "revoked change is undone");
console.log(fails ? "FAILURES " + fails : "ALL PASSED"); process.exit(fails ? 1 : 0);
