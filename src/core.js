/* ===== Hire-to-Retire Atlas — core ===== */
"use strict";
const ARTIFACT_URL = "";   // filled after first publish so copied links open the shared page

/* ---------- per-viewer display settings (kept in this browser only) ---------- */
const UI_DEFAULTS = { ui: "clean", accent: "navy", mode: "auto", home: "overview" };
function loadPrefs() { try { return { ...UI_DEFAULTS, ...JSON.parse(localStorage.getItem("atlas-ui") || "{}") }; } catch (e) { return { ...UI_DEFAULTS }; } }
function applyPrefs(p) {
  const r = document.documentElement;
  p.ui === "clean" ? r.removeAttribute("data-ui") : r.setAttribute("data-ui", p.ui);
  p.accent === "navy" ? r.removeAttribute("data-accent") : r.setAttribute("data-accent", p.accent);
  p.mode === "auto" ? r.removeAttribute("data-mode") : r.setAttribute("data-mode", p.mode);
}
function savePrefs(p) { try { localStorage.setItem("atlas-ui", JSON.stringify(p)); } catch (e) { } }
let PREFS = loadPrefs(); applyPrefs(PREFS);

const RAW = JSON.parse(document.getElementById("lib-data").textContent);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const attr = esc;
const nowIso = () => new Date().toISOString();
const newId = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const plural = (n, w, pl) => `${n} ${n === 1 ? w : (pl || w + "s")}`;
function fmtDate(iso) { if (!iso) return ""; const d = new Date(iso); if (isNaN(d)) return iso; return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); }
function fmtRel(iso) { const d = new Date(iso); const s = (Date.now() - d) / 1000; if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + "m ago"; if (s < 86400) return Math.floor(s / 3600) + "h ago"; if (s < 86400 * 7) return Math.floor(s / 86400) + "d ago"; return fmtDate(iso); }
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function ym(s) { if (!s) return ""; const [y, m] = String(s).split("-"); return m ? `${MONTHS[+m - 1].slice(0, 3)} ${y}` : y; }

