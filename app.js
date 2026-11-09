// Which app is on this page. index.html has the customer checker, admin/index.html has the rules console,
// and the single-file Claude version has both and switches on the URL hash.
const IS_CUST = !!document.getElementById("app-customer"), IS_ADMIN = !!document.getElementById("app-admin");
const SINGLE = document.body.hasAttribute("data-single");
// A missing element returns a detached stand-in so code for the other app never throws on this page.
const $ = (s, r = document) => r.querySelector(s) || document.createElement("div");
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (k === "class") e.className = v; else if (k === "text") e.textContent = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, ""); else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
  return e;
}
const todayISO = () => new Date().toLocaleDateString("en-CA");
const fmtDate = (d) => d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", {day: "numeric", month: "short", year: "numeric", timeZone: "UTC"}) : "";
const fmtTime = (t) => t ? new Date(t).toLocaleString("en-IN", {day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit"}) : "";
const safeUrl = (u) => { try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:" ? x.href : ""; } catch (e) { return ""; } };
const CLASS_LABEL = {official: ["Official source", "good"], cited: ["Cited, link pending", "warn"], internal: ["Internal policy", "neutral"], demo: ["Demo value", "warn"], unverified: ["Not an official source", "error"], none: ["No source", "neutral"]};
const srcPill = (cls) => { const [t, k] = CLASS_LABEL[cls] || CLASS_LABEL.none; return h("span", {class: "pill " + k}, t); };
function srcLink(text, url) { const u = safeUrl(url); return u ? h("a", {href: u, target: "_blank", rel: "noopener noreferrer"}, text) : h("span", {}, text); }

// ---------- demo users and workflow state ----------
const USERS = {analyst: {key: "analyst", name: "Riya Shah", role: "analyst", title: "Compliance analyst"}, admin: {key: "admin", name: "Arjun Rao", role: "admin", title: "Compliance admin"}};
const STORE_KEY = "invoicecheck.workflow.v1";
const TABS = ["rulebook", "changes", "sources", "activity"];
const ev = (actor, action, ref, note) => ({t: new Date().toISOString(), actor, action, ref, note: note || ""});
function seedState() {
  const t = new Date().toISOString();
  return {
    role: "analyst",
    proposals: [
      {id: "CR-001", type: "setting", title: "Raise arithmetic tolerance to ₹2", payload: {key: "toleranceInr", value: 2}, reason: "Several suppliers round every line, so a ₹1 limit flags invoices that are fine.", sourceUrl: "", sourceRef: "", sourceClass: "internal", proposedBy: "Riya Shah", proposedAt: t, status: "pending", decidedBy: null, decidedAt: null, decisionNote: "", demo: true},
      {id: "CR-002", type: "slabs", title: "Add a 28% standard slab from 1 Dec 2026", payload: {from: "2026-12-01", rates: [0, 5, 18, 28], special: []}, reason: "Heard in a trade WhatsApp group, and a news site is reporting it.", sourceUrl: "https://example-news.test/gst-28-percent-slab", sourceRef: "News article, no notification number", sourceClass: "unverified", proposedBy: "Riya Shah", proposedAt: t, status: "pending", decidedBy: null, decidedAt: null, decisionNote: "", demo: true}
    ],
    audit: [ev("System", "Published", "Rulebook v1.0", "Baseline rulebook loaded"), ev("Riya Shah", "Proposed", "CR-001", "Raise arithmetic tolerance to ₹2 (demo example)"), ev("Riya Shah", "Proposed", "CR-002", "Add a 28% standard slab from 1 Dec 2026 (demo example)")]
  };
}
function loadState() {
  try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const s = JSON.parse(raw); if (s && Array.isArray(s.proposals) && Array.isArray(s.audit) && USERS[s.role]) return s; } } catch (e) {}
  return seedState();
}
let state = loadState();
let rules = buildRuleset(SEED_RULES, state.proposals);
const me = () => USERS[state.role];
function commit() {
  rules = buildRuleset(SEED_RULES, state.proposals);
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  renderAll();
}
function nextId() { return "CR-" + String(state.proposals.length + 1).padStart(3, "0"); }

function propose(form) {
  form.sourceUrl = String(form.sourceUrl || "").trim();
  const errs = validateProposal(form);
  if (errs.length) return {ok: false, errors: errs};
  const p = Object.assign({}, form, {id: nextId(), sourceClass: form.sourceUrl ? classifySource(form.sourceUrl) : "internal", proposedBy: me().name, proposedAt: new Date().toISOString(), status: "pending", decidedBy: null, decidedAt: null, decisionNote: ""});
  state.proposals.push(p);
  state.audit.push(ev(me().name, "Proposed", p.id, p.title));
  commit();
  return {ok: true, p};
}
function decide(id, verdict, note) {
  const p = state.proposals.find((x) => x.id === id); if (!p) return;
  const why = verdict === "approved" ? whyNotApprove(p, me()) : whyNotReject(p, me());
  if (why) return why;
  p.status = verdict; p.decidedBy = me().name; p.decidedAt = new Date().toISOString(); p.decisionNote = note || "";
  state.audit.push(ev(me().name, verdict === "approved" ? "Approved" : "Rejected", p.id, note || ""));
  commit();
}
function revoke(id, note) {
  const p = state.proposals.find((x) => x.id === id);
  if (!p || p.status !== "approved" || me().role !== "admin") return;
  p.status = "revoked"; p.decisionNote = (p.decisionNote ? p.decisionNote + " | " : "") + "Revoked: " + note;
  state.audit.push(ev(me().name, "Revoked", p.id, note));
  commit();
}

// ---------- tabs ----------
function showTab(name, push) {
  if (!TABS.includes(name)) name = "rulebook";
  TABS.forEach((t) => { $("#p-" + t).hidden = t !== name; const b = $("#t-" + t); b.setAttribute("aria-selected", String(t === name)); b.tabIndex = t === name ? 0 : -1; });
  if (push) { try { location.hash = (SINGLE ? "admin/" : "") + name; } catch (e) {} }
}
$("#tabs").addEventListener("click", (e) => { const b = e.target.closest("button[data-tab]"); if (b) showTab(b.dataset.tab, true); });
$("#tabs").addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const cur = TABS.findIndex((t) => $("#t-" + t).getAttribute("aria-selected") === "true");
  const nx = TABS[(cur + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
  showTab(nx, true); $("#t-" + nx).focus();
});
function route() {
  if (SINGLE) { const adm = location.hash.startsWith("#admin"); $("#app-customer").hidden = adm; $("#app-admin").hidden = !adm; if (adm) showTab(location.hash.slice(7)); window.scrollTo(0, 0); }
  else if (IS_ADMIN) showTab(location.hash.slice(1));
}
window.addEventListener("hashchange", route);
// If the rulebook is changed in the admin console in another tab, the checker here picks it up live.
window.addEventListener("storage", (e) => { if (e.key === STORE_KEY && IS_CUST) { state = loadState(); rules = buildRuleset(SEED_RULES, state.proposals); renderChecker(); } });

// ---------- role ----------
Object.values(USERS).forEach((u) => $("#role").append(h("option", {value: u.key}, u.name + ", " + u.title)));
$("#role").value = state.role;
$("#role").addEventListener("change", () => { state.role = $("#role").value; commit(); });

// ---------- checker ----------
const FIELDS = ["invoiceNo", "date", "supplierName", "supplierGstin", "buyerName", "buyerGstin", "cgst", "sgst", "igst", "total"];
const COLS = [["desc", "Description", "desc", ""], ["hsn", "HSN", "", "mono"], ["qty", "Qty", "", "mono num"], ["rate", "Price ₹", "", "mono num"], ["taxable", "Value ₹", "", "mono num"], ["gstRate", "GST %", "", "mono num"]];
function toISO(d) {
  d = String(d || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = d.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return y + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); }
  return "";
}
function itemRow(it) {
  const row = h("div", {class: "row", role: "group", "aria-label": "Line item"});
  COLS.forEach(([k, label, cls, ic]) => {
    const id = "i" + Math.random().toString(36).slice(2, 8);
    row.append(h("div", {class: "cell " + cls}, h("label", {for: id}, label), h("input", {id, "data-k": k, class: ic, value: it && it[k] != null ? it[k] : "", autocomplete: "off", inputmode: ["qty", "rate", "taxable", "gstRate"].includes(k) ? "decimal" : null})));
  });
  row.append(h("button", {class: "btn x", type: "button", "aria-label": "Remove line", onclick: () => { row.remove(); live(); }}, "×"));
  return row;
}
function itemsHead() {
  const r = h("div", {class: "row head", "aria-hidden": "true"});
  COLS.forEach(([, label]) => r.append(h("div", {style: label === "Description" || label === "HSN" ? "" : "text-align:right"}, label)));
  r.append(h("div")); return r;
}
function fillForm(inv) {
  FIELDS.forEach((k) => { $("#f-" + k).value = inv && inv[k] != null && inv[k] !== 0 ? inv[k] : (inv && inv[k] === 0 ? "0" : ""); });
  if (inv && inv.date) $("#f-date").value = toISO(inv.date);
  const box = $("#items"); box.replaceChildren(itemsHead());
  const items = inv && inv.items && inv.items.length ? inv.items : [{}];
  items.forEach((it) => box.append(itemRow(it)));
  live();
}
function readForm() {
  const inv = {};
  FIELDS.forEach((k) => { inv[k] = $("#f-" + k).value; });
  inv.items = $$("#items .row:not(.head)").map((row) => { const it = {}; row.querySelectorAll("input").forEach((i) => { it[i.dataset.k] = i.value; }); return it; });
  return inv;
}
function strip(id, value) {
  const el = $("#s-" + id), g = String(value || "").trim().toUpperCase(); el.replaceChildren();
  if (g.length !== 15) return;
  const sc = g.slice(0, 2), chkOk = gstinCheckChar(g.slice(0, 14)) === g[14];
  el.append(h("span", {class: STATES[sc] ? "" : "bad", title: "State"}, sc + " " + (STATES[sc] || "no such state")), h("span", {title: "PAN of the business"}, g.slice(2, 12)), h("span", {title: "Registration number for this PAN in the state"}, g[12]), h("span", {title: "Always Z"}, g[13]), h("span", {class: chkOk ? "ok" : "bad", title: "Check character"}, g[14] + (chkOk ? " ✓" : " ✗")));
}
let lastRes = null, timer = null;
function live() { clearTimeout(timer); timer = setTimeout(renderChecker, 120); }
function renderChecker() {
  const inv = readForm();
  strip("supplierGstin", inv.supplierGstin); strip("buyerGstin", inv.buyerGstin);
  const res = runChecks(inv, todayISO(), rules); lastRes = {res, inv};
  const v = $("#verdict"); v.replaceChildren();
  const total = res.findings.length + res.passes.length;
  let cls, big, sub;
  if (res.errors) { cls = "crit"; big = "Hold payment: " + res.errors + (res.errors === 1 ? " problem" : " problems"); sub = res.warns ? res.warns + " more to confirm." : "Ask the supplier to correct the invoice."; }
  else if (res.warns) { cls = "warn"; big = "Check before paying: " + res.warns + " to confirm"; sub = "Nothing is clearly wrong, but these need a look."; }
  else { cls = "good"; big = "No problems found by these checks"; sub = "That does not prove the invoice is genuine."; }
  v.append(h("div", {class: "verdict " + cls}, h("div", {class: "big"}, big), h("div", {class: "sub2"}, sub)));
  const rl = $("#rulesline"); rl.replaceChildren(h("span", {}, "Checked against rulebook v" + rules.version + " (" + rules.applied.length + " approved " + (rules.applied.length === 1 ? "change" : "changes") + ")"), h("span", {class: "note"}, "Rules are set by the compliance team."));
  const t = res.totals, rc = $("#recon"); rc.replaceChildren();
  if (inv.items.length) {
    const taxOff = t.statedTax !== null && Math.abs(t.statedTax - t.expectedTax) > rules.settings.toleranceInr.value, totOff = t.statedTotal !== null && Math.abs(t.statedTotal - t.expectedTotal) > rules.settings.toleranceInr.value;
    rc.append(h("div", {class: "recon"},
      h("div", {class: "h"}, "Amount"), h("div", {class: "h"}, "On invoice"), h("div", {class: "h"}, "Should be"),
      h("div", {}, "Line values"), h("div", {class: "v"}, inr(t.taxable)), h("div", {class: "v"}, inr(t.taxable)),
      h("div", {}, "Tax"), h("div", {class: "v" + (taxOff ? " off" : "")}, inr(t.statedTax)), h("div", {class: "v"}, inr(t.expectedTax)),
      h("div", {}, "Total"), h("div", {class: "v" + (totOff ? " off" : "")}, t.statedTotal === null ? "-" : inr(t.statedTotal)), h("div", {class: "v"}, inr(t.expectedTotal))));
  }
  const ul = $("#findings"); ul.replaceChildren();
  [...res.findings].sort((a, b) => (a.sev === b.sev ? 0 : a.sev === "error" ? -1 : 1)).forEach((f) => {
    ul.append(h("li", {class: "f"},
      h("div", {class: "top2"}, h("span", {class: "pill " + f.sev}, f.sev === "error" ? "Problem" : "Check"), f.where && h("span", {class: "where"}, f.where)),
      h("div", {class: "t"}, f.title), f.detail && h("div", {class: "d"}, f.detail), f.fix && h("div", {class: "fix"}, h("b", {}, "Do this: "), f.fix),
      f.src && h("div", {class: "rs"}, "Rule source: ", srcLink(f.src.text, f.src.url), " ", srcPill(f.src.cls))));
  });
  $("#supplierNote").hidden = !res.findings.length; $("#noteText").hidden = true;
  const p = $("#passed"); p.replaceChildren();
  if (res.passes.length) { p.hidden = false; p.append(h("summary", {}, res.passes.length + " of " + total + " checks passed"), h("ul", {}, res.passes.map((x) => h("li", {}, x.title)))); } else p.hidden = true;
}
$("#copy").addEventListener("click", async () => {
  if (!lastRes) return; const {res, inv} = lastRes;
  const txt = "Hello,\n\nI checked invoice " + (inv.invoiceNo || "(number missing)") + " before paying and found points to correct:\n\n" +
    res.findings.map((f, i) => (i + 1) + ". " + (f.where ? f.where + ": " : "") + f.title + (f.fix ? ". " + f.fix : "")).join("\n") + "\n\nPlease send a corrected invoice or confirm each point. I will release payment after that.\n\nThank you";
  const ta = $("#noteText"); ta.value = txt;
  try { await navigator.clipboard.writeText(txt); $("#copy").textContent = "Copied"; setTimeout(() => { $("#copy").textContent = "Copy note for supplier"; }, 1600); }
  catch (e) { ta.hidden = false; ta.select(); }
});
const sel = $("#sample");
sel.append(h("option", {value: ""}, "Choose a sample…"));
SAMPLES.forEach((s) => sel.append(h("option", {value: s.id}, s.id + ". " + s.inv.supplierName + " · " + s.inv.invoiceNo)));
function loadSample(id) {
  const s = SAMPLES.find((x) => String(x.id) === String(id)); if (!s) return;
  fillForm(s.inv);
  $("#key").textContent = s.expect.length ? "Planted error: " + s.note + "." : "This one is clean. The checks should find nothing: " + s.note + ".";
  $("#photoInfo").hidden = true; $("#err").hidden = true;
}
sel.addEventListener("change", () => loadSample(sel.value));
$("#clear").addEventListener("click", () => { fillForm(null); sel.value = ""; $("#key").textContent = "No sample loaded."; $("#photoInfo").hidden = true; });
$("#add").addEventListener("click", () => { $("#items").append(itemRow({})); live(); });
document.addEventListener("input", (e) => { if (e.target.closest("#p-checker") && e.target.matches("input")) live(); });

