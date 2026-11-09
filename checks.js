// ---- RULE ENGINE (pure functions; the same file runs in the page and in node tests) ----
const GST_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const STATES = {"01":"Jammu & Kashmir","02":"Himachal Pradesh","03":"Punjab","04":"Chandigarh","05":"Uttarakhand","06":"Haryana","07":"Delhi","08":"Rajasthan","09":"Uttar Pradesh","10":"Bihar","11":"Sikkim","12":"Arunachal Pradesh","13":"Nagaland","14":"Manipur","15":"Mizoram","16":"Tripura","17":"Meghalaya","18":"Assam","19":"West Bengal","20":"Jharkhand","21":"Odisha","22":"Chhattisgarh","23":"Madhya Pradesh","24":"Gujarat","26":"Dadra & Nagar Haveli and Daman & Diu","27":"Maharashtra","28":"Andhra Pradesh (old code)","29":"Karnataka","30":"Goa","31":"Lakshadweep","32":"Kerala","33":"Tamil Nadu","34":"Puducherry","35":"Andaman & Nicobar Islands","36":"Telangana","37":"Andhra Pradesh","38":"Ladakh","97":"Other Territory","99":"Centre Jurisdiction"};
const PAN_TYPES = "PCHFATBLJG";
const GST_START = "2017-07-01";
// Only pages on these domains count as an official source for a tax-rule change.
const OFFICIAL_DOMAINS = ["pib.gov.in", "cbic.gov.in", "cbic-gst.gov.in", "gst.gov.in", "gstcouncil.gov.in", "egazette.gov.in", "egazette.nic.in"];
const SETTING_KEYS = ["toleranceInr", "invoiceNoMaxLen"];

const r2 = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const inr = (x) => "₹" + Number(x).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2});
const num = (v) => { if (v === null || v === undefined || v === "") return null; const n = parseFloat(String(v).replace(/[₹,\s]/g, "")); return Number.isFinite(n) ? n : null; };
const isISO = (d) => /^\d{4}-\d{2}-\d{2}$/.test(String(d || "")) && !Number.isNaN(Date.parse(d + "T00:00:00Z"));
const dayBefore = (iso) => new Date(Date.parse(iso + "T00:00:00Z") - 86400000).toISOString().slice(0, 10);