/* ---------- reference data ---------- */
const JUR = [
  { id: "us", short: "US", name: "US Federal", region: "Americas" },
  { id: "us-ca", short: "Calif.", name: "California", region: "Americas" },
  { id: "us-co", short: "Colo.", name: "Colorado", region: "Americas" },
  { id: "us-nc", short: "N.C.", name: "North Carolina", region: "Americas" },
  { id: "us-tx", short: "Texas", name: "Texas", region: "Americas" },
  { id: "us-wa", short: "Wash.", name: "Washington", region: "Americas" },
  { id: "ca", short: "Canada", name: "Canada", region: "Americas" },
  { id: "de", short: "Germany", name: "Germany", region: "EMEA" },
  { id: "il", short: "Israel", name: "Israel", region: "EMEA" },
  { id: "in", short: "India", name: "India", region: "APAC" },
  { id: "tw", short: "Taiwan", name: "Taiwan", region: "APAC" },
  { id: "cn", short: "China", name: "China", region: "APAC" },
  { id: "vn", short: "Vietnam", name: "Vietnam", region: "APAC" },
];
const REGIONS = ["Americas", "EMEA", "APAC"];
const JMAP = Object.fromEntries(JUR.map((j) => [j.id, j]));
const STAGES = [
  { key: "Plan", label: "Workforce planning", band: "journey" },
  { key: "Recruit", label: "Talent acquisition", band: "journey" },
  { key: "Onboard", label: "Onboarding", band: "journey" },
  { key: "Pay", label: "Payroll & time", band: "always" },
  { key: "Reward", label: "Compensation", band: "always" },
  { key: "Equity", label: "Equity", band: "always" },
  { key: "Benefits", label: "Benefits", band: "always" },
  { key: "Leave", label: "Leave & accommodation", band: "always" },
  { key: "Grow", label: "Performance & growth", band: "journey" },
  { key: "Move", label: "Mobility & job changes", band: "journey" },
  { key: "Engage", label: "Engagement & listening", band: "always" },
  { key: "Relations", label: "Employee relations & ethics", band: "found" },
  { key: "Safety", label: "Health, safety & crisis", band: "found" },
  { key: "Data", label: "HR data, systems & governance", band: "found" },
  { key: "Offboard", label: "Offboarding", band: "journey" },
  { key: "Governance", label: "Corporate governance", band: "found" },
];
const STAGE = Object.fromEntries(STAGES.map((s) => [s.key, s]));
const POLICY_DOMAIN = {
  "Ethics & Governance": "Governance", "Workplace Conduct": "Relations", "Hiring & Employment": "Recruit",
  "Pay & Rewards": "Reward", "Time Off & Benefits": "Leave", "Work Arrangements": "Move",
  "Performance & Development": "Grow", "Data, IP & Technology": "Data", "Health & Safety": "Safety",
  "Separation": "Offboard", "Inclusion & Accessibility": "Relations",
};
const TIERS = {
  legal: { label: "Legally required", short: "Legal", color: "var(--t-legal)" },
  public: { label: "Public-company driven", short: "Public co.", color: "var(--t-public)" },
  semi: { label: "Semiconductor-specific", short: "Semi", color: "var(--t-semi)" },
  best: { label: "Best practice", short: "Best practice", color: "var(--t-best)" },
};
const STATUS = {
  none: { label: "Not started", color: "var(--s-none)" },
  drafting: { label: "Drafting", color: "var(--s-draft)" },
  review: { label: "In review", color: "var(--s-review)" },
  approved: { label: "Approved", color: "var(--s-approved)" },
  na: { label: "Not applicable", color: "var(--s-na)" },
};
const RATING_DIMS = [
  ["termination", "Termination difficulty"], ["representation", "Employee representation"], ["privacy", "Data privacy"],
  ["payTransparency", "Pay transparency"], ["workingTime", "Working-time rules"], ["leave", "Leave complexity"],
  ["immigration", "Immigration"], ["changeVelocity", "Pace of legal change"],
];
const STAGE_TO_COUNTRY = {
  Plan: ["hiring"], Recruit: ["hiring"], Onboard: ["onboarding"], Pay: ["payAndPayroll"], Reward: ["payAndPayroll"],
  Equity: ["payAndPayroll"], Benefits: ["benefits"], Leave: ["timeAndLeave"], Grow: ["performanceAndConduct"],
  Move: ["hiring", "onboarding"], Engage: ["recordsAndPrivacy"], Relations: ["performanceAndConduct"], Safety: ["healthSafety"],
  Data: ["recordsAndPrivacy"], Offboard: ["termination", "exit"],
};
const COUNTRY_STAGE_LABEL = {
  hiring: "Hiring", onboarding: "Onboarding", payAndPayroll: "Pay & payroll", timeAndLeave: "Time & leave", benefits: "Benefits",
  performanceAndConduct: "Performance & conduct", termination: "Termination", exit: "Exit", recordsAndPrivacy: "Records & privacy",
  healthSafety: "Health & safety",
};

/* ---------- indexes ---------- */
const DB = {
  processes: RAW.processes, policies: RAW.policies, templates: RAW.templates, register: RAW.register,
  countries: JUR.map((j) => RAW.countries.find((c) => c.id === j.id)).filter(Boolean), global: RAW.global,
};
const P = Object.fromEntries(DB.processes.map((p) => [p.id, p]));
const POL = Object.fromEntries(DB.policies.map((p) => [p.id, p]));
const TPL = Object.fromEntries(DB.templates.map((t) => [t.id, t]));
const CTY = Object.fromEntries(DB.countries.map((c) => [c.id, c]));
const REG = Object.fromEntries(DB.register.map((r) => [r.id, r]));
DB.policies.forEach((p) => (p.domain = POLICY_DOMAIN[p.category] || "Governance"));
// processes inherit a tier from their governing policies (legal if any governing policy is legal)
DB.processes.forEach((p) => {
  const tiers = (p.policies || []).map((id) => POL[id]?.tier).filter(Boolean);
  p.tier = tiers.includes("legal") ? "legal" : tiers.includes("public") ? "public" : tiers.includes("semi") ? "semi" : "best";
});
// library change log, newest release first
const RELEASES = ((RAW.changelog && RAW.changelog.releases) || []).slice().sort((a, b) => b.version - a.version);
// reverse links
const POLICY_TO_PROCS = {}; const TPL_TO_PROCS = {};
DB.processes.forEach((p) => {
  (p.policies || []).forEach((id) => (POLICY_TO_PROCS[id] = POLICY_TO_PROCS[id] || []).push(p.id));
  (p.templates || []).forEach((id) => (TPL_TO_PROCS[id] = TPL_TO_PROCS[id] || []).push(p.id));
});