// ---------- rulebook ----------
function summarise(p) {
  const d = p.payload || {};
  if (p.type === "slabs") return "From " + fmtDate(d.from) + ": standard rates " + (d.rates || []).join("%, ") + "%" + ((d.special || []).length ? "; special " + d.special.map((s) => s.rate + "% (" + (s.note || "no note") + ")").join(", ") : "") + ".";
  if (p.type === "hsn") return "HSN " + d.hsn + " at " + d.rate + "% from " + fmtDate(d.from) + (d.note ? " (" + d.note + ")" : "") + ".";
  const s = rules.settings[d.key] || SEED_RULES.settings[d.key];
  return (s ? s.label : d.key) + " to " + d.value + ".";
}
function renderRulebook() {
  const root = $("#rb"); root.replaceChildren();
  const ta = h("textarea", {class: "mono", readonly: true, hidden: true, "aria-label": "Rulebook as JSON"});
  root.append(h("section", {class: "card"},
    h("div", {class: "bar"}, h("div", {class: "grow"}, h("div", {class: "eyebrow"}, "Current rulebook"), h("h2", {}, "Version " + rules.version), h("p", {class: "note"}, "The baseline plus " + rules.applied.length + " approved " + (rules.applied.length === 1 ? "change" : "changes") + ". The checker reads its rules from here, and every row shows where it came from.")),
      h("button", {class: "btn", type: "button", onclick: async (e) => {
        const txt = JSON.stringify(rules, null, 2); ta.value = txt;
        try { await navigator.clipboard.writeText(txt); e.target.textContent = "Copied"; setTimeout(() => { e.target.textContent = "Copy rulebook as JSON"; }, 1600); } catch (er) { ta.hidden = false; ta.select(); }
      }}, "Copy rulebook as JSON")), ta));
  const stRows = Object.entries(rules.settings).map(([k, s]) => h("tr", {}, h("td", {}, s.label), h("td", {class: "mono"}, String(s.value)), h("td", {}, s.note), h("td", {}, srcPill(s.sourceClass), " ", h("span", {class: "note"}, s.sourceText)), h("td", {}, s.via ? s.via + ", approved by " + s.changedBy + ", " + fmtTime(s.changedAt) : "Baseline")));
  root.append(h("section", {class: "card"}, h("h2", {}, "Checker settings"), h("div", {class: "scroll"}, h("table", {class: "tbl"}, h("thead", {}, h("tr", {}, ["Setting", "Value", "What it does", "Source", "Last change"].map((x) => h("th", {}, x)))), h("tbody", {}, stRows)))));
  const periods = [...rules.periods].sort((a, b) => (a.from < b.from ? 1 : -1));
  const nowP = periodFor(rules, todayISO());
  root.append(h("section", {class: "card"}, h("h2", {}, "GST rate slabs by invoice date"), h("p", {class: "note"}, "The checker picks the period that matches the invoice date. The latest period starting on or before that date applies."),
    periods.map((pr) => h("div", {class: "period"},
      h("div", {class: "hd"}, h("h3", {}, "From " + fmtDate(pr.from)), h("span", {class: "where"}, pr.id), nowP && pr.id === nowP.id ? h("span", {class: "pill good"}, "In effect now") : (pr.from > todayISO() ? h("span", {class: "pill warn"}, "Starts later") : null), srcPill(pr.sourceClass)),
      h("div", {}, h("span", {class: "note"}, "Standard: "), pr.rates.map((r) => h("span", {class: "chip"}, r + "%"))),
      h("div", {}, h("span", {class: "note"}, "Special (raises a Check): "), pr.special.length ? pr.special.map((s) => h("span", {class: "chip sp", title: s.note}, s.rate + "% " + s.note)) : h("span", {class: "note"}, "none")),
      h("div", {class: "note"}, "Source: ", srcLink(pr.sourceText, pr.sourceUrl)),
      h("div", {class: "note"}, pr.via ? "Approved by " + pr.approvedBy + ", " + fmtTime(pr.approvedAt) + " (" + pr.via + ")" : "Baseline rulebook")))));
  const hs = [...rules.hsnRates].sort((a, b) => (a.hsn === b.hsn ? (a.from < b.from ? 1 : -1) : (a.hsn < b.hsn ? -1 : 1)));
  root.append(h("section", {class: "card"}, h("h2", {}, "Product reference rates"), h("p", {class: "note"}, "Used only to raise a Check when a line's rate differs from the usual rate for that product code. Not a full rate schedule."),
    h("div", {class: "scroll"}, h("table", {class: "tbl"}, h("thead", {}, h("tr", {}, ["HSN", "Rate", "From", "Product", "Source"].map((x) => h("th", {}, x)))), h("tbody", {}, hs.map((r) => h("tr", {}, h("td", {class: "mono"}, r.hsn), h("td", {class: "mono"}, r.rate + "%"), h("td", {}, fmtDate(r.from)), h("td", {}, r.note), h("td", {}, srcPill(r.sourceClass), " ", srcLink(r.sourceText, r.sourceUrl)))))))));
}