// ---------- THE RULEBOOK (baseline v1.0). Approved change requests are applied on top of this. ----------
const SEED_RULES = {
  settings: {
    toleranceInr: {value: 1, label: "Arithmetic tolerance (₹)", note: "Differences up to this amount are ignored, because invoices round line by line or on the total.", sourceClass: "internal", sourceText: "Internal policy"},
    invoiceNoMaxLen: {value: 16, label: "Invoice number maximum length", note: "Letters, numbers, hyphen and slash only.", sourceClass: "cited", sourceText: "CGST Rules 2017, rule 46 (official link still to be attached)"}
  },
  periods: [
    {id: "RP-2017", from: "2017-07-01", rates: [0, 5, 12, 18, 28],
      special: [{rate: 0.25, note: "rough diamonds"}, {rate: 1.5, note: "diamond job work and similar"}, {rate: 3, note: "gold, silver and similar"}],
      sourceClass: "official", sourceText: "Notification 1/2017-Central Tax (Rate), 28 Jun 2017, as named in the official FAQ on the 56th Council decisions", sourceUrl: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2168426&reg=48&lang=2", approvedBy: "Baseline", approvedAt: ""},
    {id: "RP-2025", from: "2025-09-22", rates: [0, 5, 18],
      special: [{rate: 0.25, note: "rough diamonds"}, {rate: 1.5, note: "diamond job work and similar"}, {rate: 3, note: "gold, silver and similar"}, {rate: 28, note: "tobacco goods kept their old rate at the 22 Sep 2025 change; confirm current status"}, {rate: 40, note: "de-merit rate for a select few goods and services"}],
      sourceClass: "official", sourceText: "Notification 9/2025-Central Tax (Rate), 17 Sep 2025; PIB release on the 56th GST Council: standard 18%, merit 5%, de-merit 40%", sourceUrl: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163555&reg=48&lang=2", approvedBy: "Baseline", approvedAt: ""}
  ],
  hsnRates: [
    {id: "HR-8517", hsn: "8517", rate: 18, from: "2025-09-22", note: "Phones and telecom equipment", sourceClass: "demo", sourceText: "Demo value, not yet checked against the rate schedule"},
    {id: "HR-8471", hsn: "8471", rate: 18, from: "2025-09-22", note: "Computers and laptops", sourceClass: "demo", sourceText: "Demo value, not yet checked against the rate schedule"},
    {id: "HR-3004", hsn: "3004", rate: 5, from: "2025-09-22", note: "Medicines in dosage form", sourceClass: "demo", sourceText: "Demo value, not yet checked against the rate schedule"}
  ]
};

// ---------- Sources ----------
function classifySource(url) {
  try {
    const u = new URL(String(url || "").trim());
    if (u.protocol !== "https:") return "unverified";
    const h = u.hostname.toLowerCase();
    return OFFICIAL_DOMAINS.some((d) => h === d || h.endsWith("." + d)) ? "official" : "unverified";
  } catch (e) { return "unverified"; }
}

// ---------- Change requests ----------
function validateProposal(p) {
  const errs = [];
  if (!["slabs", "hsn", "setting"].includes(p.type)) errs.push("Choose what kind of change this is.");
  if (!String(p.title || "").trim()) errs.push("Give the change a short title.");
  if (!String(p.reason || "").trim()) errs.push("Say why the change is needed.");
  const d = p.payload || {};
  if (p.type === "slabs") {
    if (!isISO(d.from)) errs.push("Enter the date the new rates start.");
    if (!Array.isArray(d.rates) || !d.rates.length || d.rates.some((x) => !Number.isFinite(x) || x < 0 || x > 100)) errs.push("Enter the standard rates as numbers between 0 and 100, for example 0, 5, 18.");
    if (d.special && (!Array.isArray(d.special) || d.special.some((s) => !Number.isFinite(s.rate) || s.rate < 0 || s.rate > 100))) errs.push("Special rates need a number, then a note.");
  }
  if (p.type === "hsn") {
    if (!/^\d{4}$/.test(String(d.hsn || ""))) errs.push("Enter the first 4 digits of the HSN code.");
    if (!Number.isFinite(d.rate) || d.rate < 0 || d.rate > 100) errs.push("Enter the GST rate as a number between 0 and 100.");
    if (!isISO(d.from)) errs.push("Enter the date the rate starts.");
  }
  if (p.type === "setting") {
    if (!SETTING_KEYS.includes(d.key)) errs.push("Choose a setting.");
    if (!Number.isFinite(d.value) || d.value <= 0) errs.push("Enter a value greater than 0.");
  }
  if (p.type === "slabs" || p.type === "hsn") {
    if (!String(p.sourceUrl || "").trim()) errs.push("Add the link to the notice that says this.");
    else { try { const u = new URL(p.sourceUrl); if (u.protocol !== "https:" && u.protocol !== "http:") errs.push("Use a web address that starts with https://."); } catch (e) { errs.push("The source link is not a valid web address."); } }
  }
  return errs;
}
// Returns "" when the person may approve, otherwise the reason they may not.
function whyNotApprove(p, actor) {
  if (p.status !== "pending") return "This change has already been decided.";
  if (actor.role !== "admin") return "Only an admin can approve changes.";
  if (actor.name === p.proposedBy) return "You proposed this change, so someone else must approve it.";
  if ((p.type === "slabs" || p.type === "hsn") && p.sourceClass !== "official") return "Tax-rule changes need an official source (PIB, CBIC, GST Council or the GST portal). News and social posts do not count. Reject it, or ask the proposer for the official notice.";
  return "";
}
function whyNotReject(p, actor) {
  if (p.status !== "pending") return "This change has already been decided.";
  if (actor.role !== "admin") return "Only an admin can reject changes.";
  return "";
}
function applyProposal(rules, p) {
  const r = JSON.parse(JSON.stringify(rules)), d = p.payload || {};
  const meta = {sourceClass: p.sourceUrl ? classifySource(p.sourceUrl) : "internal", sourceText: p.sourceRef || p.title, sourceUrl: p.sourceUrl || "", approvedBy: p.decidedBy, approvedAt: p.decidedAt, via: p.id};
  if (p.type === "slabs") r.periods.push(Object.assign({id: p.id, from: d.from, rates: d.rates.slice(), special: (d.special || []).slice()}, meta));
  if (p.type === "hsn") r.hsnRates.push(Object.assign({id: p.id, hsn: d.hsn, rate: d.rate, from: d.from, note: d.note || ""}, meta));
  if (p.type === "setting" && r.settings[d.key]) r.settings[d.key] = Object.assign({}, r.settings[d.key], {value: d.value, changedBy: p.decidedBy, changedAt: p.decidedAt, via: p.id});
  return r;
}
function buildRuleset(seed, proposals) {
  let r = JSON.parse(JSON.stringify(seed));
  const ok = proposals.filter((p) => p.status === "approved").sort((a, b) => String(a.decidedAt).localeCompare(String(b.decidedAt)));
  ok.forEach((p) => { r = applyProposal(r, p); });
  r.periods.sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
  r.version = "1." + ok.length; r.applied = ok.map((p) => p.id);
  return r;
}
function periodFor(rules, date) {
  let p = null;
  rules.periods.forEach((x) => { if (x.from <= date && (!p || x.from >= p.from)) p = x; });
  return p;
}
function hsnRefFor(rules, hsn4, date) {
  let h = null;
  rules.hsnRates.forEach((x) => { if (x.hsn === hsn4 && x.from <= date && (!h || x.from >= h.from)) h = x; });
  return h;
}
function lastSlabUntil(rules, rate, period) {
  const before = rules.periods.filter((x) => x.from < period.from && x.rates.includes(rate)).sort((a, b) => (a.from < b.from ? -1 : 1));
  if (!before.length) return null;
  const last = before[before.length - 1];
  const next = rules.periods.filter((x) => x.from > last.from).sort((a, b) => (a.from < b.from ? -1 : 1))[0];
  return next ? dayBefore(next.from) : null;
}

// ---------- GSTIN ----------
function gstinCheckChar(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const c = GST_CHARS.indexOf(first14[i]);
    const p = c * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return GST_CHARS[(36 - (sum % 36)) % 36];
}
function validateGstin(raw) {
  const g = String(raw || "").trim().toUpperCase();
  if (!g) return {ok: false, kind: "missing", problem: "No GSTIN entered", detail: "", fix: "Copy the 15-character GSTIN from the invoice header."};
  if (g.length !== 15) return {ok: false, kind: "length", problem: "GSTIN has " + g.length + " characters, it should have 15", detail: "A GSTIN is always 15 characters long.", fix: "Compare it with the invoice and look for a missing or extra character."};
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return {ok: false, kind: "format", problem: "GSTIN is not in the right pattern", detail: "The pattern is 2 digits (state), 10 characters (PAN), 1 digit or letter, the letter Z, and 1 check character.", fix: "Check letters and digits are in the right positions, for example 0 and O often get mixed up."};
  const sc = g.slice(0, 2);
  if (!STATES[sc]) return {ok: false, kind: "state", problem: "State code " + sc + " does not exist", detail: "The first two digits of a GSTIN name the state.", fix: "Ask the supplier to confirm the GSTIN."};
  if (!PAN_TYPES.includes(g[5])) return {ok: false, kind: "pan", problem: "The PAN inside this GSTIN has an unknown holder type", detail: "The 4th character of a PAN must be one of P, C, H, F, A, T, B, L, J, G.", fix: "Ask the supplier to confirm the GSTIN."};
  if (gstinCheckChar(g.slice(0, 14)) !== g[14]) return {ok: false, kind: "checksum", problem: "The last character does not match the other 14", detail: "The final character of a GSTIN is calculated from the first 14. A mismatch usually means a typo or a made-up number.", fix: "Re-read the GSTIN from the invoice or ask the supplier to send it again."};
  return {ok: true, state: sc, stateName: STATES[sc]};
}

function normalise(inv) {
  const items = (inv.items || []).map((it) => ({
    desc: String(it.desc || "").trim(), hsn: String(it.hsn || "").replace(/\s/g, ""),
    qty: num(it.qty), rate: num(it.rate), taxable: num(it.taxable), gstRate: num(it.gstRate)
  })).filter((it) => it.desc || it.hsn || it.qty !== null || it.rate !== null || it.taxable !== null || it.gstRate !== null);
  return {
    invoiceNo: String(inv.invoiceNo || "").trim(), date: String(inv.date || "").trim(),
    supplierGstin: String(inv.supplierGstin || "").trim().toUpperCase(), buyerGstin: String(inv.buyerGstin || "").trim().toUpperCase(),
    items, cgst: num(inv.cgst), sgst: num(inv.sgst), igst: num(inv.igst), total: num(inv.total)
  };
}

function runChecks(input, today, rules) {
  rules = rules || SEED_RULES;
  const inv = normalise(input);
  const tol = rules.settings.toleranceInr.value, maxLen = rules.settings.invoiceNoMaxLen.value;
  const todayStr = today || new Date().toISOString().slice(0, 10);
  const findings = [], passes = [];
  const add = (sev, id, title, detail, fix, where, src) => findings.push({sev, id, title, detail, fix, where: where || "", src: src || null});
  const pass = (id, title) => passes.push({id, title});
  const lineNo = (i) => "Line " + (i + 1);
  const fmtD = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"});

  const sup = validateGstin(inv.supplierGstin);
  if (sup.ok) pass("gstin_supplier", "Supplier GSTIN is well formed (" + sup.stateName + ")");
  else add("error", "gstin_supplier", "Supplier GSTIN: " + sup.problem, sup.detail, sup.fix, "Supplier GSTIN");
  let buy = null;
  if (!inv.buyerGstin) add("warn", "gstin_buyer", "Your GSTIN is missing on the invoice", "Without your GSTIN on a business invoice you cannot claim input tax credit on it.", "Ask the supplier to reissue the invoice with your GSTIN.", "Buyer GSTIN");
  else {
    buy = validateGstin(inv.buyerGstin);
    if (buy.ok) pass("gstin_buyer", "Buyer GSTIN is well formed (" + buy.stateName + ")");
    else add("error", "gstin_buyer", "Buyer GSTIN: " + buy.problem, buy.detail, buy.fix, "Buyer GSTIN");
  }
  if (inv.supplierGstin && inv.supplierGstin === inv.buyerGstin) add("error", "gstin_same", "Supplier and buyer have the same GSTIN", "An invoice from a business to itself is not a supplier invoice.", "Check which GSTIN belongs to whom.", "GSTINs");
  else pass("gstin_same", "Supplier and buyer are different parties");

  const invSrc = {text: rules.settings.invoiceNoMaxLen.sourceText, cls: rules.settings.invoiceNoMaxLen.sourceClass};
  if (!inv.invoiceNo) add("error", "inv_no", "Invoice number is missing", "Every tax invoice carries a unique number.", "Ask the supplier for the invoice number.", "Invoice no.");
  else if (inv.invoiceNo.length > maxLen || !/^[A-Za-z0-9\/-]+$/.test(inv.invoiceNo)) add("error", "inv_no", "Invoice number is not in a valid format", "Allowed: at most " + maxLen + " characters, using letters, numbers, hyphen and slash.", "Ask the supplier for a corrected invoice number.", "Invoice no.", invSrc);
  else pass("inv_no", "Invoice number format is valid");

  if (!isISO(inv.date)) add("error", "inv_date", "Invoice date is missing or unreadable", "", "Enter the date shown on the invoice.", "Invoice date");
  else if (inv.date > todayStr) add("error", "inv_date", "Invoice is dated in the future (" + inv.date + ")", "A future date usually means a typo in the year or month.", "Ask the supplier to confirm the date.", "Invoice date");
  else if (inv.date < GST_START) add("error", "inv_date", "Invoice is dated before GST began (1 July 2017)", "", "Check the date with the supplier.", "Invoice date");
  else pass("inv_date", "Invoice date is plausible");

  if (!inv.items.length) add("error", "items", "No line items", "", "Add at least one line item.", "Items");
  const period = isISO(inv.date) ? periodFor(rules, inv.date) : null;
  const periodSrc = period ? {text: period.sourceText, url: period.sourceUrl, cls: period.sourceClass, id: period.id} : null;
  let hsnBad = 0, slabBad = 0, refBad = 0, mathBad = 0;
  inv.items.forEach((it, i) => {
    const w = lineNo(i) + (it.desc ? " · " + it.desc : "");
    if (!/^(\d{4}|\d{6}|\d{8})$/.test(it.hsn)) { hsnBad++; add("error", "hsn_format", "HSN code is " + (it.hsn ? "not 4, 6 or 8 digits (" + it.hsn + ")" : "missing"), "HSN codes are 4, 6 or 8 digits long.", "Look the product up in an HSN finder and ask the supplier to correct it.", w); }
    if (it.gstRate === null) { slabBad++; add("error", "rate_slab", "GST rate is missing", "", "Enter the GST rate shown for this line.", w); }
    else if (period) {
      const special = period.special.find((s) => s.rate === it.gstRate);
      if (period.rates.includes(it.gstRate)) {
        const hr = hsnRefFor(rules, it.hsn.slice(0, 4), inv.date);
        if (hr && hr.rate !== it.gstRate) { refBad++; add("warn", "rate_ref", "Rate " + it.gstRate + "% differs from the usual " + hr.rate + "% for HSN " + hr.hsn, "Some products under this code have different rates, so this is a prompt to check, not a verdict.", "Confirm the exact product's rate in the official GST rate schedule.", w, {text: hr.sourceText, url: hr.sourceUrl, cls: hr.sourceClass, id: hr.id}); }
      } else if (special) {
        slabBad++; add("warn", "rate_special", it.gstRate + "% is a special rate used only for certain goods", "Applies to: " + special.note + ".", "Confirm this product really belongs in that category.", w, periodSrc);
      } else {
        slabBad++;
        const until = lastSlabUntil(rules, it.gstRate, period);
        add("error", "rate_slab", it.gstRate + "% is not a GST rate in use for this invoice date", (until ? it.gstRate + "% was a slab until " + fmtD(until) + ". " : "") + "Rates in use for invoices dated " + fmtD(inv.date) + ": " + period.rates.join("%, ") + "%.", "Ask the supplier which rate applies and for a corrected invoice.", w, periodSrc);
      }
    }
    if (it.qty !== null && it.rate !== null && it.taxable !== null && Math.abs(r2(it.qty * it.rate) - it.taxable) > tol) {
      mathBad++; add("error", "line_math", "Quantity × price is " + inr(r2(it.qty * it.rate)) + " but the line says " + inr(it.taxable), "Difference " + inr(Math.abs(r2(it.qty * it.rate) - it.taxable)) + ".", "Ask the supplier which figure is right.", w);
    }
  });
  if (inv.items.length) {
    if (!hsnBad) pass("hsn_format", "HSN codes are in a valid format");
    if (!slabBad) pass("rate_slab", "GST rates are rates in use" + (period ? " (" + period.id + ")" : ""));
    if (!refBad && !slabBad) pass("rate_ref", "Rates match the product reference where one exists");
    if (!mathBad) pass("line_math", "Quantity × price matches each line value");
  }

  const cg = inv.cgst || 0, sg = inv.sgst || 0, ig = inv.igst || 0;
  const taxable = r2(inv.items.reduce((s, it) => s + (it.taxable || 0), 0));
  const expectedTax = r2(inv.items.reduce((s, it) => s + (it.taxable || 0) * (it.gstRate || 0) / 100, 0));
  const statedTax = r2(cg + sg + ig);
  if (sup.ok && buy && buy.ok) {
    const intra = sup.state === buy.state;
    if (intra && ig > 0) add("error", "tax_split", "Both parties are in " + sup.stateName + ", but the invoice charges IGST", "Sales within one state carry CGST and SGST, not IGST. Exception: goods delivered to a different state, so check the place of supply.", "Ask the supplier to correct the tax type.", "Taxes");
    else if (!intra && (cg > 0 || sg > 0)) add("error", "tax_split", "Supplier is in " + sup.stateName + " and buyer in " + buy.stateName + ", but the invoice charges CGST/SGST", "Sales between states carry IGST. Exception: goods delivered inside the supplier's state, so check the place of supply.", "Ask the supplier to correct the tax type.", "Taxes");
    else if (statedTax > 0) pass("tax_split", intra ? "Tax type fits: CGST + SGST within " + sup.stateName : "Tax type fits: IGST between states");
  }
  if (cg > 0 || sg > 0) {
    if (Math.abs(cg - sg) > 0.02) add("error", "cgst_sgst", "CGST (" + inr(cg) + ") and SGST (" + inr(sg) + ") are not equal", "They are always charged at equal rates on the same value.", "Ask the supplier to correct the amounts.", "Taxes");
    else pass("cgst_sgst", "CGST and SGST are equal");
  }
  if (inv.items.length && inv.items.every((it) => it.taxable !== null && it.gstRate !== null)) {
    if (Math.abs(statedTax - expectedTax) > tol) {
      const diff = r2(statedTax - expectedTax);
      add("error", "tax_total", "Tax billed is " + inr(statedTax) + ", expected " + inr(expectedTax), "From the line values and rates, tax should be " + inr(expectedTax) + ". The invoice " + (diff > 0 ? "over" : "under") + "-charges tax by " + inr(Math.abs(diff)) + ".", "Ask the supplier to explain the difference before paying.", "Taxes");
    } else pass("tax_total", "Tax billed matches line values × rates");
  }
  const expectedTotal = r2(taxable + statedTax);
  if (inv.total !== null && inv.items.length) {
    if (Math.abs(expectedTotal - inv.total) > tol) add("error", "grand_total", "Invoice total is " + inr(inv.total) + ", but line values plus tax come to " + inr(expectedTotal), "Difference " + inr(Math.abs(expectedTotal - inv.total)) + ".", "Ask the supplier which total is correct.", "Total");
    else pass("grand_total", "Invoice total matches values plus tax");
  } else if (inv.total === null) add("warn", "grand_total", "Invoice total is missing", "", "Enter the total shown on the invoice.", "Total");

  const errors = findings.filter((f) => f.sev === "error").length, warns = findings.filter((f) => f.sev === "warn").length;
  return {findings, passes, errors, warns, rulesVersion: rules.version || "1.0", totals: {taxable, expectedTax, statedTax, expectedTotal, statedTotal: inv.total}};
}

// Lets the Node tests load this file. Browsers ignore it.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {STATES, OFFICIAL_DOMAINS, SEED_RULES, classifySource, validateProposal, whyNotApprove, whyNotReject, applyProposal, buildRuleset, periodFor, validateGstin, gstinCheckChar, normalise, runChecks};
}