/* Checklist items: every policy, process and register obligation */
const ITEMS = [
  ...DB.policies.map((p) => ({ id: p.id, name: p.name, type: "Policy", domain: p.domain, tier: p.tier, owner: p.owner, route: "policy." + p.id, jur: JUR.map((j) => j.id), cadence: p.review })),
  ...DB.processes.map((p) => ({ id: p.id, name: p.name, type: "Process", domain: p.stage, tier: p.tier, owner: p.owner, route: "process." + p.id, jur: JUR.map((j) => j.id), cadence: p.sla, depth: p.depth })),
  ...DB.register.map((r) => ({ id: r.id, name: r.name, type: r.type, domain: r.domain, tier: r.tier, owner: r.owner, route: "item." + r.id, jur: r.countries || [], cadence: r.cadence, scope: r.scope })),
];
const ITEM = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const DOMAIN_ORDER = STAGES.map((s) => s.key);
ITEMS.sort((a, b) => DOMAIN_ORDER.indexOf(a.domain) - DOMAIN_ORDER.indexOf(b.domain) || a.type.localeCompare(b.type) || a.id.localeCompare(b.id));

/* lane colors */
function hueFor(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
const LANE_HUE = {};
["Employee", "Candidate", "Manager", "Dept Head", "HRBP", "Recruiter", "TA Coordinator", "People Ops", "Payroll", "Total Rewards", "Stock Admin", "Benefits", "Employee Relations", "Legal", "Immigration", "Trade Compliance", "Ethics & Compliance", "IT", "Security", "Facilities", "EHS", "Finance", "FP&A", "CHRO", "CEO", "Comp Committee", "Board", "Vendor", "Mobility", "L&D", "HR Analytics", "Works Council/Union"]
  .forEach((l, i) => (LANE_HUE[l] = Math.round((i * 137.5) % 360)));
const laneHue = (l) => LANE_HUE[l] ?? hueFor(l);
const laneChip = (l) => `<span class="lane-chip">${esc(l)}</span>`;

/* ---------- small render helpers ---------- */
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  flow: '<rect x="3" y="4" width="7" height="5" rx="1"/><rect x="14" y="15" width="7" height="5" rx="1"/><path d="M6.5 9v4.5h11V15"/>',
  book: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 19V4.5"/>',
  file: '<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/>',
  grid: '<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  pulse: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1.5 3h5L16 13h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  down: '<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>',
  comment: '<path d="M4 5h16v11H9l-5 4z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V4H4v12h4"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
};
const icon = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ""}</svg>`;
const tierTag = (t) => t && TIERS[t] ? `<span class="tier"><i style="background:${TIERS[t].color}"></i>${TIERS[t].label}</span>` : "";
const jurChips = (ids) => (ids || []).map((id) => `<span class="chip">${esc(JMAP[id]?.short || id)}</span>`).join("");
const idTag = (id) => `<span class="idtag">${esc(id)}</span>`;
function linkTo(id) {
  if (P[id]) return `<a href="#process.${attr(id)}">${idTag(id)} ${esc(P[id].name)}</a>`;
  if (POL[id]) return `<a href="#policy.${attr(id)}">${idTag(id)} ${esc(POL[id].name)}</a>`;
  if (TPL[id]) return `<a href="#template.${attr(id)}">${idTag(id)} ${esc(TPL[id].name)}</a>`;
  if (REG[id]) return `<a href="#item.${attr(id)}">${idTag(id)} ${esc(REG[id].name)}</a>`;
  return esc(id);
}
const bullets = (arr) => `<ul class="bullets">${(arr || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

/* A "proposable" block: renders the propose button + open-proposal counter */
function propKey(targetId, path) { return targetId + "|" + (path || ""); }
function propBtn(o) {
  // o: {type, id, path, label, current, route}
  const data = encodeURIComponent(JSON.stringify(o));
  return `<button class="icon-btn prop-btn" data-propose="${data}" title="Propose a change" aria-label="Propose a change to ${attr(o.label)}">${icon("edit", 16)}</button><button class="pcount" data-pkey="${attr(propKey(o.id, o.path))}" hidden></button>`;
}

/* ---------- toast / clipboard ---------- */
let toastT;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2600); }
async function copyText(text, okMsg = "Copied") {
  try { await navigator.clipboard.writeText(text); toast(okMsg); return true; }
  catch (e) { showTextModal("Copy this text", text); return false; }
}
function shareUrl(token) { return ARTIFACT_URL ? `${ARTIFACT_URL}#${token}` : `#${token}`; }
async function copyLink(token, label) {
  const url = shareUrl(token);
  if (!ARTIFACT_URL) return copyText(`Open the Atlas and go to: #${token}`, "Link token copied");
  return copyText(url, `Link to ${label || "this page"} copied`);
}