// ---------- changes ----------
function updateTypeFields() {
  const t = $("#c-type").value;
  $$(".sub[data-for]").forEach((s) => { s.hidden = s.dataset.for !== t; });
  $("#srcFields").hidden = t === "setting";
}
function updateBadge() {
  const u = $("#c-url").value.trim(), b = $("#c-badge"); b.replaceChildren();
  if (!u) return;
  const c = classifySource(u);
  b.append(srcPill(c), " ", h("span", {class: "note"}, c === "official" ? "This is on an official domain." : "Not on the official list. It can be proposed but cannot be approved."));
}
$("#c-type").addEventListener("change", updateTypeFields);
$("#c-url").addEventListener("input", updateBadge);
function parseSpecial(txt) {
  return String(txt || "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf(","); const r = parseFloat(i < 0 ? l : l.slice(0, i)); return {rate: r, note: i < 0 ? "" : l.slice(i + 1).trim()}; });
}
$("#c-send").addEventListener("click", () => {
  const type = $("#c-type").value; let payload = {};
  if (type === "slabs") payload = {from: $("#c-from").value, rates: $("#c-rates").value.split(",").map((x) => x.trim()).filter(Boolean).map(Number), special: parseSpecial($("#c-special").value)};
  if (type === "hsn") payload = {hsn: $("#c-hsn").value.trim(), rate: parseFloat($("#c-hrate").value), from: $("#c-hfrom").value, note: $("#c-hnote").value.trim()};
  if (type === "setting") payload = {key: $("#c-skey").value, value: parseFloat($("#c-sval").value)};
  const r = propose({type, title: $("#c-title").value.trim(), payload, reason: $("#c-reason").value.trim(), sourceUrl: type === "setting" ? "" : $("#c-url").value, sourceRef: $("#c-ref").value.trim()});
  const err = $("#c-err"), ok = $("#c-ok");
  if (!r.ok) { ok.hidden = true; err.hidden = false; err.replaceChildren(h("div", {}, "Fix these before sending:"), h("ul", {style: "margin:4px 0 0;padding-left:18px"}, r.errors.map((x) => h("li", {}, x)))); return; }
  err.hidden = true; ok.hidden = false; ok.textContent = r.p.id + " is waiting for an admin. Switch to the admin role at the top to review it.";
  ["c-title", "c-from", "c-rates", "c-special", "c-hsn", "c-hrate", "c-hfrom", "c-hnote", "c-sval", "c-reason", "c-url", "c-ref"].forEach((id) => { $("#" + id).value = ""; }); updateBadge();
});
const STATUS = {pending: ["Waiting for approval", "warn"], approved: ["Approved", "good"], rejected: ["Rejected", "error"], revoked: ["Revoked", "neutral"]};
function crCard(p) {
  const actor = me(), [stl, stk] = STATUS[p.status];
  const kind = {slabs: "Rate slabs", hsn: "Product reference", setting: "Setting"}[p.type];
  const card = h("article", {class: "cr " + p.status},
    h("div", {class: "hd"}, h("span", {class: "where"}, p.id), h("span", {class: "ttl"}, p.title), h("span", {class: "pill " + stk}, stl), p.demo && h("span", {class: "pill neutral"}, "Demo example")),
    h("div", {class: "meta"}, kind + " · proposed by " + p.proposedBy + ", " + fmtTime(p.proposedAt)),
    h("div", {class: "sum"}, summarise(p)),
    h("div", {class: "meta"}, "Why: " + p.reason),
    p.type !== "setting" && h("div", {class: "meta"}, "Source: ", srcLink(p.sourceRef || p.sourceUrl, p.sourceUrl), " ", srcPill(p.sourceClass)),
    p.status !== "pending" && h("div", {class: "meta"}, (p.status === "rejected" ? "Rejected" : "Approved") + " by " + p.decidedBy + ", " + fmtTime(p.decidedAt) + (p.decisionNote ? ". Note: " + p.decisionNote : "")));
  if (p.status === "pending") {
    const note = h("input", {id: "n-" + p.id, autocomplete: "off", placeholder: "Short note (required to reject)"});
    const conf = p.type !== "setting" ? h("input", {type: "checkbox", id: "k-" + p.id}) : null;
    const whyA = whyNotApprove(p, actor), whyR = whyNotReject(p, actor);
    const ap = h("button", {class: "btn primary", type: "button", disabled: !!whyA}, "Approve");
    const rj = h("button", {class: "btn danger", type: "button", disabled: !!whyR}, "Reject");
    const msg = h("div", {class: "msg", hidden: true, role: "alert"});
    const sync = () => { ap.disabled = !!whyA || (conf && !conf.checked); };
    if (conf) conf.addEventListener("change", sync); sync();
    ap.addEventListener("click", () => { const w = decide(p.id, "approved", note.value.trim()); if (w) { msg.hidden = false; msg.textContent = w; } });
    rj.addEventListener("click", () => { if (!note.value.trim()) { msg.hidden = false; msg.textContent = "Add a short note saying why you are rejecting it."; note.focus(); return; } const w = decide(p.id, "rejected", note.value.trim()); if (w) { msg.hidden = false; msg.textContent = w; } });
    card.append(h("div", {class: "decision"},
      h("div", {}, h("label", {for: "n-" + p.id}, "Decision note"), note),
      conf && h("label", {class: "check", for: "k-" + p.id}, conf, h("span", {}, "I opened the source link and it says this.")),
      h("div", {class: "acts"}, ap, rj),
      (whyA && actor.role === "admin") || (actor.role !== "admin") ? h("div", {class: "note"}, whyA) : null, msg));
  }
  if (p.status === "approved" && actor.role === "admin") {
    const note = h("input", {id: "rv-" + p.id, autocomplete: "off", placeholder: "Why are you revoking it?"});
    const msg = h("div", {class: "msg", hidden: true, role: "alert"});
    const b = h("button", {class: "btn danger", type: "button"}, "Revoke this change");
    b.addEventListener("click", () => { if (!note.value.trim()) { msg.hidden = false; msg.textContent = "Add a short reason."; note.focus(); return; } revoke(p.id, note.value.trim()); });
    card.append(h("div", {class: "decision"}, h("div", {}, h("label", {for: "rv-" + p.id}, "Revoke"), note), h("div", {class: "acts"}, b), msg));
  }
  return card;
}
function renderChanges() {
  const q = $("#queue"); q.replaceChildren();
  const order = {pending: 0, approved: 1, rejected: 2, revoked: 3};
  [...state.proposals].sort((a, b) => order[a.status] - order[b.status] || (a.proposedAt < b.proposedAt ? 1 : -1)).forEach((p) => q.append(crCard(p)));
  const n = state.proposals.filter((p) => p.status === "pending").length;
  $("#pendingCount").textContent = n; $("#pendingCount").hidden = !n;
}

// ---------- sources ----------
const SIGNALS = [
  {title: "Forwarded message: \"GST on phones going to 28% from next month\"", where: "WhatsApp group, no link", url: "", cls: "none", result: "Rumour. It cannot become a change request. Ask for the official notice."},
  {title: "News article about a coming rate change", where: "A news website", url: "https://example-news.test/gst-rate-change", cls: "unverified", result: "Lead only. Wait for the official notification before proposing anything."},
  {title: "PIB press release on the 56th GST Council recommendations", where: "pib.gov.in", url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163555&reg=48&lang=2", cls: "official", result: "Official. Already in the rulebook as period RP-2025."}
];
function renderSources() {
  const d = $("#domains"); d.replaceChildren(...OFFICIAL_DOMAINS.map((x) => h("span", {class: "chip"}, x)));
  const s = $("#signals"); s.replaceChildren(...SIGNALS.map((g) => h("div", {class: "sig"}, h("div", {class: "ttl"}, g.title), h("div", {class: "meta"}, g.where), h("div", {}, srcPill(g.cls)), h("div", {class: "note"}, g.result), g.url && h("div", {class: "meta"}, srcLink(g.url, g.url)))));
}
$("#lk").addEventListener("input", () => {
  const u = $("#lk").value.trim(), o = $("#lk-out"); o.replaceChildren(); if (!u) return;
  let host = ""; try { host = new URL(u).hostname; } catch (e) {}
  const c = classifySource(u);
  o.append(srcPill(c), " ", h("span", {class: "note"}, host ? "Host: " + host + (c === "official" ? ". Counts as official." : ". Does not count as official.") : "Not a valid web address."));
});

// ---------- activity ----------
function renderActivity() {
  const t = $("#audit"); t.replaceChildren(h("thead", {}, h("tr", {}, ["When", "Who", "Action", "Item", "Note"].map((x) => h("th", {}, x)))),
    h("tbody", {}, [...state.audit].reverse().map((a) => h("tr", {}, h("td", {style: "white-space:nowrap"}, fmtTime(a.t)), h("td", {}, a.actor), h("td", {}, a.action), h("td", {class: "mono"}, a.ref), h("td", {}, a.note)))));
}
let resetArmed = false;
$("#reset").addEventListener("click", () => {
  if (!resetArmed) { resetArmed = true; $("#reset").textContent = "Click again to reset"; setTimeout(() => { resetArmed = false; $("#reset").textContent = "Reset demo data"; }, 4000); return; }
  resetArmed = false; $("#reset").textContent = "Reset demo data"; state = seedState(); $("#role").value = state.role; commit();
});

function renderAll() { if (IS_CUST) renderChecker(); if (IS_ADMIN) { renderRulebook(); renderChanges(); renderSources(); renderActivity(); } }

// ---------- photo reading with Claude (optional; the page works without it) ----------
(async () => {
  if (!IS_CUST) return;
  let sample = null, caps = null;
  try { sample = await window.claude?.use("sample"); caps = sample && await sample.limits(); } catch (e) { sample = null; }
  if (!sample || !caps || !caps.images) return;
  $("#photo").accept = caps.images.mediaTypes.join(",");
  $("#photoWrap").hidden = false;
  let ctl = null;
  $("#cancel").addEventListener("click", () => ctl && ctl.abort());
  const say = (m) => { $("#err").textContent = m || ""; $("#err").hidden = !m; };
  $("#photo").addEventListener("change", async (e) => {
    const file = e.target.files[0]; e.target.value = ""; if (!file) return;
    say(""); ctl = new AbortController();
    $("#photoBtn").setAttribute("aria-disabled", "true"); $("#photoBtn").textContent = "Reading…"; $("#cancel").hidden = false;
    const prompt = "This image is a photo or screenshot of an Indian GST tax invoice. Copy the fields exactly as printed. Do not fix, round or recalculate anything, even if a number looks wrong, because a separate program checks them. Reply with only a JSON object of this shape: " +
      '{"invoiceNo":string|null,"date":"YYYY-MM-DD"|null,"supplierName":string|null,"supplierGstin":string|null,"buyerName":string|null,"buyerGstin":string|null,"items":[{"desc":string,"hsn":string|null,"qty":number|null,"rate":number|null,"taxable":number|null,"gstRate":number|null}],"cgst":number|null,"sgst":number|null,"igst":number|null,"total":number|null}. ' +
      "Use null for anything not visible. Numbers are plain numbers with no commas or currency symbols. gstRate is the percent as a number, for example 18. If the invoice shows CGST and SGST rates per line, such as 9% and 9%, set gstRate to their sum. cgst, sgst and igst are the invoice's total tax amounts in rupees; use null if absent. total is the grand total.";
    try {
      const data = await sample.json(prompt, {images: file, signal: ctl.signal, modelTier: "default"});
      if (!data || typeof data !== "object" || Array.isArray(data)) throw {code: "invalid_json"};
      data.date = toISO(data.date); fillForm(data); sel.value = "";
      $("#key").textContent = "No sample loaded.";
      $("#thumb").src = URL.createObjectURL(file); $("#photoText").textContent = "Fields were read from your photo. Compare them with the invoice before trusting the result."; $("#photoInfo").hidden = false;
    } catch (er) {
      const c = er && er.code;
      if (c === "cancelled") say("");
      else if (c === "not_granted" || c === "sampling_disabled" || c === "images_unavailable") { say("Reading photos is not available here. You can type the invoice in or use a sample."); $("#photoWrap").hidden = true; }
      else if (c === "rate_limited") say("Too many requests. Wait a little and try again.");
      else if (c === "image_rejected") say("That file could not be used. Try a JPEG or PNG photo under 20 MB.");
      else if (c === "invalid_json") say("The photo could not be read into fields. Try a clear, straight-on photo of the whole invoice.");
      else say("Something went wrong while reading the photo. Try again.");
    } finally {
      $("#photoBtn").removeAttribute("aria-disabled"); $("#photoBtn").textContent = "Read from photo"; $("#cancel").hidden = true; ctl = null;
    }
  });
})();

updateTypeFields();
if (IS_CUST) { loadSample(8); sel.value = "8"; }
renderAll();
route();