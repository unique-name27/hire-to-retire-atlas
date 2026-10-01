/* ===== Project Atlas: running the program (plan, approval chains, RAID, reporting, training) ===== */
const PRJ = RAW.project;
const WAVES = PRJ.waves, WSS = PRJ.workstreams, MILES = PRJ.milestones;
const PSTAGES = PRJ.stages;
const todayIso = () => new Date().toISOString().slice(0, 10);
const dayMs = 86400000;
const daysBetween = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / dayMs);
const fmtD = (iso, yr = false) => iso ? new Date(iso + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", ...(yr ? { year: "numeric" } : {}), timeZone: "UTC" }) : "";
const waveShort = (wi) => (wi === 0 ? "Mobilize" : "Wave " + wi);
UI.plan = UI.plan || { wave: "", ws: "", type: "", state: "", q: "" };
UI.appr = UI.appr || "mine";
UI.raidTab = UI.raidTab || "risks";

/* ---------- plan ---------- */
function planOf(id) { const p = PRJ.plan[id]; return p ? { wave: p[0], ws: p[1], start: p[2], discover: p[3], draft: p[4], review: p[5], approve: p[6], live: p[7] } : null; }
const doneStatus = (s) => s === "approved" || s === "live" || s === "na";
function dueOf(id) { return C.status.get(id)?.due || planOf(id)?.live || ""; }
function isOverdue(id) { const d = dueOf(id); return !!d && !doneStatus(itemStatus(id)) && d < todayIso(); }
function expectedStageIdx(id, t = todayIso()) {
  const p = planOf(id); if (!p) return -1;
  if (t < p.start) return -1;
  const marks = [p.discover, p.draft, p.review, p.approve, p.live];
  for (let i = 0; i < marks.length; i++) if (t <= marks[i]) return i;
  return 5;
}
function programClock(t = todayIso()) {
  const s = PRJ.meta.start, e = PRJ.meta.end;
  if (t < s) return { phase: "before", label: `Starts ${fmtD(s, true)}`, sub: `${daysBetween(t, s)} days to kickoff`, week: 0, pct: 0 };
  if (t > e) return { phase: "after", label: "Program closed", sub: `Closed ${fmtD(e, true)}`, week: 52, pct: 100 };
  const w = WAVES.find((x) => t >= x.start && t <= x.end) || WAVES.find((x) => t < x.start);
  const week = Math.floor(daysBetween(s, t) / 7) + 1;
  return { phase: "during", label: w ? w.name : "Between waves", sub: `Week ${week} of ${Math.ceil(daysBetween(s, e) / 7)}`, week, pct: (daysBetween(s, t) / daysBetween(s, e)) * 100, wave: w };
}

/* ---------- approval targets and chains ---------- */
const PROJECT_DOCS = [
  { id: "PRJ-CHARTER", name: "Project charter", route: "charter", chain: "project" },
  { id: "PRJ-PLAN", name: "Integrated plan v" + PRJ.meta.planVersion, route: "plan", chain: "project" },
];
function defaultChainFor(i) { if (i.type === "Policy") return "policy"; if (i.type === "Process") return "process"; if (i.tier === "public" || i.tier === "semi") return "public"; return "obligation"; }
function targetOf(id) {
  if (ITEM[id]) { const i = ITEM[id]; return { id, name: i.name, type: i.type, route: i.route, chain: defaultChainFor(i), item: true }; }
  if (TPL[id]) return { id, name: TPL[id].name, type: "Template", route: "template." + id, chain: TPL[id].category === "Project" ? "project" : "policy" };
  const d = PROJECT_DOCS.find((x) => x.id === id); if (d) return { ...d, type: "Project document" };
  return null;
}
function allChains() {
  const m = new Map(PRJ.chains.map((c) => [c.id, { ...c, builtin: true, steps: c.steps.map((s) => ({ ...s, approvers: [] })) }]));
  C.chains.forEach((doc, id) => {
    if (!doc || doc.deleted) { if (!PRJ.chains.some((c) => c.id === id)) m.delete(id); return; }
    m.set(id, { ...(m.get(id) || {}), ...doc, id, builtin: PRJ.chains.some((c) => c.id === id), steps: (doc.steps || []).map((s) => ({ approvers: [], ...s })) });
  });
  return m;
}
const chainById = (id) => allChains().get(id);

/* request state: derived from the request doc plus every approver's own sign-off record */
function reqState(id) {
  const req = C.requests.get(id); if (!req) return null;
  const ch = chainById(req.chainId) || chainById(targetOf(id)?.chain || "policy");
  if (!ch) return null;
  const cycle = req.cycle || 1, round = req.round || 1;
  const all = [];
  C.signoffs.forEach((doc, uid) => { for (const st of ch.steps) { const arr = doc?.d?.[id + "@" + st.id]; if (Array.isArray(arr)) arr.forEach((x) => all.push({ uid, step: st.id, ...x })); } });
  const decisions = all.filter((x) => x.cycle === cycle).sort((a, b) => (a.at || "").localeCompare(b.at || ""));
  const steps = ch.steps.map((st) => {
    const valid = decisions.filter((x) => x.step === st.id && (st.approvers || []).includes(x.uid));
    const latest = new Map(); valid.forEach((x) => latest.set(x.uid, x));
    const cur = [...latest.values()];
    const yes = cur.filter((x) => x.decision === "approve" || x.decision === "skip");
    const no = cur.filter((x) => x.decision === "reject" && x.round === round);
    const ap = st.approvers || [];
    const done = ap.length > 0 && (st.rule === "all" ? ap.every((u) => ["approve", "skip"].includes(latest.get(u)?.decision)) : yes.length > 0) && !no.length;
    const skipped = done && yes.every((x) => x.decision === "skip");
    const pending = ap.filter((u) => !["approve", "skip"].includes(latest.get(u)?.decision));
    return { ...st, done, skipped, rejected: no.length > 0, rejectedBy: no, approvedBy: yes, pending, unassigned: ap.length === 0 };
  });
  let status = "approved", cur = -1;
  if (req.status === "withdrawn") status = "withdrawn";
  else for (let i = 0; i < steps.length; i++) {
    if (steps[i].rejected) { status = "changes"; cur = i; break; }
    if (!steps[i].done) { status = "review"; cur = i; break; }
  }
  const lastAt = [req.submittedAt, ...decisions.map((x) => x.at)].filter(Boolean).sort().pop();
  return { id, req, chain: ch, steps, cur, status, cycle, round, decisions, lastAt, target: targetOf(id) };
}
function allRequests() { return [...C.requests.keys()].map(reqState).filter(Boolean); }
const waitingOnMe = (r) => r.status === "review" && C.me?.id && r.steps[r.cur]?.pending.includes(C.me.id);
function waitingCount() { return C.me?.id ? allRequests().filter(waitingOnMe).length : 0; }
const REQ_LABEL = { review: "In review", changes: "Changes requested", approved: "Approved", withdrawn: "Withdrawn" };
const REQ_CHIP = { review: "accent", changes: "bad", approved: "ok", withdrawn: "" };
function reqChip(r) { return `<span class="chip ${REQ_CHIP[r.status]}">${esc(REQ_LABEL[r.status])}${r.status === "review" ? ` · step ${r.cur + 1} of ${r.steps.length}` : ""}</span>`; }

/* writes */
async function submitForApproval(id, chainId, note, link) {
  if (!C.db) { toast("Approvals are shared when this page is open on claude.ai."); return; }
  const prev = C.requests.get(id); const st = prev ? reqState(id) : null;
  const newCycle = !prev || st?.status === "approved" || st?.status === "withdrawn";
  const by = C.me?.id || null, at = nowIso();
  const doc = {
    itemId: id, chainId, note: (note || "").slice(0, 2000), link: (link || prev?.link || "").slice(0, 500), status: "active",
    cycle: newCycle ? (prev?.cycle || 0) + 1 : prev.cycle || 1, round: newCycle ? 1 : (prev.round || 1) + 1,
    submittedBy: by, submittedAt: at,
    history: [...(prev?.history || []), { type: newCycle ? "submit" : "resubmit", by, at, note: (note || "").slice(0, 2000) }].slice(-60),
  };
  try { await C.db.doc("requests/" + id).set(doc); if (ITEM[id]) await setItemStatus(id, { status: "review" }); toast(newCycle ? "Submitted for approval" : "Resubmitted"); }
  catch (e) { writeErr(e); }
}
async function withdrawRequest(id) {
  const prev = C.requests.get(id); if (!prev) return;
  try { await C.db.doc("requests/" + id).set({ ...prev, status: "withdrawn", history: [...(prev.history || []), { type: "withdraw", by: C.me?.id || null, at: nowIso() }].slice(-60) }); toast("Request withdrawn"); }
  catch (e) { writeErr(e); }
}
async function decide(id, stepId, decision, note) {
  if (!C.me?.id) { toast("Signing needs a signed-in identity on claude.ai."); return; }
  const r = reqState(id); if (!r) return;
  const mine = C.signoffs.get(C.me.id) || {}; const d = { ...(mine.d || {}) };
  const key = id + "@" + stepId;
  d[key] = [...(d[key] || []), { decision, note: (note || "").slice(0, 2000), at: nowIso(), cycle: r.cycle, round: r.round }].slice(-20);
  try {
    await C.db.doc("signoffs/" + C.me.id).set({ d });
    C.signoffs.set(C.me.id, { d });
    const after = reqState(id);
    if (ITEM[id]) {
      if (after.status === "approved") await setItemStatus(id, { status: "approved" });
      else if (decision === "reject") await setItemStatus(id, { status: "drafting" });
    }
    toast(decision === "approve" ? (after.status === "approved" ? "Approved. The chain is complete." : "Approved and logged") : decision === "reject" ? "Sent back to the owner" : "Step marked not required");
  } catch (e) { writeErr(e); }
}
async function saveChain(ch) {
  const doc = { name: ch.name, description: ch.description || "", appliesTo: ch.appliesTo || "", steps: ch.steps.map((s) => ({ id: s.id, name: s.name, role: s.role || "", rule: s.rule === "all" ? "all" : "any", optional: !!s.optional, guidance: s.guidance || "", approvers: s.approvers || [] })), updatedBy: C.me?.id || null, updatedAt: nowIso() };
  try { await C.db.doc("chains/" + ch.id).set(doc); toast("Chain saved"); return true; } catch (e) { writeErr(e); return false; }
}

/* approval badge and actions for item, policy, process and template pages */
function approvalBox(id) {
  return `<div class="appr-box" data-apprbox="${attr(id)}"></div>`;
}
function drawApprovalBoxes(root) {
  $$("[data-apprbox]", root).forEach((box) => {
    const id = box.dataset.apprbox; const r = reqState(id); const tgt = targetOf(id); if (!tgt) return;
    const p = planOf(id);
    const plan = p ? `<span class="small muted">${waveShort(p.wave)} · ${esc(WSS[p.ws].name)} · go-live ${fmtD(dueOf(id), true)}${isOverdue(id) ? ' <span class="chip bad">Overdue</span>' : ""}</span>` : "";
    if (!r || r.status === "withdrawn") {
      box.innerHTML = `<div class="row" style="gap:10px">${plan}<button class="btn sm" data-submit="${attr(id)}">${icon("check", 15)}Submit for approval</button></div>`;
    } else {
      const st = r.steps[r.cur];
      box.innerHTML = `<div class="row" style="gap:10px">${plan}<a class="appr-pill" href="#approval.${attr(id)}">${reqChip(r)}<span class="small">${r.status === "review" ? "Waiting on " + esc(st.name) : r.status === "changes" ? "Sent back at " + esc(st.name) : "Chain: " + esc(r.chain.name)}</span>${icon("arrow", 13)}</a>${r.status === "approved" ? `<button class="btn sm ghost" data-submit="${attr(id)}">Start a new review</button>` : ""}</div>`;
    }
  });
}
function openSubmit(id) {
  const tgt = targetOf(id); if (!tgt) return;
  if (!C.db) { toast("Approvals are shared when this page is open on claude.ai."); return; }
  const chs = [...allChains().values()];
  const prev = C.requests.get(id); const st = prev ? reqState(id) : null;
  const re = st && st.status === "changes";
  const m = openModal({
    title: re ? "Resubmit for approval" : "Submit for approval", sub: `${esc(tgt.id)} · ${esc(tgt.name)}`,
    body: `<div class="field"><label for="sb-chain">Approval chain</label><select class="select" id="sb-chain" ${re ? "disabled" : ""}>${chs.map((c) => `<option value="${attr(c.id)}" ${c.id === (prev?.chainId || tgt.chain) ? "selected" : ""}>${esc(c.name)} (${c.steps.length} steps)</option>`).join("")}</select></div>
      <div id="sb-steps" class="small muted"></div>
      <div class="field"><label for="sb-link">Link to the document <span class="muted">(optional)</span></label><input class="input" id="sb-link" placeholder="https://… policy repository, SharePoint or Atlas page" value="${attr(prev?.link || "")}"></div>
      <div class="field"><label for="sb-note">${re ? "What changed" : "Note for approvers"}</label><textarea class="textarea" id="sb-note" placeholder="${re ? "Summarize how you addressed the feedback" : "Scope, effective date, anything approvers should check"}"></textarea></div>`,
    foot: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="sb-go">${re ? "Resubmit" : "Submit"}</button>`,
  });
  const showSteps = () => { const c = chainById($("#sb-chain", m).value); const un = c.steps.filter((s) => !(s.approvers || []).length); $("#sb-steps", m).innerHTML = `${c.steps.map((s, i) => `${i + 1}. ${esc(s.name)}${s.optional ? " (optional)" : ""}`).join(" → ")}${un.length ? `<div class="callout" style="margin-top:8px">${un.length} step${un.length > 1 ? "s have" : " has"} no named approver yet. An editor can assign approvers on the <a href="#approvals.chains">Chains</a> tab; the request waits at that step until then.</div>` : ""}`; };
  showSteps(); $("#sb-chain", m).addEventListener("change", showSteps);
  $("#sb-go", m).addEventListener("click", async () => { await submitForApproval(id, $("#sb-chain", m).value, $("#sb-note", m).value, $("#sb-link", m).value); closeModal(); render(); });
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-submit]"); if (b) { e.preventDefault(); openSubmit(b.dataset.submit); } });

/* ---------- small renderers ---------- */
function avatars(ids, max = 4) { return (ids || []).slice(0, max).map((u) => personHtml(u)).join("") + ((ids || []).length > max ? `<span class="small muted">+${ids.length - max}</span>` : ""); }
function chainViz(r) {
  return `<div class="chainviz">${r.steps.map((s, i) => {
    const state = s.done ? (s.skipped ? "skip" : "ok") : s.rejected ? "bad" : i === r.cur && r.status === "review" ? "cur" : "todo";
    return `<div class="cv-step ${state}"><div class="cv-dot">${state === "ok" ? icon("check", 16) : state === "bad" ? icon("x", 16) : i + 1}</div><div class="cv-txt"><b>${esc(s.name)}</b><span class="small muted">${esc(s.role || "")}${s.rule === "all" && (s.approvers || []).length > 1 ? " · all must sign" : ""}${s.optional ? " · optional" : ""}</span><span class="cv-who">${s.unassigned ? '<span class="chip warn">No approver assigned</span>' : avatars(s.approvers)}</span></div></div>`;
  }).join("")}</div>`;
}
function ganttSvg(opts = {}) {
  const W = 1000, padL = 190, padR = 14, rowH = 30;
  const s = "2026-10-01", e = "2027-10-31";
  const X = (iso) => padL + ((new Date(iso + "T00:00:00Z") - new Date(s + "T00:00:00Z")) / (new Date(e + "T00:00:00Z") - new Date(s + "T00:00:00Z"))) * (W - padL - padR);
  const rows = WAVES.map((w, i) => ({ label: w.name.replace(/^Wave (\d): /, "W$1 "), start: w.start, end: w.end, color: ["var(--t-best)", "var(--t-legal)", "var(--t-public)", "var(--t-semi)", "var(--accent)"][i] }));
  const top = 26, H = top + rows.length * rowH + 44;
  const months = []; for (let d = new Date(s + "T00:00:00Z"); d < new Date(e + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.toISOString().slice(0, 10));
  const t = todayIso();
  let g = `<svg class="gantt-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Program timeline: Mobilize, four waves and milestones">`;
  PRJ.meta.holidayFreezes.forEach((f) => { g += `<rect x="${X(f.start)}" y="${top - 4}" width="${Math.max(3, X(f.end) - X(f.start))}" height="${rows.length * rowH + 4}" class="g-freeze"><title>${esc(f.label)}</title></rect>`; });
  months.forEach((m) => { const x = X(m); g += `<line x1="${x}" x2="${x}" y1="${top - 6}" y2="${top + rows.length * rowH}" class="g-grid"/><text x="${x + 3}" y="${top - 10}" class="g-mo">${new Date(m + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}${m.slice(5, 7) === "01" || m === s ? " " + m.slice(2, 4) : ""}</text>`; });
  rows.forEach((r, i) => { const y = top + i * rowH; g += `<text x="0" y="${y + 19}" class="g-lab">${esc(r.label)}</text><rect x="${X(r.start)}" y="${y + 6}" width="${X(r.end) - X(r.start)}" height="${rowH - 12}" rx="5" style="fill:${r.color}"><title>${esc(WAVES[i].name)}: ${fmtD(r.start, true)} to ${fmtD(r.end, true)}</title></rect>`; });
  const my = top + rows.length * rowH + 14;
  g += `<text x="0" y="${my + 5}" class="g-lab">Milestones</text>`;
  MILES.forEach((m) => { const x = X(m.date); g += `<a href="#plan" data-mile="${attr(m.id)}"><path d="M${x} ${my - 6} L${x + 6} ${my} L${x} ${my + 6} L${x - 6} ${my} Z" class="g-ms ${m.type}"><title>${esc(m.id)} ${esc(m.name)} · ${fmtD(m.date, true)}</title></path></a>`; });
  if (t >= s && t <= e) { const x = X(t); g += `<line x1="${x}" x2="${x}" y1="${top - 6}" y2="${my + 10}" class="g-today"/><text x="${x + 4}" y="${my + 22}" class="g-mo" style="fill:var(--bad)">Today</text>`; }
  return g + "</svg>";
}
function statCounts(ids) { const by = {}; ids.forEach((id) => { const s = itemStatus(id); by[s] = (by[s] || 0) + 1; }); return by; }
function stackBar(ids) { const by = statCounts(ids); return `<span class="stackbar">${["live", "approved", "review", "drafting", "na"].map((k) => by[k] ? `<i style="width:${(by[k] / ids.length) * 100}%;background:${STATUS[k].color}" title="${STATUS[k].label}: ${by[k]}"></i>` : "").join("")}</span>`; }
const itemsInWave = (wi) => ITEMS.filter((i) => planOf(i.id)?.wave === wi).map((i) => i.id);
const doneCount = (ids) => ids.filter((id) => ["approved", "live"].includes(itemStatus(id))).length;
function raidList(kind) {
  const seeds = (PRJ.raid[kind] || []).map((x) => ({ ...x, kind, ...(C.raid.get(x.id) || {}) }));
  const extra = [...C.raid.entries()].filter(([id, v]) => v.kind === kind && !seeds.some((s) => s.id === id)).map(([id, v]) => ({ id, ...v }));
  return [...seeds, ...extra].filter((x) => !x.deleted);
}
const LMH = { High: 3, Medium: 2, Low: 1 };
const riskScore = (r) => (LMH[r.likelihood] || 1) * (LMH[r.impact] || 1);

/* ================= views ================= */
function projTabs(cur) {
  const T = [["project", "Project HQ"], ["plan", "Plan"], ["approvals", "Approvals"], ["raid", "RAID log"], ["status", "Status report"], ["governance", "Team & governance"], ["training", "Training"], ["toolkit", "Toolkit"]];
  return `<div class="tabs proj-tabs" role="tablist">${T.map(([r, l]) => `<a role="tab" href="#${r}" aria-selected="${r === cur}">${l}${r === "approvals" ? ` <span class="mono muted" data-waitcount></span>` : ""}</a>`).join("")}</div>`;
}
function fillWaitCounts(root = document) { const n = waitingCount(); $$("[data-waitcount]", root).forEach((e) => (e.textContent = n ? n : "")); }

/* ----- Project HQ ----- */
function viewProject() {
  const clk = programClock();
  const tile = (href, id, label, sub) => `<a class="tile" href="${href}"><b id="${id}">–</b><span class="tl">${label}</span><span class="ts">${sub}</span></a>`;
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><span>Project HQ</span></div>
      <div class="title-row"><div class="stack" style="gap:6px"><span class="eyebrow">${esc(PRJ.meta.title)}</span><h1>${esc(PRJ.meta.name)}</h1></div>
        <div class="actions"><a class="btn" href="#charter">${icon("book", 16)}Charter</a><a class="btn" href="#status">${icon("pulse", 16)}Status report</a><a class="btn primary" href="#approvals">${icon("check", 16)}Approvals <span class="count" data-waitcount></span></a></div></div>
      <p class="lead">${esc(PRJ.meta.tagline)}</p>
      <div class="meta-grid"><div><span class="eyebrow">Where we are</span><span class="v"><b>${esc(clk.label)}</b> · ${esc(clk.sub)}</span></div><div><span class="eyebrow">Dates</span><span class="v">${fmtD(PRJ.meta.start, true)} to ${fmtD(PRJ.meta.end, true)}</span></div><div><span class="eyebrow">Sponsor</span><span class="v">${esc(PRJ.meta.sponsor)}</span></div><div><span class="eyebrow">Program manager</span><span class="v">${esc(PRJ.meta.pm)}</span></div></div></div>
    ${projTabs("project")}
    <div class="tiles proj-tiles">
      ${tile("#plan", "hq-live", "Items done", "Approved or live, of 438")}
      ${tile("#approvals", "hq-review", "In approval", "Requests moving through chains")}
      ${tile("#plan", "hq-over", "Overdue", "Past their go-live date and not done")}
      ${tile("#approvals", "hq-wait", "Waiting on you", "Approvals you need to sign")}
      ${tile("#raid", "hq-risk", "High risks", "Open risks rated high")}
      ${tile("#plan", "hq-next", "Next milestone", "")}
    </div>
    <section class="section">${sectionHead("Timeline", `<a class="small" href="#plan">Full plan</a>`)}<div class="panel" style="overflow-x:auto">${ganttSvg()}</div>
      <div class="wave-cards">${WAVES.map((w, i) => { const ids = itemsInWave(i); return `<a class="wave-card" href="#plan" data-wv="${i}"><span class="eyebrow">${fmtD(w.start)} to ${fmtD(w.end, true)}</span><b>${esc(w.name)}</b><span class="small muted">${esc(w.goal)}</span>${ids.length ? `<span class="row between small"><span>${ids.length} items</span><span class="mono" data-wdone="${i}"></span></span><span data-wbar="${i}"></span>` : `<span class="small muted">Setup: team, chains, baseline</span>`}</a>`; }).join("")}</div></section>
    <div class="grid-2">
      <section class="section">${sectionHead("Waiting on you", `<a class="small" href="#approvals">All approvals</a>`)}<div id="hq-mine"></div></section>
      <section class="section">${sectionHead("Coming up", `<a class="small" href="#plan">Milestones</a>`)}<div class="feed" id="hq-miles"></div></section>
    </div>
    <div class="grid-2">
      <section class="section">${sectionHead("Top risks", `<a class="small" href="#raid">RAID log</a>`)}<div class="stack" id="hq-risks"></div></section>
      <section class="section">${sectionHead("Workstreams")}<div class="stack" id="hq-ws"></div></section>
    </div>
    <section class="section">${sectionHead("Video tutorials", `<a class="small" href="#training">Training plan</a>`)}<div class="vid-grid">${PRJ.videos.map(vidCard).join("")}</div></section>
  </div>`;
  return {
    html, mount(root) {
      const draw = () => {
        const ids = ITEMS.map((i) => i.id);
        $("#hq-live").textContent = doneCount(ids);
        const reqs = allRequests();
        $("#hq-review").textContent = reqs.filter((r) => r.status === "review" || r.status === "changes").length;
        $("#hq-over").textContent = ids.filter(isOverdue).length;
        $("#hq-wait").textContent = C.me?.id ? reqs.filter(waitingOnMe).length : "–";
        $("#hq-risk").textContent = raidList("risks").filter((r) => r.status !== "Closed" && riskScore(r) >= 6).length;
        const nm = MILES.find((m) => m.date >= todayIso()); $("#hq-next").textContent = nm ? fmtD(nm.date) : "Done"; if (nm) $("#hq-next").nextElementSibling.nextElementSibling.textContent = nm.name;
        WAVES.forEach((w, i) => { const wi = itemsInWave(i); const d = root.querySelector(`[data-wdone="${i}"]`); if (d) d.textContent = `${doneCount(wi)} done`; const b = root.querySelector(`[data-wbar="${i}"]`); if (b) b.innerHTML = stackBar(wi); });
        const mine = reqs.filter(waitingOnMe);
        $("#hq-mine").innerHTML = mine.length ? `<div class="list-rows">${mine.map((r) => `<a href="#approval.${attr(r.id)}"><span class="idtag">${esc(r.id)}</span><span class="nm">${esc(r.target?.name || r.id)}</span><span class="small muted">${esc(r.steps[r.cur].name)}</span></a>`).join("")}</div>` : `<div class="empty">${C.me?.id ? "Nothing is waiting on you." : "Your approvals appear here when this page is open on claude.ai."}</div>`;
        $("#hq-miles").innerHTML = MILES.filter((m) => m.date >= todayIso()).slice(0, 5).map((m) => `<div class="feed-item"><div class="date">${fmtD(m.date)}</div><div><div style="font-weight:600">${esc(m.name)} <span class="chip ${m.type === "gate" ? "accent" : ""}">${esc(m.type)}</span></div><div class="small muted">${esc(m.criteria)}</div></div></div>`).join("") || `<div class="empty">All milestones are behind us.</div>`;
        $("#hq-risks").innerHTML = raidList("risks").filter((r) => r.status !== "Closed").sort((a, b) => riskScore(b) - riskScore(a)).slice(0, 4).map((r) => `<a class="risk-row" href="#raid"><span class="heat h${riskScore(r)}">${riskScore(r)}</span><span><b>${esc(r.title)}</b><span class="small muted" style="display:block">${esc(r.owner)} · ${esc(r.status)}</span></span></a>`).join("");
        $("#hq-ws").innerHTML = WSS.map((w, k) => { const wi = ITEMS.filter((i) => planOf(i.id)?.ws === k).map((i) => i.id); return `<a class="ws-bar" href="#plan" data-wsl="${k}"><span class="lbl">${esc(w.name)}</span>${stackBar(wi)}<span class="cnt">${doneCount(wi)}/${wi.length}</span></a>`; }).join("");
        fillPeople(root); fillWaitCounts(root);
      };
      draw(); onLive(draw);
      root.addEventListener("click", (e) => { const a = e.target.closest("[data-wv]"); if (a) UI.plan.wave = a.dataset.wv; const b = e.target.closest("[data-wsl]"); if (b) UI.plan.ws = b.dataset.wsl; });
      bindVideos(root);
    },
  };
}

/* ----- Charter ----- */
function viewCharter() {
  const c = PRJ.charter;
  const secs = [["purpose", "Purpose"], ["objectives", "Objectives"], ["scope", "Scope"], ["deliverables", "Deliverables"], ["measures", "Success measures"], ["approach", "Approach"], ["milestones", "Milestones"], ["resourcing", "Resourcing"], ["budget", "Budget"], ["stakeholders", "Stakeholders"], ["assumptions", "Assumptions and constraints"], ["signoff", "Sign-off"]];
  const html = `<div class="page">
    <div class="breadcrumb"><a href="#project">Project HQ</a><span>/</span><span>Charter</span></div>
    <div class="phead"><div class="title-row"><div class="stack" style="gap:6px"><span class="eyebrow">${esc(PRJ.meta.name)}</span><h1>Project charter</h1></div>
      <div class="actions"><button class="btn ghost" data-copylink="charter">${icon("link", 16)}Copy link</button><button class="btn ghost" id="ch-md">${icon("down", 16)}Markdown</button></div></div>
      <p class="lead">${esc(c.purpose)}</p>
      <div class="meta-grid"><div><span class="eyebrow">Sponsor</span><span class="v">${esc(PRJ.meta.sponsor)}</span></div><div><span class="eyebrow">Program manager</span><span class="v">${esc(PRJ.meta.pm)}</span></div><div><span class="eyebrow">Dates</span><span class="v">${fmtD(PRJ.meta.start, true)} to ${fmtD(PRJ.meta.end, true)}</span></div><div><span class="eyebrow">Plan version</span><span class="v">${esc(PRJ.meta.planVersion)}</span></div></div>
      <div>${approvalBox("PRJ-CHARTER")}</div></div>
    <nav class="localnav" aria-label="On this page">${secs.map(([k, l]) => `<a href="#charter" data-jump="sec-${k}">${l}</a>`).join("")}</nav>
    <section class="section" id="sec-purpose">${sectionHead("Purpose and problem")}<p>${esc(c.purpose)}</p><p>${esc(c.problem)}</p></section>
    <section class="section" id="sec-objectives">${sectionHead("Objectives")}<div class="table-wrap"><table class="t"><thead><tr><th>ID</th><th>Objective</th><th>Measure</th><th>Target</th></tr></thead><tbody>${c.objectives.map((o) => `<tr><td class="mono">${esc(o.id)}</td><td>${esc(o.text)}</td><td class="small">${esc(o.measure)}</td><td class="small"><b>${esc(o.target)}</b></td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-scope">${sectionHead("Scope")}<div class="grid-2"><div class="panel"><div class="eyebrow" style="margin-bottom:6px">In scope</div>${bullets(c.inScope)}</div><div class="panel"><div class="eyebrow" style="margin-bottom:6px">Out of scope</div>${bullets(c.outOfScope)}</div></div></section>
    <section class="section" id="sec-deliverables">${sectionHead("Deliverables")}<div class="table-wrap"><table class="t kv"><tbody>${c.deliverables.map((d) => `<tr><td>${esc(d.name)}</td><td>${esc(d.detail)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-measures">${sectionHead("Success measures")}<div class="table-wrap"><table class="t"><thead><tr><th>KPI</th><th>Baseline</th><th>Target</th><th>When</th></tr></thead><tbody>${c.successMeasures.map((m) => `<tr><td>${esc(m.kpi)}</td><td class="small">${esc(m.baseline)}</td><td class="small"><b>${esc(m.target)}</b></td><td class="small nowrap">${esc(m.when)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-approach">${sectionHead("Approach")}${bullets(c.approach)}</section>
    <section class="section" id="sec-milestones">${sectionHead("Waves and milestones")}<div class="panel" style="overflow-x:auto">${ganttSvg()}</div>
      <div class="table-wrap"><table class="t"><thead><tr><th>ID</th><th>Date</th><th>Milestone</th><th>Type</th><th>Done when</th></tr></thead><tbody>${MILES.map((m) => `<tr><td class="mono">${esc(m.id)}</td><td class="nowrap">${fmtD(m.date, true)}</td><td>${esc(m.name)}</td><td><span class="chip ${m.type === "gate" ? "accent" : ""}">${esc(m.type)}</span></td><td class="small">${esc(m.criteria)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-resourcing">${sectionHead("Resourcing")}<div class="table-wrap"><table class="t"><thead><tr><th>Role</th><th>FTE</th><th>Source</th><th>Notes</th></tr></thead><tbody>${c.resourcing.map((r) => `<tr><td>${esc(r.role)}</td><td class="mono">${esc(r.fte)}</td><td class="small">${esc(r.source)}</td><td class="small">${esc(r.notes || "")}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-budget">${sectionHead("Budget (external spend)")}<div class="table-wrap"><table class="t"><thead><tr><th>Line</th><th>Estimate</th><th>Notes</th></tr></thead><tbody>${c.budget.map((b) => `<tr><td>${esc(b.line)}</td><td class="nowrap"><b>${esc(b.estimate)}</b></td><td class="small">${esc(b.notes || "")}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-stakeholders">${sectionHead("Stakeholders")}<div class="table-wrap"><table class="t"><thead><tr><th>Group</th><th>Interest</th><th>Influence</th><th>How we engage</th></tr></thead><tbody>${c.stakeholders.map((s) => `<tr><td>${esc(s.group)}</td><td class="small">${esc(s.interest)}</td><td><span class="chip ${s.influence === "High" ? "accent" : ""}">${esc(s.influence)}</span></td><td class="small">${esc(s.engagement)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-assumptions">${sectionHead("Assumptions and constraints")}<div class="grid-2"><div class="panel"><div class="eyebrow" style="margin-bottom:6px">Assumptions</div>${bullets(c.assumptions)}</div><div class="panel"><div class="eyebrow" style="margin-bottom:6px">Constraints</div>${bullets(c.constraints)}</div></div></section>
    <section class="section" id="sec-signoff">${sectionHead("Sign-off")}<p class="muted">The charter goes through the Project document chain: PMO review, steering committee, then the sponsor. Each sign-off is recorded with name and time on the approval page.</p>${approvalBox("PRJ-CHARTER")}</section>
  </div>`;
  return { html, mount(root) { const draw = () => drawApprovalBoxes(root); draw(); onLive(draw); $("#ch-md", root).addEventListener("click", () => saveFile("project-atlas-charter.md", charterMd())); } };
}
function charterMd() {
  const c = PRJ.charter;
  return [`# ${PRJ.meta.name}: project charter`, "", `*${PRJ.meta.title} · ${PRJ.meta.start} to ${PRJ.meta.end} · Sponsor: ${PRJ.meta.sponsor} · PM: ${PRJ.meta.pm}*`, "", "## Purpose", c.purpose, "", c.problem, "", "## Objectives", "| ID | Objective | Measure | Target |", "|---|---|---|---|", ...c.objectives.map((o) => `| ${o.id} | ${o.text} | ${o.measure} | ${o.target} |`), "", "## In scope", ...c.inScope.map((x) => "- " + x), "", "## Out of scope", ...c.outOfScope.map((x) => "- " + x), "", "## Deliverables", ...c.deliverables.map((d) => `- **${d.name}:** ${d.detail}`), "", "## Success measures", "| KPI | Baseline | Target | When |", "|---|---|---|---|", ...c.successMeasures.map((m) => `| ${m.kpi} | ${m.baseline} | ${m.target} | ${m.when} |`), "", "## Approach", ...c.approach.map((x) => "- " + x), "", "## Milestones", ...MILES.map((m) => `- **${m.date} ${m.id} ${m.name}** (${m.type}): ${m.criteria}`), "", "## Resourcing", "| Role | FTE | Source | Notes |", "|---|---|---|---|", ...c.resourcing.map((r) => `| ${r.role} | ${r.fte} | ${r.source} | ${r.notes || ""} |`), "", "## Budget", ...c.budget.map((b) => `- **${b.line}:** ${b.estimate}${b.notes ? " (" + b.notes + ")" : ""}`), "", "## Stakeholders", ...c.stakeholders.map((s) => `- **${s.group}** (${s.influence}): ${s.interest} Engagement: ${s.engagement}`), "", "## Assumptions", ...c.assumptions.map((x) => "- " + x), "", "## Constraints", ...c.constraints.map((x) => "- " + x), ""].join("\n");
}

/* ----- Plan ----- */
function viewPlan() {
  const F = UI.plan;
  const opt = (arr, cur, all) => `<option value="">${all}</option>` + arr.map(([v, l]) => `<option value="${attr(v)}" ${String(v) === String(cur) ? "selected" : ""}>${esc(l)}</option>`).join("");
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#project">Project HQ</a><span>/</span><span>Plan</span></div><h1>Integrated plan</h1>
      <p class="lead">Every one of the ${ITEMS.length} items has a wave, a workstream and dated stages: discover, draft, review, approve and go live. Required items are split across Waves 1 to 3 by risk, with policies first; best-practice items land in Wave 4. Dates skip the year-end freeze. An owner can override a go-live date on the item.</p>
      <div>${approvalBox("PRJ-PLAN")}</div></div>
    ${projTabs("plan")}
    <section class="section">${sectionHead("Timeline", `<span class="small muted">Shaded bands are freezes. Diamonds are milestones.</span>`)}<div class="panel" style="overflow-x:auto">${ganttSvg()}</div></section>
    <section class="section">${sectionHead("Workstreams by wave", `<span class="small muted">Items planned · done</span>`)}
      <div class="table-wrap"><table class="t matrix"><thead><tr><th>Workstream</th><th>Lead</th>${WAVES.slice(1).map((w) => `<th>${esc(w.name.split(":")[0])}</th>`).join("")}<th>Total</th></tr></thead><tbody id="pl-matrix"></tbody></table></div></section>
    <section class="section">${sectionHead("Item schedule")}
      <div class="filters">
        <input class="input" id="pl-q" type="search" placeholder="Filter by name or ID" value="${attr(F.q)}" aria-label="Filter plan">
        <select class="select" id="pl-wave" aria-label="Wave">${opt(WAVES.slice(1).map((w, i) => [i + 1, w.name]), F.wave, "All waves")}</select>
        <select class="select" id="pl-ws" aria-label="Workstream">${opt(WSS.map((w, i) => [i, w.name]), F.ws, "All workstreams")}</select>
        <select class="select" id="pl-type" aria-label="Type">${opt([["Policy", "Policies"], ["Process", "Processes"], ["Obligation", "Obligations"]], F.type, "All types")}</select>
        <select class="select" id="pl-state" aria-label="State">${opt([["overdue", "Overdue"], ["open", "Not done"], ["done", "Done"], ["approval", "In approval"]], F.state, "Any state")}</select>
        <span class="small muted" id="pl-n"></span><span style="flex:1"></span>
        <button class="btn sm" id="pl-csv">${icon("down", 15)}Export plan CSV</button></div>
      <div class="table-wrap"><table class="t plan-t"><thead><tr><th>ID</th><th>Item</th><th>Workstream</th><th>Wave</th><th>Start</th><th>Draft</th><th>Approve</th><th>Go live</th><th>Status</th><th>Approval</th></tr></thead><tbody id="pl-body"></tbody></table></div></section>
  </div>`;
  return {
    html, mount(root) {
      const rows = () => {
        const q = F.q.toLowerCase().trim();
        return ITEMS.filter((i) => { const p = planOf(i.id); if (!p) return false;
          if (F.wave !== "" && String(p.wave) !== String(F.wave)) return false;
          if (F.ws !== "" && String(p.ws) !== String(F.ws)) return false;
          if (F.type && (F.type === "Obligation" ? ["Policy", "Process"].includes(i.type) : i.type !== F.type)) return false;
          const s = itemStatus(i.id);
          if (F.state === "overdue" && !isOverdue(i.id)) return false;
          if (F.state === "open" && doneStatus(s)) return false;
          if (F.state === "done" && !["approved", "live"].includes(s)) return false;
          if (F.state === "approval" && !(reqState(i.id)?.status === "review")) return false;
          return !q || (i.id + " " + i.name).toLowerCase().includes(q);
        }).sort((a, b) => planOf(a.id).live.localeCompare(planOf(b.id).live) || a.id.localeCompare(b.id));
      };
      const draw = () => {
        $("#pl-matrix").innerHTML = WSS.map((w, k) => { const all = ITEMS.filter((i) => planOf(i.id)?.ws === k); return `<tr><td><b>${esc(w.name)}</b></td><td class="small">${esc(w.lead)}</td>${[1, 2, 3, 4].map((wi) => { const ids = all.filter((i) => planOf(i.id).wave === wi).map((i) => i.id); return `<td class="mono">${ids.length} · ${doneCount(ids)}</td>`; }).join("")}<td class="mono"><b>${all.length}</b> · ${doneCount(all.map((i) => i.id))}</td></tr>`; }).join("");
        const list = rows(); $("#pl-n").textContent = `${list.length} items`;
        $("#pl-body").innerHTML = list.map((i) => { const p = planOf(i.id); const r = reqState(i.id); const ov = isOverdue(i.id); const due = dueOf(i.id);
          return `<tr class="${ov ? "overdue" : ""}"><td>${idTag(i.id)}</td><td><a href="#${attr(i.route)}">${esc(i.name)}</a><div class="tiny muted">${esc(i.type)}</div></td><td class="small">${esc(WSS[p.ws].name)}</td><td class="nowrap">${waveShort(p.wave)}</td><td class="nowrap small">${fmtD(p.start)}</td><td class="nowrap small">${fmtD(p.draft)}</td><td class="nowrap small">${fmtD(p.approve)}</td><td class="nowrap small"><b>${fmtD(due)}</b>${due !== p.live ? ' <span class="chip" title="Owner changed the date">moved</span>' : ""}${ov ? ' <span class="chip bad">Overdue</span>' : ""}</td><td>${statusSelect(i.id)}</td><td>${r && r.status !== "withdrawn" ? `<a href="#approval.${attr(i.id)}">${reqChip(r)}</a>` : `<button class="btn sm ghost" data-submit="${attr(i.id)}">Submit</button>`}</td></tr>`; }).join("");
      };
      draw(); onLive(() => { if (!$("#pl-body", root).contains(document.activeElement)) draw(); });
      const bind = (sel, key, ev = "change") => $(sel, root).addEventListener(ev, (e) => { F[key] = e.target.value; draw(); });
      bind("#pl-q", "q", "input"); bind("#pl-wave", "wave"); bind("#pl-ws", "ws"); bind("#pl-type", "type"); bind("#pl-state", "state");
      root.addEventListener("change", (e) => { const s = e.target.closest("[data-status-for]"); if (s) { s.dataset.s = s.value; setItemStatus(s.dataset.statusFor, { status: s.value }); } });
      $("#pl-csv", root).addEventListener("click", () => saveFile("project-atlas-plan.csv", planCsv(rows())));
      const draw2 = () => drawApprovalBoxes(root); draw2(); onLive(draw2);
    },
  };
}
function planCsv(list) {
  const head = ["ID", "Item", "Type", "Workstream", "Wave", "Start", "Discover done", "Draft done", "Review done", "Approved by", "Go live (plan)", "Go live (current)", "Status", "Overdue", "Approval", "Owner", "Assignee note"];
  return [head, ...list.map((i) => { const p = planOf(i.id); const r = reqState(i.id); const s = C.status.get(i.id) || {}; return [i.id, i.name, i.type, WSS[p.ws].name, WAVES[p.wave].name, p.start, p.discover, p.draft, p.review, p.approve, p.live, dueOf(i.id), STATUS[itemStatus(i.id)].label, isOverdue(i.id) ? "Yes" : "", r ? REQ_LABEL[r.status] : "", s.owner || i.owner || "", s.note || ""]; })].map((r) => r.map(csvCell).join(",")).join("\n");
}

/* ----- Approvals ----- */
function viewApprovals(arg) {
  const tab = ["mine", "flight", "changes", "approved", "chains"].includes(arg) ? arg : UI.appr;
  UI.appr = tab;
  const T = [["mine", "Waiting on you"], ["flight", "In flight"], ["changes", "Sent back"], ["approved", "Approved"], ["chains", "Chains"]];
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#project">Project HQ</a><span>/</span><span>Approvals</span></div><h1>Approvals</h1>
      <p class="lead">Every policy, process, obligation, template and project document goes through an approval chain: named approvers sign in order, anyone can see where a request is, and each sign-off is time-stamped as audit evidence. Editors set up the chains and name the approvers.</p>
      ${C.db ? "" : `<div class="callout">Approvals are shared when this page is opened on claude.ai. Here you can look at the chains.</div>`}</div>
    ${projTabs("approvals")}
    <div class="seg" role="group" aria-label="Approvals view" id="ap-tabs">${T.map(([k, l]) => `<button data-ap="${k}" aria-pressed="${k === tab}">${l} <span class="mono" data-apn="${k}"></span></button>`).join("")}</div>
    <div id="ap-body" style="margin-top:14px"></div></div>`;
  return {
    html, mount(root) {
      let cur = tab;
      const draw = () => {
        const reqs = allRequests();
        const sets = { mine: reqs.filter(waitingOnMe), flight: reqs.filter((r) => r.status === "review"), changes: reqs.filter((r) => r.status === "changes"), approved: reqs.filter((r) => r.status === "approved") };
        Object.entries(sets).forEach(([k, v]) => { const el = root.querySelector(`[data-apn="${k}"]`); if (el) el.textContent = v.length || ""; });
        const body = $("#ap-body", root);
        if (cur === "chains") { body.innerHTML = chainsHtml(); fillPeople(body); return; }
        const list = sets[cur].sort((a, b) => (b.lastAt || "").localeCompare(a.lastAt || ""));
        body.innerHTML = list.length ? `<div class="table-wrap"><table class="t"><thead><tr><th>Item</th><th>Chain</th><th>Status</th><th>Waiting on</th><th>Submitted</th><th>Last activity</th></tr></thead><tbody>${list.map((r) => {
          const st = r.steps[r.cur];
          return `<tr><td>${idTag(r.id)} <a href="#approval.${attr(r.id)}">${esc(r.target?.name || r.id)}</a></td><td class="small">${esc(r.chain.name)}</td><td>${reqChip(r)}</td><td>${r.status === "review" ? `<div class="small"><b>${esc(st.name)}</b></div>${st.unassigned ? '<span class="chip warn">No approver</span>' : avatars(st.pending)}` : r.status === "changes" ? `<span class="small">Owner to resubmit</span>` : "–"}</td><td class="small nowrap">${personHtml(r.req.submittedBy)}<div class="tiny muted">${esc(fmtRel(r.req.submittedAt))}</div></td><td class="small nowrap">${esc(fmtRel(r.lastAt))}</td></tr>`;
        }).join("")}</tbody></table></div>` : `<div class="empty">${{ mine: C.me?.id ? "Nothing is waiting on you right now." : "Requests waiting on you appear here when this page is open on claude.ai.", flight: "No requests are in review. Open any policy, process or checklist item and choose Submit for approval.", changes: "Nothing has been sent back.", approved: "No approvals completed yet." }[cur]}</div>`;
        fillPeople(body);
      };
      draw(); onLive(draw);
      $("#ap-tabs", root).addEventListener("click", (e) => { const b = e.target.closest("[data-ap]"); if (!b) return; cur = UI.appr = b.dataset.ap; $$("[data-ap]", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
      root.addEventListener("click", (e) => {
        const ed = e.target.closest("[data-editchain]"); if (ed) { openChainEditor(ed.dataset.editchain); return; }
        if (e.target.closest("#ch-new")) { openChainEditor(null); return; }
        const rs = e.target.closest("[data-resetchain]"); if (rs && confirmInline(rs, "Click again to reset")) { C.db.doc("chains/" + rs.dataset.resetchain).delete().then(() => toast("Chain reset to the default")).catch(writeErr); }
      });
    },
  };
}
function confirmInline(btn, msg) { if (btn.dataset.armed) return true; btn.dataset.armed = "1"; const t = btn.textContent; btn.textContent = msg; setTimeout(() => { btn.textContent = t; delete btn.dataset.armed; }, 2500); return false; }
function chainsHtml() {
  const chs = [...allChains().values()];
  const canEditChains = C.canEdit && C.db;
  return `<div class="row between" style="margin-bottom:12px"><p class="muted" style="max-width:820px;margin:0">Each chain is an ordered list of steps. A step names a role, one or more approvers, and whether <b>any</b> or <b>all</b> of them must sign. Optional steps, such as works council consultation, can be marked not required with a note. ${canEditChains ? "" : "Only editors can change chains."}</p>${canEditChains ? `<button class="btn primary" id="ch-new">${icon("edit", 15)}New chain</button>` : ""}</div>
    <div class="stack">${chs.map((c) => `<div class="panel chain-card"><div class="row between"><div><h3 style="margin:0">${esc(c.name)} ${c.builtin ? "" : '<span class="chip accent">Custom</span>'}</h3><div class="small muted">${esc(c.appliesTo || "")}${c.description ? " · " + esc(c.description) : ""}</div></div>
      ${canEditChains ? `<div class="row"><button class="btn sm" data-editchain="${attr(c.id)}">${icon("edit", 14)}Edit</button>${c.builtin && C.chains.has(c.id) ? `<button class="btn sm ghost" data-resetchain="${attr(c.id)}">Reset to default</button>` : ""}${!c.builtin ? `<button class="btn sm ghost danger" data-resetchain="${attr(c.id)}">Delete</button>` : ""}</div>` : ""}</div>
      ${chainViz({ steps: c.steps.map((s) => ({ ...s, done: false, rejected: false, unassigned: !(s.approvers || []).length })), cur: -1, status: "draft" })}</div>`).join("")}</div>`;
}
function openChainEditor(id) {
  const base = id ? JSON.parse(JSON.stringify(chainById(id))) : { id: "c-" + Math.random().toString(36).slice(2, 8), name: "", description: "", appliesTo: "", steps: [{ id: "s1", name: "Owner sign-off", role: "Owner", rule: "any", optional: false, guidance: "", approvers: [] }] };
  const ch = base;
  const m = openModal({ title: id ? "Edit approval chain" : "New approval chain", wide: true, body: `<div id="ce"></div>`, foot: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="ce-save">Save chain</button>` });
  const draw = () => {
    $("#ce", m).innerHTML = `<div class="grid-2"><div class="field"><label>Name</label><input class="input" data-cf="name" value="${attr(ch.name)}" placeholder="For example: Country addendum"></div><div class="field"><label>Applies to</label><input class="input" data-cf="appliesTo" value="${attr(ch.appliesTo || "")}" placeholder="Which items use it"></div></div>
      <div class="field"><label>Description</label><input class="input" data-cf="description" value="${attr(ch.description || "")}"></div>
      <div class="eyebrow" style="margin:14px 0 6px">Steps, in order</div>
      <div class="stack">${ch.steps.map((s, i) => `<div class="panel tight ce-step" data-si="${i}">
        <div class="row between"><b>Step ${i + 1}</b><div class="row"><button class="icon-btn" data-sm="up" title="Move up" ${i === 0 ? "disabled" : ""}>${icon("up", 15)}</button><button class="icon-btn" data-sm="down" title="Move down" ${i === ch.steps.length - 1 ? "disabled" : ""} style="transform:rotate(180deg)">${icon("up", 15)}</button><button class="icon-btn" data-sm="del" title="Remove step" ${ch.steps.length === 1 ? "disabled" : ""}>${icon("x", 15)}</button></div></div>
        <div class="grid-3"><div class="field"><label>Step name</label><input class="input" data-sf="name" value="${attr(s.name)}"></div><div class="field"><label>Role</label><input class="input" data-sf="role" value="${attr(s.role || "")}"></div>
          <div class="field"><label>Who must sign</label><select class="select" data-sf="rule"><option value="any" ${s.rule !== "all" ? "selected" : ""}>Any one approver</option><option value="all" ${s.rule === "all" ? "selected" : ""}>All approvers</option></select></div></div>
        <div class="field"><label>Approvers</label><div class="row" style="gap:6px;flex-wrap:wrap">${(s.approvers || []).map((u) => `<span class="chip">${personHtml(u)}<button class="icon-btn" data-rm="${attr(u)}" aria-label="Remove approver" style="width:20px;height:20px">${icon("x", 12)}</button></span>`).join("")}
          <span style="position:relative;min-width:220px"><input class="input" data-ap-search placeholder="${C.user ? "Add a person" : "People search works on claude.ai"}" autocomplete="off" ${C.user ? "" : "disabled"}><div class="asg-menu panel tight" hidden style="position:absolute;z-index:9;left:0;right:0;top:36px;padding:4px"></div></span></div></div>
        <div class="row"><label class="row small" style="gap:6px"><input type="checkbox" data-sf="optional" ${s.optional ? "checked" : ""}> Optional step (can be marked not required with a note)</label></div>
        <div class="field"><label>Guidance for approvers</label><input class="input" data-sf="guidance" value="${attr(s.guidance || "")}"></div></div>`).join("")}</div>
      <button class="btn sm" id="ce-add" style="margin-top:10px">${icon("edit", 14)}Add a step</button>`;
    fillPeople($("#ce", m));
  };
  draw();
  const sync = () => {
    $$("[data-cf]", m).forEach((el) => (ch[el.dataset.cf] = el.value.slice(0, 300)));
    $$(".ce-step", m).forEach((row) => { const s = ch.steps[+row.dataset.si]; $$("[data-sf]", row).forEach((el) => (s[el.dataset.sf] = el.type === "checkbox" ? el.checked : el.value.slice(0, 500))); });
  };
  m.addEventListener("click", (e) => {
    const sm = e.target.closest("[data-sm]"); if (sm) { sync(); const i = +sm.closest(".ce-step").dataset.si; const a = ch.steps; if (sm.dataset.sm === "up" && i > 0) [a[i - 1], a[i]] = [a[i], a[i - 1]]; if (sm.dataset.sm === "down" && i < a.length - 1) [a[i + 1], a[i]] = [a[i], a[i + 1]]; if (sm.dataset.sm === "del") a.splice(i, 1); draw(); return; }
    const rm = e.target.closest("[data-rm]"); if (rm) { sync(); const s = ch.steps[+rm.closest(".ce-step").dataset.si]; s.approvers = s.approvers.filter((u) => u !== rm.dataset.rm); draw(); return; }
    const pk = e.target.closest("[data-pickap]"); if (pk) { sync(); const s = ch.steps[+pk.closest(".ce-step").dataset.si]; if (!s.approvers.includes(pk.dataset.pickap)) s.approvers.push(pk.dataset.pickap); draw(); return; }
    if (e.target.closest("#ce-add")) { sync(); const n = ch.steps.length + 1; let sid = "s" + n; while (ch.steps.some((s) => s.id === sid)) sid += "x"; ch.steps.push({ id: sid, name: "New step", role: "", rule: "any", optional: false, guidance: "", approvers: [] }); draw(); return; }
    if (e.target.closest("#ce-save")) { sync(); if (!ch.name.trim()) { toast("Give the chain a name"); return; } saveChain(ch).then((ok) => { if (ok) closeModal(); }); }
  });
  const search = async (inp) => { const menu = inp.parentElement.querySelector(".asg-menu"); const hits = await C.user.search(inp.value.trim()); menu.innerHTML = hits.length ? hits.map((p) => `<button class="pal-item" data-pickap="${attr(p.id)}" style="width:100%;text-align:left"><img class="avatar" alt="" src="${attr(p.avatarUrl)}"> <span class="nm"></span></button>`).join("") : `<div class="small muted" style="padding:6px">No matches</div>`; hits.forEach((p, i) => { const n = menu.querySelectorAll(".nm")[i]; if (n) n.textContent = p.name; }); menu.hidden = false; };
  m.addEventListener("focusin", (e) => { const a = e.target.closest("[data-ap-search]"); if (a && C.user) search(a); });
  m.addEventListener("input", (e) => { const a = e.target.closest("[data-ap-search]"); if (a && C.user) search(a); });
}

/* ----- one request ----- */
function viewApproval(id) {
  const tgt = targetOf(id); if (!tgt) return viewNotFound();
  const html = `<div class="page"><div class="breadcrumb"><a href="#approvals">Approvals</a><span>/</span><span class="mono">${esc(id)}</span></div><div id="ar"></div></div>`;
  return {
    html, mount(root) {
      const draw = () => {
        const box = $("#ar", root); if (box.contains(document.activeElement) && document.activeElement.tagName === "TEXTAREA") return;
        const r = reqState(id);
        const head = `<div class="phead"><div class="row">${idTag(id)}<span class="chip">${esc(tgt.type)}</span>${r ? reqChip(r) : ""}</div><h1><a href="#${attr(tgt.route)}" style="color:inherit">${esc(tgt.name)}</a></h1></div>`;
        if (!r) { box.innerHTML = head + `<div class="empty">${C.ready ? "This item hasn't been submitted for approval." : "Loading…"} <button class="btn sm" data-submit="${attr(id)}">Submit for approval</button></div>`; return; }
        const st = r.steps[r.cur];
        const me = C.me?.id; const iCan = me && r.status === "review" && st && (st.approvers || []).includes(me) && st.pending.includes(me);
        const isOwnerish = me && (r.req.submittedBy === me || C.status.get(id)?.assigneeId === me || C.canEdit);
        box.innerHTML = head + `<div class="stack lg">
          <div class="meta-grid"><div><span class="eyebrow">Chain</span><span class="v">${esc(r.chain.name)}</span></div><div><span class="eyebrow">Submitted</span><span class="v">${personHtml(r.req.submittedBy)} · ${esc(fmtRel(r.req.submittedAt))}</span></div><div><span class="eyebrow">Review cycle</span><span class="v">Cycle ${r.cycle}${r.round > 1 ? `, resubmission ${r.round - 1}` : ""}</span></div><div><span class="eyebrow">Document</span><span class="v">${r.req.link ? `<a href="${attr(r.req.link)}" target="_blank" rel="noopener">Open document</a>` : `<a href="#${attr(tgt.route)}">Atlas page</a>`}</span></div></div>
          ${r.req.note ? `<div class="panel"><div class="eyebrow">Note from the submitter</div><div style="white-space:pre-wrap;margin-top:4px">${esc(r.req.note)}</div></div>` : ""}
          <section class="section">${sectionHead("Progress")}${chainViz(r)}</section>
          ${r.status === "review" ? `<div class="panel ${iCan ? "act-panel" : ""}"><div class="row between"><div><div class="eyebrow">Current step</div><b>${esc(st.name)}</b> <span class="small muted">${esc(st.role || "")}</span>${st.guidance ? `<div class="small muted" style="margin-top:4px">${esc(st.guidance)}</div>` : ""}</div><div>${st.unassigned ? `<span class="chip warn">No approver assigned</span>` : `<span class="small muted">Waiting on </span>${avatars(st.pending)}`}</div></div>
            ${iCan ? `<textarea class="textarea" id="ar-note" placeholder="Comment (required to send back)" style="min-height:64px;margin-top:10px"></textarea><div class="row" style="margin-top:8px"><button class="btn primary" data-dec="approve">${icon("check", 15)}Approve</button><button class="btn danger" data-dec="reject">Send back</button>${st.optional ? `<button class="btn ghost" data-dec="skip">Not required here</button>` : ""}</div>` : st.unassigned ? `<p class="small muted" style="margin-top:8px">An editor needs to name an approver for this step on the <a href="#approvals.chains">Chains</a> tab.</p>` : ""}</div>` : ""}
          ${r.status === "changes" ? `<div class="callout"><b>Sent back at ${esc(st.name)}</b>${r.steps[r.cur].rejectedBy.map((x) => `<div style="margin-top:6px">${personHtml(x.uid)}: <span style="white-space:pre-wrap">${esc(x.note || "No reason given")}</span></div>`).join("")}${isOwnerish ? `<div style="margin-top:10px"><button class="btn primary" data-submit="${attr(id)}">Resubmit</button></div>` : ""}</div>` : ""}
          ${r.status === "approved" ? `<div class="callout info"><b>Approved.</b> Every step in the chain is complete. Download the approval record and file it as evidence.</div>` : ""}
          <div class="row"><button class="btn" id="ar-md">${icon("down", 15)}Approval record</button>${isOwnerish && (r.status === "review" || r.status === "changes") ? `<button class="btn ghost danger" id="ar-wd">Withdraw</button>` : ""}<span class="small muted">The record lists every submission and decision with names and times.</span></div>
          <section class="section">${sectionHead("Audit trail")}<div class="timeline">${auditTrail(r).map((x) => `<div class="tl-item ${x.cls}"><span class="when">${esc(fmtDate(x.at))} · ${new Date(x.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><b>${x.title}</b>${x.note ? `<span class="small" style="white-space:pre-wrap">${esc(x.note)}</span>` : ""}</div>`).join("")}</div></section></div>`;
        fillPeople(box);
      };
      draw(); onLive(draw);
      root.addEventListener("click", async (e) => {
        const d = e.target.closest("[data-dec]"); if (d) {
          const note = $("#ar-note", root)?.value.trim() || "";
          if (d.dataset.dec === "reject" && !note) { toast("Add a reason so the owner knows what to fix"); $("#ar-note", root).focus(); return; }
          const r = reqState(id); await decide(id, r.steps[r.cur].id, d.dataset.dec, note); return;
        }
        if (e.target.closest("#ar-wd")) { if (confirmInline(e.target.closest("#ar-wd"), "Click again to withdraw")) await withdrawRequest(id); return; }
        if (e.target.closest("#ar-md")) { const md = await approvalRecordMd(id); saveFile(`approval-record-${id}.md`, md); }
      });
    },
  };
}
function auditTrail(r) {
  const out = [];
  (r.req.history || []).forEach((h) => out.push({ at: h.at, cls: "", title: `${personHtml(h.by)} ${h.type === "submit" ? "submitted for approval" : h.type === "resubmit" ? "resubmitted" : "withdrew the request"}`, note: h.note }));
  r.decisions.forEach((x) => { const st = r.chain.steps.find((s) => s.id === x.step); out.push({ at: x.at, cls: x.decision === "reject" ? "high" : "", title: `${personHtml(x.uid)} ${x.decision === "approve" ? "approved" : x.decision === "reject" ? "sent back" : "marked not required"} <span class="muted">· ${esc(st?.name || x.step)}</span>`, note: x.note }); });
  return out.sort((a, b) => (b.at || "").localeCompare(a.at || ""));
}
async function approvalRecordMd(id) {
  const r = reqState(id); const tgt = targetOf(id);
  const ids = [...new Set([r.req.submittedBy, ...r.decisions.map((x) => x.uid), ...r.chain.steps.flatMap((s) => s.approvers || [])].filter(Boolean))];
  let ps = {}; try { if (C.user) ps = await C.user.profiles(ids); } catch (e) { }
  const nm = (u) => (ps[u] && ps[u].name) || "Unknown person";
  const L = [`# Approval record: ${tgt.id} ${tgt.name}`, "", `- **Chain:** ${r.chain.name}`, `- **Status:** ${REQ_LABEL[r.status]}`, `- **Cycle:** ${r.cycle}${r.round > 1 ? ` (resubmission ${r.round - 1})` : ""}`, `- **Submitted by:** ${nm(r.req.submittedBy)} on ${r.req.submittedAt}`, `- **Document:** ${r.req.link || shareUrl(tgt.route)}`, `- **Exported:** ${new Date().toISOString()}`, "", "## Steps", "", "| # | Step | Role | Rule | Approvers | Result |", "|---|---|---|---|---|---|"];
  r.steps.forEach((s, i) => L.push(`| ${i + 1} | ${s.name}${s.optional ? " (optional)" : ""} | ${s.role || ""} | ${s.rule === "all" ? "All" : "Any"} | ${(s.approvers || []).map(nm).join(", ") || "Not assigned"} | ${s.done ? (s.skipped ? "Not required" : "Approved") : s.rejected ? "Sent back" : i === r.cur ? "Pending" : "Not reached"} |`));
  L.push("", "## Audit trail", "");
  (r.req.history || []).forEach((h) => L.push(`- ${h.at} · ${nm(h.by)} ${h.type}${h.note ? `: ${h.note}` : ""}`));
  r.decisions.forEach((x) => L.push(`- ${x.at} · ${nm(x.uid)} ${x.decision === "approve" ? "approved" : x.decision === "reject" ? "sent back" : "marked not required"} at "${r.chain.steps.find((s) => s.id === x.step)?.name || x.step}"${x.note ? `: ${x.note}` : ""}`));
  return L.join("\n") + "\n";
}

/* ----- RAID log ----- */
function viewRaid() {
  const K = [["risks", "Risks"], ["issues", "Issues"], ["assumptions", "Assumptions"], ["decisions", "Decisions"]];
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#project">Project HQ</a><span>/</span><span>RAID log</span></div><h1>RAID log</h1>
      <p class="lead">Risks, assumptions, issues and decisions for the program. Anyone working on the program can update a status or add an entry; changes are shared straight away and feed the status report.</p></div>
    ${projTabs("raid")}
    <div class="row between"><div class="seg" role="group" aria-label="RAID type" id="rd-tabs">${K.map(([k, l]) => `<button data-rk="${k}" aria-pressed="${UI.raidTab === k}">${l} <span class="mono" data-rkn="${k}"></span></button>`).join("")}</div>
      <div class="row"><button class="btn sm" id="rd-csv">${icon("down", 15)}Export CSV</button><button class="btn sm primary" id="rd-add">${icon("edit", 15)}Add entry</button></div></div>
    <div id="rd-heat" style="margin-top:14px"></div><div id="rd-body" style="margin-top:14px"></div></div>`;
  return {
    html, mount(root) {
      const draw = () => {
        K.forEach(([k]) => { const el = root.querySelector(`[data-rkn="${k}"]`); if (el) el.textContent = raidList(k).filter((x) => !["Closed", "Agreed", "Validated", "Resolved"].includes(x.status)).length || ""; });
        const k = UI.raidTab, list = raidList(k);
        $("#rd-heat", root).innerHTML = k === "risks" ? riskHeat(list) : "";
        const sel = (x, opts) => `<select class="select" style="min-width:128px" data-rst="${attr(x.id)}" ${canPropose() ? "" : "disabled"}>${opts.map((o) => `<option ${o === (x.status || opts[0]) ? "selected" : ""}>${o}</option>`).join("")}</select>`;
        const body = $("#rd-body", root);
        if (body.contains(document.activeElement)) return;
        if (k === "risks") body.innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>ID</th><th>Risk</th><th>L × I</th><th>Owner</th><th>Mitigation</th><th>Status</th><th></th></tr></thead><tbody>${list.sort((a, b) => riskScore(b) - riskScore(a)).map((x) => `<tr><td class="mono nowrap">${esc(x.id)}</td><td><b>${esc(x.title)}</b><div class="small muted">${esc(x.detail || "")}</div>${x.trigger ? `<div class="tiny muted" style="margin-top:3px">Trigger: ${esc(x.trigger)}</div>` : ""}</td><td><span class="heat h${riskScore(x)}">${esc((x.likelihood || "")[0] || "")} × ${esc((x.impact || "")[0] || "")}</span></td><td class="small">${esc(x.owner || "")}</td><td class="small">${esc(x.mitigation || "")}</td><td>${sel(x, ["Open", "Mitigating", "Closed"])}</td><td><button class="icon-btn" data-redit="${attr(x.id)}" aria-label="Edit">${icon("edit", 15)}</button></td></tr>`).join("")}</tbody></table></div>`;
        if (k === "issues") body.innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>ID</th><th>Issue</th><th>Priority</th><th>Owner</th><th>Action</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${list.map((x) => `<tr><td class="mono nowrap">${esc(x.id)}</td><td><b>${esc(x.title)}</b><div class="small muted">${esc(x.detail || "")}</div></td><td><span class="chip ${x.priority === "High" ? "bad" : ""}">${esc(x.priority || "")}</span></td><td class="small">${esc(x.owner || "")}</td><td class="small">${esc(x.action || "")}</td><td class="nowrap small">${fmtD(x.due)}</td><td>${sel(x, ["Open", "In progress", "Resolved"])}</td><td><button class="icon-btn" data-redit="${attr(x.id)}" aria-label="Edit">${icon("edit", 15)}</button></td></tr>`).join("")}</tbody></table></div>`;
        if (k === "assumptions") body.innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>ID</th><th>Assumption</th><th>Owner</th><th>Validate by</th><th>Status</th><th></th></tr></thead><tbody>${list.map((x) => `<tr><td class="mono nowrap">${esc(x.id)}</td><td>${esc(x.text || x.title || "")}</td><td class="small">${esc(x.owner || "")}</td><td class="nowrap small">${fmtD(x.validateBy)}</td><td>${sel(x, ["To validate", "Validated", "Invalid"])}</td><td><button class="icon-btn" data-redit="${attr(x.id)}" aria-label="Edit">${icon("edit", 15)}</button></td></tr>`).join("")}</tbody></table></div>`;
        if (k === "decisions") body.innerHTML = `<div class="table-wrap"><table class="t"><thead><tr><th>ID</th><th>Decision</th><th>Owner</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${list.map((x) => `<tr><td class="mono nowrap">${esc(x.id)}</td><td><b>${esc(x.title)}</b><div class="small muted">${esc(x.detail || "")}</div></td><td class="small">${esc(x.owner || "")}</td><td class="nowrap small">${fmtD(x.due)}</td><td>${sel(x, ["Proposed", "Agreed", "Withdrawn"])}</td><td><button class="icon-btn" data-redit="${attr(x.id)}" aria-label="Edit">${icon("edit", 15)}</button></td></tr>`).join("")}</tbody></table></div>`;
      };
      draw(); onLive(draw);
      $("#rd-tabs", root).addEventListener("click", (e) => { const b = e.target.closest("[data-rk]"); if (!b) return; UI.raidTab = b.dataset.rk; $$("[data-rk]", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
      root.addEventListener("change", (e) => { const s = e.target.closest("[data-rst]"); if (s) saveRaid(s.dataset.rst, UI.raidTab, { status: s.value }); });
      root.addEventListener("click", (e) => { const ed = e.target.closest("[data-redit]"); if (ed) openRaidEditor(UI.raidTab, ed.dataset.redit); if (e.target.closest("#rd-add")) openRaidEditor(UI.raidTab, null); });
      $("#rd-csv", root).addEventListener("click", () => saveFile(`project-atlas-${UI.raidTab}.csv`, raidCsv(UI.raidTab)));
    },
  };
}
function riskHeat(list) {
  const open = list.filter((x) => x.status !== "Closed"); const L = ["High", "Medium", "Low"], I = ["Low", "Medium", "High"];
  return `<div class="heatmap"><div class="hm-y">Likelihood</div><div class="hm-grid">${L.map((l) => I.map((i) => { const n = open.filter((x) => x.likelihood === l && x.impact === i).length; return `<div class="hm-cell h${LMH[l] * LMH[i]}" title="${l} likelihood, ${i} impact: ${n}">${n || ""}</div>`; }).join("")).join("")}</div><div class="hm-x">Impact →</div><div class="small muted hm-note">${open.length} open risks. Darker cells need a mitigation owner and a date.</div></div>`;
}
async function saveRaid(id, kind, patch) {
  if (!C.db) { toast("The RAID log is shared when this page is open on claude.ai."); return; }
  const prev = C.raid.get(id) || {};
  try { await C.db.doc("raid/" + id).set({ ...prev, ...patch, kind, updatedBy: C.me?.id || null, updatedAt: nowIso() }); } catch (e) { writeErr(e); }
}
function openRaidEditor(kind, id) {
  const cur = id ? raidList(kind).find((x) => x.id === id) : { id: (kind === "risks" ? "R" : kind === "issues" ? "I" : kind === "assumptions" ? "A" : "D") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase(), kind };
  const F = { risks: [["title", "Risk"], ["detail", "Detail", "ta"], ["likelihood", "Likelihood", ["High", "Medium", "Low"]], ["impact", "Impact", ["High", "Medium", "Low"]], ["owner", "Owner"], ["mitigation", "Mitigation", "ta"], ["trigger", "Trigger"]],
    issues: [["title", "Issue"], ["detail", "Detail", "ta"], ["priority", "Priority", ["High", "Medium", "Low"]], ["owner", "Owner"], ["action", "Action", "ta"], ["due", "Due", "date"]],
    assumptions: [["text", "Assumption", "ta"], ["owner", "Owner"], ["validateBy", "Validate by", "date"]],
    decisions: [["title", "Decision"], ["detail", "Detail", "ta"], ["owner", "Owner"], ["due", "Due", "date"]] }[kind];
  const m = openModal({ title: id ? `Edit ${id}` : "Add entry", body: F.map(([k, l, t]) => `<div class="field"><label>${l}</label>${Array.isArray(t) ? `<select class="select" data-rf="${k}">${t.map((o) => `<option ${o === cur[k] ? "selected" : ""}>${o}</option>`).join("")}</select>` : t === "ta" ? `<textarea class="textarea" data-rf="${k}" style="min-height:64px">${esc(cur[k] || "")}</textarea>` : `<input class="input" type="${t === "date" ? "date" : "text"}" data-rf="${k}" value="${attr(cur[k] || "")}">`}</div>`).join(""), foot: `${id && !(PRJ.raid[kind] || []).some((x) => x.id === id) ? `<button class="btn ghost danger" id="rf-del">Delete</button>` : ""}<span style="flex:1"></span><button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="rf-save">Save</button>` });
  $("#rf-save", m).addEventListener("click", async () => { const patch = {}; $$("[data-rf]", m).forEach((el) => (patch[el.dataset.rf] = el.value.slice(0, 2000))); if (!id) patch.status = { risks: "Open", issues: "Open", assumptions: "To validate", decisions: "Proposed" }[kind]; await saveRaid(cur.id, kind, patch); closeModal(); });
  const del = $("#rf-del", m); if (del) del.addEventListener("click", async () => { await saveRaid(cur.id, kind, { deleted: true }); closeModal(); });
}
function raidCsv(kind) {
  const list = raidList(kind); const keys = [...new Set(list.flatMap((x) => Object.keys(x)))].filter((k) => !["kind", "updatedBy", "deleted"].includes(k));
  return [keys, ...list.map((x) => keys.map((k) => x[k] ?? ""))].map((r) => r.map(csvCell).join(",")).join("\n");
}

/* ----- Status report ----- */
function statusData() {
  const t = todayIso(); const ids = ITEMS.map((i) => i.id);
  const dueNow = ids.filter((id) => (dueOf(id) || "9") <= t);
  const over = ids.filter(isOverdue);
  const pct = dueNow.length ? over.length / dueNow.length : 0;
  const auto = pct >= 0.15 ? "Red" : pct >= 0.05 ? "Amber" : "Green";
  const rep = C.report.get("current") || {};
  const reqs = allRequests();
  return {
    t, clk: programClock(t), rag: rep.rag || auto, auto, rep, total: ids.length, done: doneCount(ids), over, dueNow,
    by: statCounts(ids),
    waves: WAVES.slice(1).map((w, k) => { const wi = itemsInWave(k + 1); return { w, n: wi.length, done: doneCount(wi), over: wi.filter(isOverdue).length, review: wi.filter((id) => itemStatus(id) === "review").length }; }),
    ws: WSS.map((w, k) => { const wi = ITEMS.filter((i) => planOf(i.id)?.ws === k).map((i) => i.id); return { w, n: wi.length, done: doneCount(wi), over: wi.filter(isOverdue).length }; }),
    inflight: reqs.filter((r) => r.status === "review"), stale: reqs.filter((r) => r.status === "review" && r.lastAt && daysBetween(r.lastAt.slice(0, 10), t) > 5), sentBack: reqs.filter((r) => r.status === "changes"),
    miles: MILES.filter((m) => m.date >= t && daysBetween(t, m.date) <= 30), nextMile: MILES.find((m) => m.date >= t),
    risks: raidList("risks").filter((r) => r.status !== "Closed" && riskScore(r) >= 6).sort((a, b) => riskScore(b) - riskScore(a)).slice(0, 5),
    decisions: raidList("decisions").filter((d) => d.status === "Proposed").slice(0, 6),
  };
}
function statusMd(S) {
  const L = [`# ${PRJ.meta.name} status report`, "", `**Week of ${fmtD(S.t, true)} · ${S.clk.label} · ${S.clk.sub}**`, "", `**Overall: ${S.rag}**${S.rep.rag ? ` (set by the PMO; calculated: ${S.auto})` : " (calculated from overdue items)"}`, "",
    `- ${S.done} of ${S.total} items done (approved or live), ${S.by.review || 0} in review, ${S.by.drafting || 0} drafting, ${S.by.none || 0} not started`, `- ${S.over.length} overdue of ${S.dueNow.length} due so far`, `- ${S.inflight.length} approvals in flight, ${S.stale.length} with no activity for over 5 days, ${S.sentBack.length} sent back`, ""];
  if (S.rep.highlights) L.push("## Highlights", S.rep.highlights, "");
  L.push("## Progress by wave", "| Wave | Items | Done | In review | Overdue |", "|---|---|---|---|---|", ...S.waves.map((x) => `| ${x.w.name} | ${x.n} | ${x.done} | ${x.review} | ${x.over} |`), "");
  L.push("## Progress by workstream", "| Workstream | Items | Done | Overdue |", "|---|---|---|---|", ...S.ws.map((x) => `| ${x.w.name} | ${x.n} | ${x.done} | ${x.over} |`), "");
  if (S.over.length) L.push("## Overdue items", ...S.over.slice(0, 25).map((id) => `- ${id} ${ITEM[id].name}: due ${dueOf(id)}, ${STATUS[itemStatus(id)].label}`), S.over.length > 25 ? `- and ${S.over.length - 25} more` : "", "");
  if (S.stale.length) L.push("## Approvals with no activity for 5+ days", ...S.stale.map((r) => `- ${r.id} ${r.target?.name}: waiting at ${r.steps[r.cur].name}`), "");
  L.push("## Milestones in the next 30 days", ...(S.miles.length ? S.miles.map((m) => `- ${m.date} ${m.name} (${m.type})`) : [`- None. Next: ${S.nextMile ? S.nextMile.date + " " + S.nextMile.name : "program closed"}`]), "");
  L.push("## Top risks", ...S.risks.map((r) => `- **${r.id} ${r.title}** (${r.likelihood} likelihood, ${r.impact} impact, ${r.status}): ${r.mitigation}`), "");
  if (S.decisions.length) L.push("## Decisions needed", ...S.decisions.map((d) => `- ${d.id} ${d.title} (owner ${d.owner}, due ${d.due})`), "");
  if (S.rep.asks) L.push("## Asks of the steering committee", S.rep.asks, "");
  return L.join("\n") + "\n";
}
function viewStatus() {
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#project">Project HQ</a><span>/</span><span>Status report</span></div><h1>Weekly status report</h1>
      <p class="lead">Built live from the checklist, the plan, approvals and the RAID log, so it is only as current as the updates people make. The PMO can set the overall rating and add highlights and asks before sending.</p></div>
    ${projTabs("status")}
    <div class="grid-2" style="align-items:start">
      <div class="panel stack"><div class="eyebrow">PMO inputs</div>
        <div class="field"><label for="sr-rag">Overall rating</label><select class="select" id="sr-rag"><option value="">Calculated</option><option>Green</option><option>Amber</option><option>Red</option></select></div>
        <div class="field"><label for="sr-hi">Highlights this week</label><textarea class="textarea" id="sr-hi" placeholder="What moved, what went live, what was decided"></textarea></div>
        <div class="field"><label for="sr-asks">Asks of the steering committee</label><textarea class="textarea" id="sr-asks" placeholder="Decisions or help needed"></textarea></div>
        <div class="row"><button class="btn primary" id="sr-save" ${canPropose() ? "" : "disabled"}>Save inputs</button><button class="btn" id="sr-copy">${icon("copy", 15)}Copy report</button><button class="btn" id="sr-md">${icon("down", 15)}Markdown</button></div></div>
      <div class="panel" id="sr-out"></div></div></div>`;
  return {
    html, mount(root) {
      const fill = () => { const rep = C.report.get("current") || {}; if (!root.contains(document.activeElement) || document.activeElement === document.body) { $("#sr-rag", root).value = rep.rag || ""; $("#sr-hi", root).value = rep.highlights || ""; $("#sr-asks", root).value = rep.asks || ""; } };
      const draw = () => {
        const S = statusData();
        $("#sr-out", root).innerHTML = `<div class="row between"><h2 style="margin:0">Week of ${fmtD(S.t, true)}</h2><span class="rag rag-${S.rag.toLowerCase()}">${S.rag}</span></div>
          <p class="small muted">${esc(S.clk.label)} · ${esc(S.clk.sub)}${S.rep.rag ? ` · calculated rating: ${S.auto}` : ""}</p>
          <div class="kpi-grid"><div class="kpi"><b>${S.done} / ${S.total}</b><span class="small muted">items done</span></div><div class="kpi"><b>${S.over.length}</b><span class="small muted">overdue of ${S.dueNow.length} due</span></div><div class="kpi"><b>${S.inflight.length}</b><span class="small muted">approvals in flight</span></div><div class="kpi"><b>${S.risks.length}</b><span class="small muted">high risks open</span></div></div>
          ${S.rep.highlights ? `<h3>Highlights</h3><p style="white-space:pre-wrap">${esc(S.rep.highlights)}</p>` : ""}
          <h3>By wave</h3><div class="table-wrap"><table class="t"><thead><tr><th>Wave</th><th>Items</th><th>Done</th><th>In review</th><th>Overdue</th></tr></thead><tbody>${S.waves.map((x) => `<tr><td>${esc(x.w.name)}</td><td class="mono">${x.n}</td><td class="mono">${x.done}</td><td class="mono">${x.review}</td><td class="mono">${x.over || ""}</td></tr>`).join("")}</tbody></table></div>
          <h3>Milestones, next 30 days</h3>${S.miles.length ? bullets(S.miles.map((m) => `${fmtD(m.date)}: ${m.name}`)) : `<p class="small muted">None. Next: ${S.nextMile ? esc(fmtD(S.nextMile.date, true) + " " + S.nextMile.name) : "program closed"}.</p>`}
          <h3>Top risks</h3>${bullets(S.risks.map((r) => `${r.id} ${r.title} (${r.status})`))}
          ${S.decisions.length ? `<h3>Decisions needed</h3>${bullets(S.decisions.map((d) => `${d.id} ${d.title}, owner ${d.owner}, due ${fmtD(d.due, true)}`))}` : ""}
          ${S.rep.asks ? `<h3>Asks</h3><p style="white-space:pre-wrap">${esc(S.rep.asks)}</p>` : ""}`;
      };
      fill(); draw(); onLive(() => { fill(); draw(); });
      $("#sr-save", root).addEventListener("click", async () => { try { await C.db.doc("report/current").set({ rag: $("#sr-rag", root).value, highlights: $("#sr-hi", root).value.slice(0, 4000), asks: $("#sr-asks", root).value.slice(0, 4000), updatedBy: C.me?.id || null, at: nowIso() }); toast("Saved for everyone"); } catch (e) { writeErr(e); } });
      $("#sr-copy", root).addEventListener("click", () => copyText(statusMd(statusData()), "Status report copied"));
      $("#sr-md", root).addEventListener("click", () => saveFile(`project-atlas-status-${todayIso()}.md`, statusMd(statusData())));
    },
  };
}

/* ----- Team & governance ----- */
function viewGovernance() {
  const g = PRJ.governance;
  const secs = [["bodies", "Governance bodies"], ["team", "Workstreams and roles"], ["raci", "RACI"], ["cadence", "Meeting cadence"], ["rights", "Decision rights"], ["escalation", "Escalation"], ["dod", "Definition of done"], ["standards", "Documentation standards"], ["gates", "Country gates"]];
  const html = `<div class="page">
    <div class="breadcrumb"><a href="#project">Project HQ</a><span>/</span><span>Team &amp; governance</span></div>
    <div class="phead"><h1>Team and governance</h1><p class="lead">Who decides what, how often we meet, how issues escalate, what "done" means at each stage, and the extra gates each country needs before a policy can take effect.</p></div>
    ${projTabs("governance")}
    <nav class="localnav" aria-label="On this page">${secs.map(([k, l]) => `<a href="#governance" data-jump="sec-${k}">${l}</a>`).join("")}</nav>
    <section class="section" id="sec-bodies">${sectionHead("Governance bodies")}<div class="grid-2">${g.bodies.map((b) => `<div class="panel stack" style="gap:6px"><b>${esc(b.name)}</b><span class="small muted">${esc(b.cadence)} · ${esc(b.members)}</span><span>${esc(b.purpose)}</span><div class="eyebrow">Decides</div>${bullets(b.decisions)}</div>`).join("")}</div></section>
    <section class="section" id="sec-team">${sectionHead("Workstreams and roles")}<div class="table-wrap"><table class="t"><thead><tr><th>Workstream</th><th>Lead</th><th>Partners</th><th>Scope</th></tr></thead><tbody>${[...WSS, ...PRJ.crossCutting].map((w) => `<tr><td><b>${esc(w.name)}</b></td><td class="small">${esc(w.lead)}</td><td class="small">${esc(w.partners || "")}</td><td class="small">${esc(w.scope)}</td></tr>`).join("")}</tbody></table></div>
      <div class="grid-2" style="margin-top:12px">${g.roles.map((r) => `<div class="panel tight stack" style="gap:4px"><b>${esc(r.role)}</b><span class="small muted">${esc(r.who)} · ${esc(r.timeCommitment)}</span>${bullets(r.responsibilities)}</div>`).join("")}</div></section>
    <section class="section" id="sec-raci">${sectionHead("RACI", `<span class="small muted">R responsible · A accountable · C consulted · I informed</span>`)}<div class="table-wrap"><table class="t raci-t"><thead><tr><th>Activity</th>${g.raci.roles.map((r) => `<th>${esc(r)}</th>`).join("")}</tr></thead><tbody>${g.raci.rows.map((row) => `<tr><td>${esc(row.activity)}</td>${g.raci.roles.map((r) => { const v = row.cells[r] || ""; return `<td class="raci-c ${v.includes("A") ? "a" : v === "R" ? "r" : ""}">${esc(v)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-cadence">${sectionHead("Meeting cadence")}<div class="table-wrap"><table class="t"><thead><tr><th>Meeting</th><th>When</th><th>Who</th><th>Agenda</th><th>Outputs</th></tr></thead><tbody>${g.cadence.map((c) => `<tr><td><b>${esc(c.meeting)}</b><div class="tiny muted">${esc(c.length)}</div></td><td class="small">${esc(c.when)}</td><td class="small">${esc(c.attendees)}</td><td class="small">${bullets(c.agenda)}</td><td class="small">${bullets(c.outputs)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-rights">${sectionHead("Decision rights")}<div class="table-wrap"><table class="t"><thead><tr><th>Decision</th><th>Owner</th><th>Consulted</th><th>Escalate to</th></tr></thead><tbody>${g.decisionRights.map((d) => `<tr><td>${esc(d.decision)}</td><td class="small"><b>${esc(d.owner)}</b></td><td class="small">${esc(d.consulted)}</td><td class="small">${esc(d.escalateTo)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-escalation">${sectionHead("Escalation path")}<div class="esc-ladder">${g.escalation.map((x) => `<div class="esc-step"><span class="esc-n">${x.level}</span><div><b>${esc(x.who)}</b><div class="small">${esc(x.when)}</div><div class="small muted">Response: ${esc(x.sla)}</div></div></div>`).join("")}</div></section>
    <section class="section" id="sec-dod">${sectionHead("Definition of done")}<div class="dod">${g.definitionOfDone.map((d, i) => `<div class="panel stack" style="gap:6px"><span class="eyebrow">Stage ${i + 1}</span><b>${esc(d.stage)}</b>${bullets(d.criteria)}<div class="small muted"><b>Evidence:</b> ${esc(d.evidence)}</div></div>`).join("")}</div></section>
    <section class="section" id="sec-standards">${sectionHead("Documentation standards")}<div class="table-wrap"><table class="t kv"><tbody>${g.docStandards.map((s) => `<tr><td>${esc(s.topic)}</td><td>${esc(s.standard)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-gates">${sectionHead("Country gates", `<span class="small muted">What each jurisdiction needs before a policy takes effect</span>`)}<div class="table-wrap"><table class="t"><thead><tr><th>Jurisdiction</th><th>Consultation</th><th>Filing or registration</th><th>Language</th><th>Lead time</th></tr></thead><tbody>${PRJ.countryGates.map((c) => `<tr><td><a href="#country.${attr(c.jur)}"><b>${esc(JMAP[c.jur]?.name || c.jur)}</b></a>${c.verify ? ' <span class="chip warn" title="Not confirmed against a primary source">verify</span>' : ""}</td><td class="small">${esc(c.consultation)}</td><td class="small">${esc(c.filing)}</td><td class="small">${esc(c.language)}</td><td class="small nowrap">${esc(c.leadTime)}</td></tr>`).join("")}</tbody></table></div></section>
  </div>`;
  return { html };
}

/* ----- Training and tutorials ----- */
function vidCard(v) {
  const a = PRJ.videoAssets[v.id] || {};
  const dur = v.duration ? `${Math.floor(v.duration / 60)}:${String(Math.round(v.duration % 60)).padStart(2, "0")}` : "";
  return `<div class="vid-card"><div class="vid-frame">${a.mp4 ? `<video controls preload="none" playsinline ${a.poster ? `poster="${attr(a.poster)}"` : ""} src="${attr(a.mp4)}" aria-label="${attr(v.title)}"></video>` : `<div class="vid-ph">${icon("pulse", 28)}<span class="small">Video plays on claude.ai</span></div>`}</div>
    <div class="vid-meta"><span class="eyebrow">${esc(v.episode)}${dur ? " · " + dur : ""}</span><b>${esc(v.title)}</b><span class="small muted">${esc(v.summary)}</span>
    <details class="vid-tx"><summary class="small">Transcript</summary><div class="small">${(v.captions || []).map(([t, who, text]) => `<p><b class="${who}">${who === "ava" ? "Ava" : "Leo"}:</b> ${esc(text)}</p>`).join("")}</div></details></div></div>`;
}
function bindVideos(root) { $$("video", root).forEach((vd) => vd.addEventListener("play", () => $$("video", root).forEach((o) => { if (o !== vd) o.pause(); }))); }
function viewTraining() {
  const T = PRJ.training;
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#project">Project HQ</a><span>/</span><span>Training</span></div><h1>Training, tutorials and communications</h1>
      <p class="lead">Five short tutorials hosted by Ava and Leo (with Chip, the program's mascot) show how to do the core tasks. Each has subtitles and a transcript. Below them: who needs which training, and the communications calendar for the year.</p></div>
    ${projTabs("training")}
    <section class="section">${sectionHead("Video tutorials")}<div class="vid-grid">${PRJ.videos.map(vidCard).join("")}</div></section>
    <section class="section">${sectionHead("Training modules")}<div class="table-wrap"><table class="t"><thead><tr><th>Module</th><th>Audience</th><th>Format</th><th>Length</th><th>Objectives</th></tr></thead><tbody>${T.modules.map((m) => `<tr><td><b>${esc(m.title)}</b>${m.video ? ` <span class="chip accent">${esc(m.video)}</span>` : ""}<div class="tiny muted">${esc(m.id)}</div></td><td class="small">${esc(m.audience)}</td><td class="small">${esc(m.format)}</td><td class="small nowrap">${esc(m.length)}</td><td class="small">${bullets(m.objectives)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section">${sectionHead("Who needs what")}<div class="grid-2">${T.audiences.map((a) => `<div class="panel tight stack" style="gap:4px"><b>${esc(a.audience)}</b><span class="small">${esc(a.need)}</span><span class="small muted">${esc(a.format)} · ${esc(a.when)}</span><div class="row" style="gap:4px">${a.modules.map((m) => `<span class="chip">${esc(T.modules.find((x) => x.id === m)?.title || m)}</span>`).join("")}</div></div>`).join("")}</div></section>
    <section class="section">${sectionHead("Communications calendar")}<div class="timeline">${PRJ.comms.map((c) => `<div class="tl-item ${c.type === "Announce" ? "high" : c.type === "Train" ? "medium" : ""}"><span class="when">${fmtD(c.date, true)} · ${esc(c.type)} · ${esc(c.channel)} · ${esc(c.owner)}</span><b>${esc(c.audience)}</b><span class="small">${esc(c.message)}</span></div>`).join("")}</div></section>
  </div>`;
  return { html, mount(root) { bindVideos(root); } };
}

/* ----- Toolkit ----- */
function viewToolkit() {
  const pm = DB.templates.filter((t) => t.category === "Project");
  const card = (t) => `<a class="proc-card" href="#template.${attr(t.id)}"><div class="row" style="gap:6px">${idTag(t.id)}<span class="chip">${esc(t.format)}</span></div><div class="name">${esc(t.name)}</div><div class="sum">${esc(t.purpose)}</div><div class="foot small muted">${esc(t.when || "")}</div></a>`;
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#project">Project HQ</a><span>/</span><span>Toolkit</span></div><h1>Program toolkit</h1>
      <p class="lead">Everything needed to run the program: meeting agendas, workshop and review guides, forms, launch communications and close-out, plus live exports from the plan and logs.</p></div>
    ${projTabs("toolkit")}
    <section class="section">${sectionHead("Generate from live data")}<div class="grid-3">
      <div class="panel stack" style="gap:6px"><b>Weekly status report</b><span class="small muted">RAG, progress by wave and workstream, overdue items, approvals, risks and decisions.</span><a class="btn sm" href="#status">Open</a></div>
      <div class="panel stack" style="gap:6px"><b>Integrated plan (CSV)</b><span class="small muted">All 438 items with workstream, wave, stage dates, status and approval state. Opens in Excel or Project.</span><button class="btn sm" id="tk-plan">${icon("down", 14)}Download</button></div>
      <div class="panel stack" style="gap:6px"><b>Project charter (Markdown)</b><span class="small muted">Objectives, scope, milestones, resourcing, budget and stakeholders.</span><button class="btn sm" id="tk-charter">${icon("down", 14)}Download</button></div>
      <div class="panel stack" style="gap:6px"><b>RAID log (CSV)</b><span class="small muted">Risks with ratings, owners and mitigations as they stand today.</span><button class="btn sm" id="tk-raid">${icon("down", 14)}Download</button></div>
      <div class="panel stack" style="gap:6px"><b>Tutorial transcripts</b><span class="small muted">Subtitles text for all five videos, for an LMS or accessibility review.</span><button class="btn sm" id="tk-tx">${icon("down", 14)}Download</button></div>
    </div></section>
    <section class="section">${sectionHead("Templates", `<span class="small muted">${pm.length} program templates</span>`)}<div class="proc-grid">${pm.map(card).join("")}</div></section>
  </div>`;
  return {
    html, mount(root) {
      $("#tk-plan", root).addEventListener("click", () => saveFile("project-atlas-plan.csv", planCsv(ITEMS.filter((i) => planOf(i.id)))));
      $("#tk-charter", root).addEventListener("click", () => saveFile("project-atlas-charter.md", charterMd()));
      $("#tk-raid", root).addEventListener("click", () => saveFile("project-atlas-risks.csv", raidCsv("risks")));
      $("#tk-tx", root).addEventListener("click", () => saveFile("project-atlas-tutorial-transcripts.md", PRJ.videos.map((v) => `# ${v.episode}: ${v.title}\n\n` + (v.captions || []).map(([t, w, x]) => `**${w === "ava" ? "Ava" : "Leo"}:** ${x}`).join("\n\n")).join("\n\n")));
    },
  };
}