/* ---------- modal ---------- */
function openModal({ title, sub = "", body, foot = "", wide = false, cls = "" }) {
  closeModal();
  const bg = document.createElement("div");
  bg.className = "modal-bg"; bg.id = "modal";
  bg.innerHTML = `<div class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="modal-title" style="${wide ? "width:min(980px,100%)" : ""}">
    <header><div class="stack" style="gap:4px"><h3 id="modal-title">${title}</h3>${sub ? `<div class="small muted">${sub}</div>` : ""}</div>
    <button class="icon-btn" data-close aria-label="Close">${icon("x")}</button></header>
    <div class="body">${body}</div>${foot ? `<footer>${foot}</footer>` : ""}</div>`;
  document.body.appendChild(bg);
  bg.addEventListener("click", (e) => { if (e.target === bg || e.target.closest("[data-close]")) closeModal(); });
  const f = bg.querySelector("input,textarea,select,button:not([data-close])"); if (f) setTimeout(() => f.focus(), 30);
  return bg;
}
function closeModal() { const m = $("#modal"); if (m) m.remove(); }
function showTextModal(title, text) {
  const m = openModal({ title, body: `<p class="small muted">Select all and copy.</p><textarea class="textarea" id="copy-area" style="min-height:260px" readonly>${esc(text)}</textarea>`, foot: `<button class="btn" data-close>Close</button>` });
  const ta = m.querySelector("#copy-area"); ta.focus(); ta.select();
}

/* ---------- downloads ---------- */
async function saveFile(filename, data) {
  if (C.downloads) {
    try { await C.downloads.save({ filename, data }); toast("Saved " + filename); return; }
    catch (e) { if (e && e.code === "declined") return; if (e && e.code === "rate_limited") { toast("A save prompt is already open"); return; } }
  }
  showTextModal(`Copy ${filename}`, data);
}

/* ================= collaboration layer ================= */
const C = {
  db: null, user: null, comments: null, downloads: null, me: null, canEdit: false, canWrite: null, readOnly: false, ready: false,
  proposals: new Map(), reviews: new Map(), votes: new Map(), discussion: new Map(), status: new Map(), decisions: new Map(),
  hooks: new Set(),
};
const onLive = (fn) => C.hooks.add(fn);
const emitLive = debounce(() => { updateNavCounts(); C.hooks.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } }); refreshPropCounts(); fillPeople(document); }, 60);

async function initCollab() {
  const cl = window.claude;
  if (!cl || typeof cl.use !== "function") { C.ready = true; emitLive(); return; }
  const get = (n) => cl.use(n).catch(() => null);
  const [db, user, comments, downloads] = await Promise.all([get("db"), get("user"), get("comments"), get("downloads")]);
  Object.assign(C, { db, user, comments, downloads });
  if (user) {
    try { C.me = await user.me(); C.canEdit = !!C.me.canEdit; C.canWrite = await user.can("data.write"); } catch (e) { }
    if (C.canWrite === false) C.readOnly = true;
  }
  if (db) {
    const sub = (name, fn) => db.collection(name).onSnapshot((snap) => { fn(snap); emitLive(); }, (err) => console.warn("db", name, err && err.code));
    sub("proposals", (s) => (C.proposals = new Map(s.docs.map((d) => [d.id, d.data()]))));
    sub("reviews", (s) => (C.reviews = new Map(s.docs.map((d) => [d.id, d.data()]))));
    sub("votes", (s) => (C.votes = new Map(s.docs.map((d) => [d.id, d.data()]))));
    sub("discussion", (s) => (C.discussion = new Map(s.docs.map((d) => [d.id, d.data()]))));
    sub("status", (s) => (C.status = new Map(s.docs.map((d) => [d.id, d.data()]))));
    sub("decisions", (s) => (C.decisions = new Map(s.docs.map((d) => [d.id, d.data()]))));
  }
  C.ready = true;
  renderMe();
  emitLive();
}
const canPropose = () => !!C.db && !C.readOnly;
function writeErr(e) {
  const code = e && e.code;
  if (code === "invalid_argument") { C.readOnly = true; toast("You have view-only access here. Ask the owner for “Can interact” access to make changes."); }
  else if (code === "quota_exceeded") toast("The shared workspace is full. Ask an editor to archive old proposals.");
  else if (code === "resource_exhausted") toast("Too many changes at once. Wait a moment and try again.");
  else toast("That change didn't save. Try again in a moment.");
  console.warn(e);
}

function propStatus(id) { const p = C.proposals.get(id); if (!p) return "open"; if (p.withdrawn) return "withdrawn"; return C.reviews.get(id)?.status || "open"; }
function voteCount(id) { let n = 0; C.votes.forEach((v) => { if (v?.p?.[id]) n++; }); return n; }
function myVote(id) { return !!(C.me?.id && C.votes.get(C.me.id)?.p?.[id]); }
function commentsFor(id) { return [...C.discussion.entries()].filter(([, d]) => d.pid === id).map(([k, d]) => ({ id: k, ...d })).sort((a, b) => (a.at || "").localeCompare(b.at || "")); }
function proposalsList() { return [...C.proposals.entries()].map(([id, p]) => ({ id, ...p, status: propStatus(id), votes: voteCount(id) })); }
function openCountFor(key) { let n = 0; C.proposals.forEach((p, id) => { if (propKey(p.targetId, p.path) === key && propStatus(id) === "open") n++; }); return n; }
function openCountForTarget(targetId) { let n = 0; C.proposals.forEach((p, id) => { if (p.targetId === targetId && propStatus(id) === "open") n++; }); return n; }
function itemStatus(id) { return C.status.get(id)?.status || "none"; }

function refreshPropCounts() {
  const counts = new Map();
  C.proposals.forEach((p, id) => { if (propStatus(id) !== "open") return; const k = propKey(p.targetId, p.path); counts.set(k, (counts.get(k) || 0) + 1); });
  $$("[data-pkey]").forEach((b) => { const n = counts.get(b.dataset.pkey) || 0; b.hidden = !n; b.textContent = n ? `${n} open` : ""; b.title = n ? `${n} open proposal${n > 1 ? "s" : ""}` : ""; });
}

/* people */
function personHtml(uid) {
  if (uid === "claude") return `<span class="who"><span class="avatar" style="display:inline-grid;place-items:center;background:var(--amber-soft);color:var(--amber-ink)">${icon("spark", 14)}</span>Claude (suggested)</span>`;
  if (!uid) return `<span class="who">Someone</span>`;
  return `<span class="who" data-uid="${attr(uid)}"><img class="avatar" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><span class="nm">…</span></span>`;
}
async function fillPeople(root) {
  const els = $$("[data-uid]", root); if (!els.length || !C.user) { els.forEach((e) => { const n = e.querySelector(".nm"); if (n && n.textContent === "…") n.textContent = "Someone"; }); return; }
  const ids = [...new Set(els.map((e) => e.dataset.uid))];
  let ps = {}; try { ps = await C.user.profiles(ids); } catch (e) { }
  els.forEach((e) => { const p = ps[e.dataset.uid]; const n = e.querySelector(".nm"); const img = e.querySelector("img"); if (n) n.textContent = (p && p.name) || (p && p.isMe ? "You" : "Someone"); if (img && p && p.avatarUrl) img.src = p.avatarUrl; });
}
function renderMe() {
  const el = $("#me"); if (!el) return;
  if (!C.me) { el.innerHTML = C.db ? "" : `<span class="chip" title="Shared editing is available when this page is opened on claude.ai">Read-only</span>`; return; }
  el.innerHTML = `<img alt="" src="${attr(C.me.avatarUrl)}"><span></span>`;
  el.querySelector("span").textContent = C.me.name || "You";
  if (C.readOnly) el.insertAdjacentHTML("beforeend", `<span class="chip" title="You can read and export, but not change shared data">View only</span>`);
}

/* writes */
async function createProposal(o) {
  const id = newId("p");
  await C.db.collection("proposals").doc(id).set({ ...o, authorId: C.me?.id || null, createdAt: nowIso() });
  return id;
}
async function toggleVote(pid) {
  if (!C.me?.id) { toast("Voting needs a signed-in identity on this page."); return; }
  const mine = { ...(C.votes.get(C.me.id)?.p || {}) }; mine[pid] = !mine[pid];
  try { await C.db.doc("votes/" + C.me.id).set({ p: mine }); } catch (e) { writeErr(e); }
}
async function setReview(pid, status, note) {
  try { await C.db.doc("reviews/" + pid).set({ status, note: note || "", reviewerId: C.me?.id || null, at: nowIso() }); toast(`Marked ${status}`); } catch (e) { writeErr(e); }
}
async function addComment(pid, text) {
  try { await C.db.collection("discussion").doc(newId("c")).set({ pid, text, authorId: C.me?.id || null, at: nowIso() }); } catch (e) { writeErr(e); }
}
async function setItemStatus(id, patch) {
  const prev = C.status.get(id) || {};
  try { await C.db.doc("status/" + id).set({ ...prev, ...patch, updatedBy: C.me?.id || null, at: nowIso() }); } catch (e) { writeErr(e); }
}
async function setDecision(key, patch) {
  const prev = C.decisions.get(key) || {};
  try { await C.db.doc("decisions/" + key).set({ ...prev, ...patch, updatedBy: C.me?.id || null, at: nowIso() }); } catch (e) { writeErr(e); }
}

/* ---------- propose modal ---------- */
const KINDS = { edit: "Change wording", add: "Add something", remove: "Remove", question: "Question or concern" };
function openPropose(o) {
  const cur = o.current || "";
  const body = `
    <div class="current-box"><div class="eyebrow" style="margin-bottom:6px">Current text</div>${cur ? esc(cur) : '<span class="muted">No text on file for this target. Describe what should be added.</span>'}</div>
    <div class="field"><span class="label">Type of change</span>
      <div class="row" role="radiogroup" id="pp-kind">${Object.entries(KINDS).map(([k, v], i) => `<button type="button" class="chip" role="radio" aria-pressed="${i === 0}" aria-checked="${i === 0}" data-kind="${k}">${v}</button>`).join("")}</div></div>
    <div class="field"><label for="pp-text">Proposed text</label>
      <textarea id="pp-text" class="textarea" style="min-height:150px">${esc(cur)}</textarea>
      <span class="help">For wording changes, edit the current text directly. Reviewers will see a tracked-changes view.</span></div>
    <div class="field"><label for="pp-why">Why this change?</label>
      <textarea id="pp-why" class="textarea" style="min-height:70px" placeholder="Legal change, audit finding, operational pain point, local practice…"></textarea></div>
    <div class="field"><span class="label">Jurisdictions affected</span>
      <div class="row" id="pp-jur"><button type="button" class="chip" aria-pressed="false" data-j="global">Global</button>${JUR.map((j) => `<button type="button" class="chip" aria-pressed="false" data-j="${j.id}">${j.name}</button>`).join("")}</div></div>
    ${canPropose() ? "" : `<div class="callout">${C.db ? "You have view-only access, so this can't be submitted to the shared list." : "Shared proposals are available when this page is opened on claude.ai."} You can still copy it and share it with the policy owner.</div>`}`;
  const foot = `<button class="btn" data-close>Cancel</button><button class="btn" id="pp-copy">${icon("copy", 16)}Copy as text</button>${canPropose() ? `<button class="btn primary" id="pp-submit">Submit proposal</button>` : ""}`;
  const m = openModal({ title: "Propose a change", sub: esc(o.label), body, foot });
  let kind = "edit";
  m.querySelector("#pp-kind").addEventListener("click", (e) => {
    const b = e.target.closest("[data-kind]"); if (!b) return; kind = b.dataset.kind;
    $$("[data-kind]", m).forEach((x) => { x.setAttribute("aria-pressed", x === b); x.setAttribute("aria-checked", x === b); });
    const ta = m.querySelector("#pp-text");
    if (kind !== "edit" && ta.value === cur) ta.value = "";
    if (kind === "edit" && !ta.value) ta.value = cur;
  });
  m.querySelector("#pp-jur").addEventListener("click", (e) => { const b = e.target.closest("[data-j]"); if (b) b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true"); });
  const collect = () => ({
    targetType: o.type, targetId: o.id, path: o.path || "", targetLabel: o.label, route: o.route || "", current: cur.slice(0, 20000), kind,
    proposed: m.querySelector("#pp-text").value.trim().slice(0, 20000), rationale: m.querySelector("#pp-why").value.trim().slice(0, 8000),
    jurisdictions: $$("#pp-jur [aria-pressed=true]", m).map((b) => b.dataset.j),
  });
  m.querySelector("#pp-copy").addEventListener("click", () => { const d = collect(); copyText(proposalToText(d), "Proposal copied"); });
  const sub = m.querySelector("#pp-submit");
  if (sub) sub.addEventListener("click", async () => {
    const d = collect();
    if (!d.proposed && kind !== "remove") { toast("Add the proposed text first."); return; }
    if (kind === "edit" && d.proposed === cur) { toast("The proposed text is the same as the current text."); return; }
    sub.disabled = true;
    try { const id = await createProposal(d); closeModal(); toast("Proposal submitted"); location.hash = "proposal." + id; }
    catch (e) { sub.disabled = false; writeErr(e); }
  });
}
function proposalToText(d) {
  return `PROPOSED CHANGE — ${d.targetLabel}\nType: ${KINDS[d.kind]}\nJurisdictions: ${(d.jurisdictions || []).join(", ") || "—"}\n\nCURRENT:\n${d.current || "—"}\n\nPROPOSED:\n${d.proposed || "—"}\n\nWHY:\n${d.rationale || "—"}\n`;
}

/* word diff (LCS) */
function wordDiff(a, b) {
  const A = (a || "").split(/(\s+)/), B = (b || "").split(/(\s+)/);
  if (A.length * B.length > 900000) return { left: esc(a), right: esc(b) };
  const n = A.length, m = B.length; const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  let i = 0, j = 0, L = "", R = "";
  while (i < n && j < m) {
    if (A[i] === B[j]) { L += esc(A[i]); R += esc(B[j]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { L += `<del>${esc(A[i])}</del>`; i++; }
    else { R += `<ins>${esc(B[j])}</ins>`; j++; }
  }
  while (i < n) L += `<del>${esc(A[i++])}</del>`; while (j < m) R += `<ins>${esc(B[j++])}</ins>`;
  return { left: L, right: R };
}
