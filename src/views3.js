/* ===== views: countries, requirements, calendar, changes ===== */
function heatmapTable() {
  return `<div style="overflow-x:auto"><table class="heat"><thead><tr><th></th>${DB.countries.map((c) => `<th><a href="#country.${c.id}">${esc(JMAP[c.id].name)}</a></th>`).join("")}</tr></thead><tbody>
    ${RATING_DIMS.map(([k, label]) => `<tr><th class="rowh">${esc(label)}</th>${DB.countries.map((c) => { const v = c.ratings?.[k] || 0; const h = heatColor(v); return `<td style="background:${h.bg};color:${h.fg}" title="${attr(JMAP[c.id].name + " · " + label + ": " + (c.ratingNotes?.[k] || ""))}">${v}</td>`; }).join("")}</tr>`).join("")}
    <tr><th class="rowh">Overall</th>${DB.countries.map((c) => { const vs = RATING_DIMS.map(([k]) => c.ratings?.[k] || 0); const avg = vs.reduce((a, b) => a + b, 0) / vs.length; const h = heatColor(avg); return `<td style="background:${h.bg};color:${h.fg};outline:2px solid var(--line)">${avg.toFixed(1)}</td>`; }).join("")}</tr>
  </tbody></table></div>`;
}
function viewCountries() {
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><span>Jurisdictions</span></div><h1>Jurisdictions</h1>
      <p class="lead">${DB.countries.length} jurisdictions: US federal law, five US states, Canada (Toronto and Vancouver), Germany with the EU layer, Israel, India, Taiwan, China and Vietnam. Each page covers statutory rules at every lifecycle stage, required policies, termination, 2024–26 changes, a filing calendar and common mistakes.</p></div>
    <section class="section">${sectionHead("How demanding each jurisdiction is", heatLegend(1, 5, "1 lighter", "5 most demanding"))}
      <div class="panel">${heatmapTable()}<p class="small muted" style="margin-top:10px">Ratings are judgments from the research, not a legal score. Hover over a cell for the reason. Open a country for the detail.</p></div></section>
    <section class="section">${sectionHead("Jurisdictions", `<a class="small" href="#compare">Compare facts side by side</a>`)}
      <div class="grid-2">${DB.countries.map((c) => `<a class="proc-card" href="#country.${c.id}" style="min-height:0"><div class="row between"><h3>${esc(c.name)}</h3><span class="chip">${esc(c.region)}</span></div><div class="sum" style="-webkit-line-clamp:4">${esc(c.summary)}</div>
        <div class="foot small muted"><span>${c.mandatoryPolicies.length} required policies</span><span>·</span><span>${c.recentChanges.length} recent changes</span><span>·</span><span>verified ${esc(c.lastVerified)}</span></div></a>`).join("")}</div></section></div>`;
  return { html };
}
function viewCountry(id) {
  const c = CTY[id]; if (!c) return viewNotFound();
  const base = { type: "country", id: c.id, route: "country." + c.id };
  const pb = (path, label, current) => propBtn({ ...base, path, label: `${JMAP[c.id].name} · ${label}`, current });
  const secs = [["facts", "Key facts"], ["ratings", "Ratings"], ["mand", "Required policies"], ["stages", "By lifecycle stage"], ["term", "Termination"], ["changes", "Recent changes"], ["cal", "Calendar"], ["gotchas", "Gotchas"], ["sources", "Sources"]];
  const td = c.terminationDeepDive || {};
  const html = `<div class="page">
    <div class="breadcrumb"><a href="#home">Home</a><span>/</span><a href="#countries">Jurisdictions</a><span>/</span><span>${esc(JMAP[c.id].name)}</span></div>
    <div class="phead"><div class="title-row"><div class="stack" style="gap:8px"><div class="row"><span class="chip">${esc(c.region)}</span><span class="chip">Verified ${esc(c.lastVerified)}</span>${c.parent ? `<a class="chip" href="#country.${c.parent}">Also see ${esc(JMAP[c.parent].name)}</a>` : ""}</div><h1>${esc(c.name)}</h1></div>
      <div class="actions"><button class="btn" data-propose="${encodeURIComponent(JSON.stringify({ ...base, path: "summary", label: `${JMAP[c.id].name} · Summary`, current: c.summary }))}">${icon("edit", 16)}Propose change</button><button class="btn ghost" data-copylink="country.${attr(c.id)}">${icon("link", 16)}Copy link</button></div></div>
      <p class="lead">${esc(c.summary)}</p>${c.sites ? `<div class="callout info small">${esc(c.sites)}</div>` : ""}</div>
    <nav class="localnav" aria-label="On this page">${secs.map(([k, l]) => `<a href="#country.${attr(c.id)}" data-jump="sec-${k}">${l}</a>`).join("")}</nav>
    <section class="section" id="sec-facts">${sectionHead("Key facts")}
      <div class="table-wrap"><table class="t kv"><tbody>${c.keyFacts.map((f, i) => `<tr class="propable"><td>${esc(f.label)}</td><td><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span style="flex:1">${esc(f.value)}</span>${pb("keyFacts/" + i, f.label, f.value)}</div></td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-ratings">${sectionHead("Complexity ratings", `<span class="small muted">5 = most demanding for an employer</span>`)}
      <div class="panel bars">${RATING_DIMS.map(([k, l]) => { const v = c.ratings?.[k] || 0; return `<div class="bar-row"><span>${esc(l)}</span><div class="bar-track" role="img" aria-label="${v} of 5">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= v ? "on" : ""}"></i>`).join("")}</div><b class="mono">${v}</b><div class="bar-note">${esc(c.ratingNotes?.[k] || "")}</div></div>`; }).join("")}</div></section>
    <section class="section" id="sec-mand">${sectionHead("Policies and instruments the law requires")}
      <div class="table-wrap"><table class="t"><thead><tr><th>Policy / instrument</th><th>Requirement</th><th>Source</th><th>Level</th><th></th></tr></thead><tbody>${c.mandatoryPolicies.map((m, i) => `<tr class="propable"><td style="min-width:180px"><b>${esc(m.name)}</b></td><td style="min-width:300px">${esc(m.requirement)}</td><td class="small mono" style="min-width:160px">${esc(m.source)}</td><td><span class="chip ${m.level === "required" ? "bad" : "warn"}">${esc(m.level)}</span></td><td>${pb("mandatoryPolicies/" + i, m.name, m.name + ": " + m.requirement)}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-stages">${sectionHead("Requirements by lifecycle stage")}
      <div class="stack">${Object.entries(c.stages).map(([k, arr], si) => `<details class="acc" ${si === 0 ? "open" : ""}><summary><span>${esc(COUNTRY_STAGE_LABEL[k] || k)} <span class="muted mono" style="font-weight:400">${arr.length}</span></span></summary><div class="acc-body">${arr.map((r, i) => `<div class="req propable"><div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><b style="flex:1">${esc(r.req)}</b>${pb(`stages/${k}/${i}`, `${COUNTRY_STAGE_LABEL[k]}: ${r.req}`, r.req + "\n" + r.detail)}</div><span class="small">${esc(r.detail)}</span>${r.cite ? `<span class="cite">${esc(r.cite)}</span>` : ""}</div>`).join("")}</div></details>`).join("")}</div></section>
    <section class="section" id="sec-term">${sectionHead("Termination deep dive")}
      <div class="grid-2">${[["voluntary", "Resignation"], ["involuntary", "Dismissal"], ["redundancy", "Redundancy and mass layoffs"], ["finalPayTiming", "Final pay timing"], ["releaseAgreements", "Releases and settlements"], ["typicalPackage", "Market-practice severance"]].map(([k, l]) => td[k] ? `<div class="panel tight stack propable" style="gap:6px"><div class="row between"><h4>${l}</h4>${pb("terminationDeepDive/" + k, l, td[k])}</div><p class="small">${esc(td[k])}</p></div>` : "").join("")}</div>
      ${td.requiredDocuments ? `<div class="panel tight"><div class="eyebrow" style="margin-bottom:6px">Documents to issue at exit</div>${bullets(td.requiredDocuments)}</div>` : ""}</section>
    <section class="section" id="sec-changes">${sectionHead("Recent changes (2024–2026)")}
      <div class="timeline">${c.recentChanges.map((r) => `<div class="tl-item ${attr(r.impact)}"><span class="when">${esc(ym(r.date))} · ${esc(r.impact)} impact</span><b>${esc(r.title)}</b><span class="small">${esc(r.detail)}</span></div>`).join("")}</div>
      ${(c.watchlist || []).length ? `<div class="panel tight stack" style="gap:8px"><div class="eyebrow">Watchlist</div>${c.watchlist.map((w) => `<div><b>${esc(w.title)}</b> <span class="chip amber">${esc(w.expected)}</span><div class="small muted">${esc(w.detail)}</div></div>`).join("")}</div>` : ""}</section>
    <section class="section" id="sec-cal">${sectionHead("Compliance calendar", `<a class="small" href="#calendar">All jurisdictions</a>`)}
      <div class="table-wrap"><table class="t"><tbody>${[...c.calendar].sort((a, b) => a.month - b.month).map((e) => `<tr><td class="mono nowrap">${MONTHS[e.month - 1].slice(0, 3)}</td><td><b>${esc(e.title)}</b><div class="small muted">${esc(e.detail)}</div></td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-gotchas">${sectionHead("Common mistakes by US-headquartered employers")}<div class="consid">${c.gotchas.map((g, i) => `<div class="propable"><span style="flex:1">${esc(g)}</span>${pb("gotchas/" + i, "Gotcha " + (i + 1), g)}</div>`).join("")}</div>
      ${(c.semiconductorNotes || []).length ? `<div class="panel tight"><div class="eyebrow" style="margin-bottom:6px">Semiconductor-specific notes</div>${bullets(c.semiconductorNotes)}</div>` : ""}</section>
    <section class="section" id="sec-sources">${sectionHead("Sources")}<ul class="bullets small">${c.sources.map((s) => `<li><a href="${attr(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join("")}</ul></section>
  </div>`;
  return { html };
}
function viewCompare(arg) {
  const labels = DB.countries[0].keyFacts.map((f) => f.label);
  let cur = labels.includes(arg) ? arg : labels[3];
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><a href="#countries">Jurisdictions</a><span>/</span><span>Compare</span></div><h1>Compare jurisdictions</h1>
      <p class="lead">Pick a topic to see the rule in every jurisdiction side by side.</p></div>
    <div class="row" id="cmp-pick">${labels.map((l) => `<button class="chip" data-fact="${attr(l)}" aria-pressed="${l === cur}">${esc(l)}</button>`).join("")}</div>
    <div class="grid-3" id="cmp-out"></div>
    <section class="section">${sectionHead("Everything in one table")}
      <div class="table-wrap" style="max-height:70vh"><table class="t"><thead><tr><th>Topic</th>${DB.countries.map((c) => `<th>${esc(JMAP[c.id].name)}</th>`).join("")}</tr></thead><tbody>
      ${labels.map((l) => `<tr><td><b>${esc(l)}</b></td>${DB.countries.map((c) => `<td class="small" style="min-width:220px">${esc(c.keyFacts.find((f) => f.label === l)?.value || "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section></div>`;
  return {
    html, mount(root) {
      const draw = () => ($("#cmp-out").innerHTML = DB.countries.map((c) => `<div class="panel tight stack" style="gap:6px"><div class="row between"><a href="#country.${c.id}"><b>${esc(JMAP[c.id].name)}</b></a></div><p class="small">${esc(c.keyFacts.find((f) => f.label === cur)?.value || "—")}</p></div>`).join(""));
      draw();
      $("#cmp-pick", root).addEventListener("click", (e) => { const b = e.target.closest("[data-fact]"); if (!b) return; cur = b.dataset.fact; $$("[data-fact]", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
    },
  };
}
function viewGlobal(arg) {
  const G = DB.global; const groups = [["publicCompany", "Public company (SEC, Nasdaq, SOX)"], ["semiconductor", "Semiconductor & national security"], ["globalFrameworks", "Global frameworks & customer codes"]];
  let tab = groups.some((g) => g[0] === arg) ? arg : "publicCompany";
  const itemHtml = (it, grp) => `<div class="panel stack propable" style="gap:8px" id="g-${attr(it.id)}"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div class="stack" style="gap:4px;flex:1;min-width:0"><div class="row"><span class="chip">${esc(it.area)}</span><span class="chip mono">${esc(it.cadence)}</span></div><h3>${esc(it.title)}</h3><div class="mono small muted">${esc(it.rule)}</div></div>${propBtn({ type: "global", id: "G-" + it.id, path: "", label: `${it.title}`, current: it.requirement + "\n\nHR actions:\n- " + (it.hrActions || []).join("\n- "), route: "global." + grp })}</div>
    <p>${esc(it.requirement)}</p><div><div class="eyebrow" style="margin-bottom:4px">What HR does</div>${bullets(it.hrActions)}</div>
    <div class="grid-2 small"><div><b>Owner:</b> ${esc(it.owner)}</div><div><b>Risk:</b> ${esc(it.risk)}</div></div>
    ${it.source ? `<div class="small"><a href="${attr(it.source.url)}" target="_blank" rel="noopener">${esc(it.source.title)}</a></div>` : ""}</div>`;
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><span>Public company and semiconductor</span></div><h1>Public-company and semiconductor requirements</h1>
      <p class="lead">What being Nasdaq-listed and in the chip industry adds to HR's job: disclosure, equity and insider rules, SOX controls, export controls on who can access technology, national-security data rules and customer labor codes.</p></div>
    <div class="tabs" role="tablist">${groups.map(([k, l]) => `<button role="tab" data-gtab="${k}" aria-selected="${k === tab}">${esc(l)} <span class="mono muted">${G[k].length}</span></button>`).join("")}<button role="tab" data-gtab="changes" aria-selected="${tab === "changes"}">Recent changes</button></div>
    <div id="g-body" class="stack"></div></div>`;
  return {
    html, mount(root) {
      const draw = () => {
        if (tab === "changes") $("#g-body").innerHTML = `<div class="timeline">${G.recentChanges.map((r) => `<div class="tl-item ${attr(r.impact)}"><span class="when">${esc(ym(r.date))} · ${esc(r.area)} · ${esc(r.impact)} impact</span><b>${esc(r.title)}</b><span class="small">${esc(r.detail)}</span></div>`).join("")}</div><section class="section">${sectionHead("Watchlist")}<div class="stack">${G.watchlist.map((w) => `<div class="panel tight"><b>${esc(w.title)}</b> <span class="chip amber">${esc(w.expected)}</span><div class="small muted">${esc(w.detail)}</div></div>`).join("")}</div></section>`;
        else $("#g-body").innerHTML = G[tab].map((it) => itemHtml(it, tab)).join("");
        refreshPropCounts();
      };
      draw();
      root.querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-gtab]"); if (!b) return; tab = b.dataset.gtab; $$("[data-gtab]", root).forEach((x) => x.setAttribute("aria-selected", x === b)); draw(); });
    },
  };
}
function allCalendar() {
  const out = [];
  DB.countries.forEach((c) => c.calendar.forEach((e) => out.push({ ...e, j: c.id, jn: JMAP[c.id].name })));
  DB.global.calendar.forEach((e) => out.push({ ...e, j: "public", jn: "Public co." }));
  return out;
}
function viewCalendar() {
  const all = allCalendar(); const js = [...JUR.map((j) => [j.id, j.name]), ["public", "Public co."]];
  const nowM = new Date().getMonth() + 1;
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><span>Compliance calendar</span></div><h1>Compliance calendar</h1>
      <p class="lead">Filings, notices, renewals and review cycles across all ${DB.countries.length} jurisdictions and the public-company calendar. Assumes a calendar fiscal year. Items marked "every month" are recurring deposits and returns.</p></div>
    <div class="row" id="cal-f"><span class="small muted">Show:</span>${js.map(([k, l]) => `<button class="chip" data-cj="${k}" aria-pressed="${!UI.calJur.size || UI.calJur.has(k)}">${esc(l)}</button>`).join("")}</div>
    <div class="cal-grid" id="cal"></div></div>`;
  return {
    html, mount(root) {
      const draw = () => {
        const on = (j) => !UI.calJur.size || UI.calJur.has(j);
        $("#cal").innerHTML = MONTHS.map((m, i) => {
          const es = all.filter((e) => e.month === i + 1 && on(e.j));
          return `<div class="month ${i + 1 === nowM ? "now" : ""}"><h3>${m}<span class="mono small muted">${es.length}</span></h3><ul>${es.map((e) => `<li><span class="j">${esc(e.jn)}</span><div><b style="font-weight:500">${esc(e.title)}</b></div><div class="small muted">${esc(e.detail)}</div></li>`).join("") || '<li class="muted small">Nothing scheduled</li>'}</ul></div>`;
        }).join("");
      };
      draw();
      $("#cal-f", root).addEventListener("click", (e) => {
        const b = e.target.closest("[data-cj]"); if (!b) return; const k = b.dataset.cj;
        if (!UI.calJur.size) { UI.calJur = new Set([k]); } else if (UI.calJur.has(k)) { UI.calJur.delete(k); } else UI.calJur.add(k);
        if (UI.calJur.size === js.length) UI.calJur.clear();
        $$("[data-cj]", root).forEach((x) => x.setAttribute("aria-pressed", !UI.calJur.size || UI.calJur.has(x.dataset.cj))); draw();
      });
    },
  };
}
/* ===== library change log ===== */
const CHG_TYPES = { added: ["Added", "ok"], changed: ["Changed", "accent"], removed: ["Removed", "bad"], fixed: ["Fixed", "amber"], checked: ["Checked", ""] };
const CHG_AREAS = { process: "Processes", policy: "Policies", template: "Templates", jurisdiction: "Jurisdictions", site: "Site and library-wide" };
function chgArea(ref) {
  if (!ref) return "site";
  if (P[ref]) return "process"; if (POL[ref]) return "policy"; if (TPL[ref]) return "template";
  if (/^(country|global)\./.test(ref)) return "jurisdiction";
  return "site";
}
function chgRefLink(ref) {
  if (!ref) return "";
  if (P[ref] || POL[ref] || TPL[ref] || REG[ref]) return linkTo(ref);
  const [v, a] = ref.split(".");
  if (v === "country" && JMAP[a]) return `<a href="#${attr(ref)}">${esc(JMAP[a].name)}</a>`;
  if (v === "global") return `<a href="#${attr(ref)}">${esc({ publicCompany: "Public-company rules", semiconductor: "Semiconductor rules", globalFrameworks: "Global frameworks" }[a] || "Public co. & semi")}</a>`;
  return esc(ref);
}
const chgChip = (type) => { const [l, c] = CHG_TYPES[type] || [type, ""]; return `<span class="chip ${c} chg-type">${esc(l)}</span>`; };
const relDate = (r) => fmtDate(r.date + "T12:00:00");
/* change text with process, policy and template ids turned into links */
function chgText(it) {
  let t = it.text || ""; const T = TPL[it.ref]; const pre = T ? `New template: ${T.name}.` : "";
  if (T && it.type === "added" && t.startsWith(pre)) t = "New template." + t.slice(pre.length);
  return esc(t).replace(/\b(POL-\d{2}|T-[A-Z0-9]+(?:-[A-Z0-9]+)*|[A-Z]{2}-\d{2})\b/g, (m) => P[m] ? `<a href="#process.${m}">${m}</a>` : POL[m] ? `<a href="#policy.${m}">${m}</a>` : TPL[m] ? `<a href="#template.${m}">${m}</a>` : m);
}
/* Change history for one process, policy or template: release entries that name it, template additions that link to it,
   library-wide notes that apply to it, and (live) proposals about it that were accepted or implemented. */
function historyFor(id, kind) {
  const out = []; let created = null;
  RELEASES.forEach((r) => r.items.forEach((it) => { if (it.ref === id && it.type === "added") created = r.version; }));
  RELEASES.forEach((r) => r.items.forEach((it) => {
    if (it.ref === id) { out.push({ r, it }); return; }
    const t = TPL[it.ref];
    if (it.type === "added" && t && t.id !== id && ((kind === "process" && (t.processes || []).includes(id)) || (kind === "policy" && (t.policies || []).includes(id))))
      out.push({ r, it: { type: "changed", ref: t.id, text: "New template linked here:" } });
    else if ((it.scope || []).includes(kind) && (!created || created < r.version)) out.push({ r, it: { ...it, ref: null } });
  }));
  if (!created) { const first = RELEASES[RELEASES.length - 1]; if (first) out.push({ r: first, it: { type: "added", text: "Included in the first release of the library." } }); }
  return out;
}
function historySection(id, kind) {
  const rows = historyFor(id, kind);
  return `<section class="section" id="sec-history">${sectionHead("Change history", `<a class="small" href="#changes">All library changes</a>`)}
    <div class="hist">${rows.map(({ r, it }) => `<div class="hist-row"><span class="hist-when"><span class="mono">v${r.version}</span> ${esc(relDate(r))}</span>${chgChip(it.type)}<span class="hist-txt">${chgText(it)}${it.ref && it.ref !== id ? ` ${chgRefLink(it.ref)}` : ""}${it.proposal ? ` <a class="small" href="#proposal.${attr(it.proposal)}">From a proposal</a>` : ""}</span></div>`).join("")}
      <div id="hist-live" data-hist="${attr(id)}"></div></div></section>`;
}
/* live rows: accepted or implemented proposals about this item (not already in the release notes) */
function drawHistoryLive(root) {
  const box = root.querySelector("#hist-live"); if (!box) return; const id = box.dataset.hist;
  const logged = new Set(RELEASES.flatMap((r) => r.items.map((it) => it.proposal).filter(Boolean)));
  const l = proposalsList().filter((p) => p.targetId === id && (p.status === "accepted" || p.status === "implemented") && !logged.has(p.id))
    .sort((a, b) => ((C.reviews.get(b.id)?.at || "").localeCompare(C.reviews.get(a.id)?.at || "")));
  box.innerHTML = l.map((p) => { const rv = C.reviews.get(p.id) || {}; return `<div class="hist-row"><span class="hist-when">${esc(fmtDate(rv.at || p.createdAt))}</span><span class="chip status-${attr(p.status)} chg-type">${esc(p.status === "implemented" ? "Implemented" : "Accepted")}</span><span class="hist-txt"><a href="#proposal.${attr(p.id)}">${esc(p.targetLabel)}</a>: ${esc((p.proposed || p.rationale || "").slice(0, 220))}${p.status === "accepted" ? ' <span class="small muted">Waiting to be applied to the library.</span>' : ""}</span></div>`; }).join("");
  fillPeople(box);
}
function changelogMd() {
  return `# HR library change log\n\n` + RELEASES.map((r) => `## v${r.version} — ${r.title} (${r.date})\n\n${r.summary || ""}\n\n` + r.items.map((it) => `- **${CHG_TYPES[it.type]?.[0] || it.type}**${it.ref ? ` [${it.ref}]` : ""}: ${it.text}${it.proposal ? ` (proposal ${it.proposal})` : ""}`).join("\n")).join("\n\n") + "\n";
}

function viewChanges(arg) {
  const tab = arg === "legal" ? "legal" : "library";
  const all = allChanges();
  const nItems = RELEASES.reduce((n, r) => n + r.items.length, 0);
  const tabs = `<div class="tabs" role="tablist" aria-label="Change type"><a role="tab" href="#changes" aria-selected="${tab === "library"}">Library changes <span class="mono muted">${nItems}</span></a><a role="tab" href="#changes.legal" aria-selected="${tab === "legal"}">Legal changes <span class="mono muted">${all.length}</span></a></div>`;
  const head = `<div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><span>What's changed</span></div><h1>What's changed</h1>
      <p class="lead">${tab === "library" ? "Every change made to this library: new and revised processes, policies and templates, jurisdictions added, fixes, and proposals the team accepted or implemented." : `${all.length} legal changes from 2024 to 2026 found in the research, newest first. High-impact items usually need a policy or process update, so propose one from the related page.`}</p></div>`;
  if (tab === "legal") {
    const js = [...new Set(all.map((c) => c.jurName))];
    const html = `<div class="page">${head}${tabs}
    <div class="filters"><select class="select" id="chg-j" aria-label="Jurisdiction"><option value="">All jurisdictions</option>${js.map((j) => `<option ${UI.chgJur === j ? "selected" : ""}>${esc(j)}</option>`).join("")}</select>
      <select class="select" id="chg-i" aria-label="Impact"><option value="">Any impact</option>${["high", "medium", "low"].map((k) => `<option value="${k}" ${UI.chgImpact === k ? "selected" : ""}>${k[0].toUpperCase() + k.slice(1)} impact</option>`).join("")}</select><span class="small muted" id="chg-n"></span></div>
    <div class="timeline" id="chg"></div></div>`;
    return {
      html, mount(root) {
        const draw = () => {
          const rows = all.filter((c) => (!UI.chgJur || c.jurName === UI.chgJur) && (!UI.chgImpact || c.impact === UI.chgImpact));
          $("#chg-n").textContent = `${rows.length} shown`;
          $("#chg").innerHTML = rows.map((r) => `<div class="tl-item ${attr(r.impact)}"><span class="when">${esc(ym(r.date))} · ${r.jur === "global" ? `<a href="#global">${esc(r.jurName)}</a>` : `<a href="#country.${r.jur}">${esc(r.jurName)}</a>`} · ${esc(r.impact)} impact</span><b>${esc(r.title)}</b><span class="small">${esc(r.detail)}</span></div>`).join("");
        };
        draw();
        $("#chg-j", root).addEventListener("change", (e) => { UI.chgJur = e.target.value; draw(); });
        $("#chg-i", root).addEventListener("change", (e) => { UI.chgImpact = e.target.value; draw(); });
      },
    };
  }
  const F = UI.libChg;
  const count = (fn) => RELEASES.reduce((n, r) => n + r.items.filter(fn).length, 0);
  const html = `<div class="page">${head}${tabs}
    <div class="chg-stats">
      <div><b>${RELEASES.length}</b><span>releases</span></div>
      <div><b>${count((it) => it.type === "added")}</b><span>additions</span></div>
      <div><b>${count((it) => it.type === "changed" || it.type === "removed")}</b><span>revisions</span></div>
      <div><b>${count((it) => it.type === "fixed")}</b><span>fixes</span></div>
      <div><b id="chg-props">0</b><span>proposals applied</span></div>
      <div><b>${esc(relDate(RELEASES[0] || { date: RAW.meta.built }))}</b><span>last updated</span></div>
    </div>
    <section class="section">${sectionHead("From proposals", `<a class="small" href="#proposals">All proposals</a>`)}<p class="small muted">Accepted proposals are agreed but not yet applied. Implemented ones are in the library now.</p><div class="stack" id="chg-live"></div></section>
    <section class="section">${sectionHead("Release notes", `<button class="btn sm" id="chg-md">${icon("down", 15)}Export Markdown</button>`)}
      <div class="filters">
        <div class="seg" role="group" aria-label="Change type" id="lc-type">${[["", "All"], ...Object.entries(CHG_TYPES).map(([k, v]) => [k, v[0]])].map(([k, l]) => `<button data-lct="${k}" aria-pressed="${F.type === k}">${l}</button>`).join("")}</div>
        <select class="select" id="lc-area" aria-label="Area"><option value="">All areas</option>${Object.entries(CHG_AREAS).map(([k, l]) => `<option value="${k}" ${F.area === k ? "selected" : ""}>${l}</option>`).join("")}</select>
        <input class="input" id="lc-q" type="search" placeholder="Search changes" value="${attr(F.q)}" aria-label="Search changes"><span class="small muted" id="lc-n"></span></div>
      <div class="rels" id="lc-list"></div></section></div>`;
  return {
    html, mount(root) {
      const drawList = () => {
        const q = F.q.toLowerCase().trim(); let shown = 0;
        const html = RELEASES.map((r) => {
          const items = r.items.filter((it) => (!F.type || it.type === F.type) && (!F.area || chgArea(it.ref) === F.area) && (!q || (it.text + " " + (it.ref || "") + " " + ((P[it.ref] || POL[it.ref] || TPL[it.ref] || {}).name || "")).toLowerCase().includes(q)));
          if (!items.length) return ""; shown += items.length;
          return `<article class="rel"><header class="rel-head"><div class="rel-meta"><span class="mono">v${r.version}</span><span>${esc(relDate(r))}</span></div><div class="stack" style="gap:4px"><h3>${esc(r.title)}</h3>${r.summary ? `<p class="small muted">${esc(r.summary)}</p>` : ""}</div></header>
            <div class="rel-items">${items.map((it) => `<div class="rel-item">${chgChip(it.type)}<div class="grow">${it.ref ? `<div class="rel-ref">${chgRefLink(it.ref)}</div>` : ""}<div>${chgText(it)}${it.proposal ? ` <a class="small" href="#proposal.${attr(it.proposal)}">View the proposal</a>` : ""}</div></div></div>`).join("")}</div></article>`;
        }).join("");
        $("#lc-list", root).innerHTML = html || `<div class="empty">No changes match these filters.</div>`;
        $("#lc-n", root).textContent = `${shown} of ${RELEASES.reduce((n, r) => n + r.items.length, 0)} shown`;
      };
      const drawLive = () => {
        const l = proposalsList().filter((p) => p.status === "accepted" || p.status === "implemented").sort((a, b) => ((C.reviews.get(b.id)?.at || "").localeCompare(C.reviews.get(a.id)?.at || "")));
        $("#chg-props", root).textContent = l.filter((p) => p.status === "implemented").length;
        $("#chg-live", root).innerHTML = l.length ? l.map((p) => { const rv = C.reviews.get(p.id) || {}; const rel = RELEASES.find((r) => r.items.some((it) => it.proposal === p.id));
          return `<div class="rel-item live"><span class="chip status-${attr(p.status)} chg-type">${esc(p.status === "implemented" ? "Implemented" : "Accepted")}</span><div class="grow"><div class="rel-ref">${targetLink(p)}</div><div>${esc((p.proposed || p.rationale || "").slice(0, 260))}</div>
            <div class="small muted row" style="gap:6px;margin-top:4px">${rv.reviewerId ? `<span>${p.status === "implemented" ? "Marked implemented" : "Accepted"} by ${personHtml(rv.reviewerId)}</span>` : ""}<span>${esc(fmtDate(rv.at || p.createdAt))}</span>${rel ? `<span>· in v${rel.version}</span>` : ""}<a href="#proposal.${attr(p.id)}">Open</a></div></div></div>`; }).join("")
          : `<div class="empty">${C.db ? "No proposals have been accepted yet. Accepted and implemented proposals appear here automatically." : "Accepted and implemented proposals appear here when this page is opened on claude.ai."}</div>`;
        fillPeople($("#chg-live", root));
      };
      drawList(); drawLive(); onLive(drawLive);
      $("#lc-type", root).addEventListener("click", (e) => { const b = e.target.closest("[data-lct]"); if (!b) return; F.type = b.dataset.lct; $$("[data-lct]", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); drawList(); });
      $("#lc-area", root).addEventListener("change", (e) => { F.area = e.target.value; drawList(); });
      $("#lc-q", root).addEventListener("input", (e) => { F.q = e.target.value; drawList(); });
      $("#chg-md", root).addEventListener("click", () => saveFile("hr-library-change-log.md", changelogMd()));
    },
  };
}
function viewItem(id) {
  const r = REG[id]; if (!r) return viewNotFound();
  const html = `<div class="page">
    <div class="breadcrumb"><a href="#checklist">Checklist</a><span>/</span><span class="mono">${esc(r.id)}</span></div>
    <div class="phead"><div class="title-row"><div class="stack" style="gap:8px"><div class="row">${idTag(r.id)}<span class="chip">${esc(r.type)}</span>${tierTag(r.tier)}</div><h1>${esc(r.name)}</h1></div>
      <div class="actions">${statusSelect(r.id)}<button class="btn" data-propose="${encodeURIComponent(JSON.stringify({ type: "register", id: r.id, path: "requirement", label: `${r.id} ${r.name}`, current: r.requirement, route: "item." + r.id }))}">${icon("edit", 16)}Propose change</button><button class="btn ghost" data-copylink="item.${attr(r.id)}">${icon("link", 16)}Copy link</button></div></div>
      <p class="lead">${esc(r.requirement)}</p><div><button class="pcount" data-pkey="${attr(propKey(r.id, "requirement"))}" hidden></button></div>
      <div class="meta-grid"><div><span class="eyebrow">Scope</span><span class="v">${esc(r.scope)}</span></div><div><span class="eyebrow">Jurisdictions</span><span class="v row" style="gap:4px">${jurChips(r.countries)}</span></div><div><span class="eyebrow">Owner</span><span class="v">${esc(r.owner)}</span></div><div><span class="eyebrow">Cadence</span><span class="v">${esc(r.cadence)}</span></div><div><span class="eyebrow">Legal basis</span><span class="v mono small">${esc(r.cite)}</span></div><div><span class="eyebrow">Domain</span><span class="v">${esc(STAGE[r.domain]?.label || r.domain)}</span></div></div></div>
    <section class="section">${sectionHead("Related processes")}<div class="stack">${(r.processes || []).map((x) => `<div>${linkTo(x)}</div>`).join("") || '<span class="muted">None</span>'}</div></section></div>`;
  return { html, mount(root) { root.addEventListener("change", (e) => { const s = e.target.closest("[data-status-for]"); if (s) { s.dataset.s = s.value; setItemStatus(s.dataset.statusFor, { status: s.value }); } }); } };
}

/* ===== proposals ===== */
function targetLink(p) { return p.route ? `<a href="#${attr(p.route)}">${esc(p.targetLabel)}</a>` : esc(p.targetLabel); }
function propCard(p) {
  const n = commentsFor(p.id).length;
  return `<div class="prop-card"><div class="row between"><div class="row" style="gap:6px"><span class="chip status-${p.status}">${esc(p.status)}</span><span class="chip">${esc(KINDS[p.kind] || p.kind)}</span>${(p.jurisdictions || []).map((j) => `<span class="chip">${esc(j === "global" ? "Global" : JMAP[j]?.short || j)}</span>`).join("")}</div>
    <span class="small muted">${esc(fmtRel(p.createdAt))}</span></div>
    <div class="tgt">${targetLink(p)}</div>
    <a class="excerpt" href="#proposal.${attr(p.id)}" style="color:inherit">${esc(p.proposed || p.rationale || "(no text)")}</a>
    <div class="row between">${personHtml(p.authorId)}<div class="row"><button class="vote" data-vote="${attr(p.id)}" aria-pressed="${myVote(p.id)}" title="Support this proposal" ${canPropose() && C.me?.id ? "" : "disabled"}>${icon("up", 14)}${p.votes}</button><a class="btn sm ghost" href="#proposal.${attr(p.id)}">${icon("comment", 14)}${n}</a></div></div></div>`;
}
function viewProposals() {
  const F = UI.propFilter;
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><span>Proposed changes</span></div><h1>Proposed changes</h1>
      <p class="lead">Anyone with access can propose a change to any step, clause, question or country rule using the pencil icon. Others vote and discuss, and editors accept, decline or mark it implemented.</p>
      ${C.db ? (C.readOnly ? `<div class="callout">You have view-only access. You can read, vote on and export proposals, but submitting needs “Can interact” access from the page owner.</div>` : "") : `<div class="callout">Shared proposals load when this page is opened on claude.ai. Here you can still draft a proposal and copy it as text.</div>`}</div>
    <div class="filters">
      <div class="seg" role="group" aria-label="Status" id="pf-status">${["open", "accepted", "implemented", "declined", "all"].map((s) => `<button data-ps="${s}" aria-pressed="${F.status === s}">${s[0].toUpperCase() + s.slice(1)} <span class="mono" data-psn="${s}"></span></button>`).join("")}</div>
      <select class="select" id="pf-jur" aria-label="Jurisdiction"><option value="">All jurisdictions</option><option value="global" ${F.jur === "global" ? "selected" : ""}>Global</option>${JUR.map((j) => `<option value="${j.id}" ${F.jur === j.id ? "selected" : ""}>${esc(j.name)}</option>`).join("")}</select>
      <select class="select" id="pf-sort" aria-label="Sort"><option value="new" ${F.sort === "new" ? "selected" : ""}>Newest</option><option value="votes" ${F.sort === "votes" ? "selected" : ""}>Most support</option><option value="target" ${F.sort === "target" ? "selected" : ""}>By target</option></select>
      <input class="input" id="pf-q" type="search" placeholder="Search proposals" value="${attr(F.q)}" aria-label="Search proposals">
      ${F.key ? `<button class="chip accent" id="pf-key">Only: ${esc(F.key.split("|")[0])} ${icon("x", 12)}</button>` : ""}
      <span style="flex:1"></span><button class="btn sm" id="pf-md">${icon("down", 15)}Export Markdown</button><button class="btn sm" id="pf-csv">${icon("down", 15)}CSV</button>
      <button class="btn sm primary" data-propose="${encodeURIComponent(JSON.stringify({ type: "general", id: "GENERAL", path: "", label: "General suggestion for the library", current: "", route: "proposals" }))}">${icon("edit", 15)}New suggestion</button></div>
    <div class="stack" id="plist2"></div></div>`;
  return {
    html, mount(root) {
      const filtered = () => {
        const q = F.q.toLowerCase();
        let l = proposalsList().filter((p) => (F.status === "all" || p.status === F.status) && (!F.jur || (p.jurisdictions || []).includes(F.jur)) && (!F.key || propKey(p.targetId, p.path) === F.key || p.targetId === F.key) && (!q || (p.targetLabel + " " + p.proposed + " " + p.rationale).toLowerCase().includes(q)));
        l.sort(F.sort === "votes" ? (a, b) => b.votes - a.votes : F.sort === "target" ? (a, b) => a.targetLabel.localeCompare(b.targetLabel) : (a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        return l;
      };
      const draw = () => {
        const all = proposalsList();
        ["open", "accepted", "implemented", "declined"].forEach((s) => { const el = root.querySelector(`[data-psn="${s}"]`); if (el) el.textContent = all.filter((p) => p.status === s).length || ""; });
        const l = filtered();
        $("#plist2").innerHTML = l.length ? l.map(propCard).join("") : `<div class="empty">${all.length ? "No proposals match these filters." : "No proposals yet. Open any process, policy, template or country page and use the pencil icon beside the part you want to change."}</div>`;
        fillPeople($("#plist2"));
      };
      draw();
      $("#pf-status", root).addEventListener("click", (e) => { const b = e.target.closest("[data-ps]"); if (!b) return; F.status = b.dataset.ps; $$("[data-ps]", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
      $("#pf-jur", root).addEventListener("change", (e) => { F.jur = e.target.value; draw(); });
      $("#pf-sort", root).addEventListener("change", (e) => { F.sort = e.target.value; draw(); });
      $("#pf-q", root).addEventListener("input", (e) => { F.q = e.target.value; draw(); });
      const k = $("#pf-key", root); if (k) k.addEventListener("click", () => { F.key = ""; render(); });
      $("#pf-md", root).addEventListener("click", () => saveFile("hr-library-proposals.md", proposalsMd(filtered())));
      $("#pf-csv", root).addEventListener("click", () => saveFile("hr-library-proposals.csv", proposalsCsv(filtered())));
      onLive(draw);
    },
  };
}
function viewProposal(id) {
  const html = `<div class="page"><div class="breadcrumb"><a href="#proposals">Proposed changes</a><span>/</span><span class="mono">${esc(id)}</span></div><div id="pd"></div></div>`;
  return {
    html, mount(root) {
      const draw = () => {
        const raw = C.proposals.get(id); const box = $("#pd", root);
        if (!raw) { box.innerHTML = `<div class="empty">${C.ready ? "This proposal isn't available. It may have been removed, or you may not have access." : "Loading…"}</div>`; return; }
        if (box.contains(document.activeElement) && document.activeElement.tagName === "TEXTAREA") return;
        const p = { id, ...raw, status: propStatus(id), votes: voteCount(id) }; const rv = C.reviews.get(id); const d = wordDiff(p.current, p.proposed);
        const mine = C.me?.id && p.authorId === C.me.id;
        box.innerHTML = `<div class="stack lg">
          <div class="phead"><div class="row"><span class="chip status-${p.status}">${esc(p.status)}</span><span class="chip">${esc(KINDS[p.kind] || p.kind)}</span>${(p.jurisdictions || []).map((j) => `<span class="chip">${esc(j === "global" ? "Global" : JMAP[j]?.name || j)}</span>`).join("")}</div>
            <h1 style="font-size:26px">${targetLink(p)}</h1>
            <div class="row">${personHtml(p.authorId)}<span class="small muted">proposed ${esc(fmtRel(p.createdAt))}</span><span style="flex:1"></span><button class="vote" data-vote="${attr(id)}" aria-pressed="${myVote(id)}" ${canPropose() && C.me?.id ? "" : "disabled"}>${icon("up", 14)}${p.votes} support</button><button class="btn sm ghost" data-copylink="proposal.${attr(id)}">${icon("link", 15)}Copy link</button>${mine && p.status === "open" ? `<button class="btn sm ghost danger" id="pd-withdraw">Withdraw</button>` : ""}</div></div>
          ${p.kind === "edit" && p.current ? `<div class="stack" style="gap:6px"><div class="row between"><h3>Tracked changes</h3><span class="small muted"><del style="background:var(--bad-soft);color:var(--bad)">removed</del> · <ins style="background:var(--ok-soft);color:var(--ok);text-decoration:none">added</ins></span></div><div class="diff"><div><div class="eyebrow" style="margin-bottom:8px">Current</div>${d.left}</div><div><div class="eyebrow" style="margin-bottom:8px">Proposed</div>${d.right}</div></div></div>`
            : `<div class="grid-2">${p.current ? `<div class="panel stack" style="gap:6px"><div class="eyebrow">Current</div><div style="white-space:pre-wrap">${esc(p.current)}</div></div>` : ""}<div class="panel stack" style="gap:6px"><div class="eyebrow">${p.kind === "remove" ? "Remove" : p.kind === "question" ? "Question" : "Proposed"}</div><div style="white-space:pre-wrap">${esc(p.proposed || "—")}</div></div></div>`}
          ${p.rationale ? `<div class="panel stack" style="gap:6px"><div class="eyebrow">Why</div><div style="white-space:pre-wrap">${esc(p.rationale)}</div></div>` : ""}
          ${(() => { const rel = RELEASES.find((r) => r.items.some((it) => it.proposal === id)); const it = rel && rel.items.find((x) => x.proposal === id); return rel ? `<div class="callout info"><b>Applied in library release v${rel.version}</b> · ${esc(relDate(rel))}<div style="margin-top:4px">${esc(it.text)}</div><div style="margin-top:4px"><a href="#changes">See the change log</a></div></div>` : ""; })()}
          ${rv ? `<div class="callout ${rv.status === "declined" ? "" : "info"}"><b>${esc(rv.status[0].toUpperCase() + rv.status.slice(1))}</b> ${rv.reviewerId ? "by " + personHtml(rv.reviewerId) : ""} · ${esc(fmtRel(rv.at))}${rv.note ? `<div style="margin-top:4px;white-space:pre-wrap">${esc(rv.note)}</div>` : ""}</div>` : ""}
          ${C.canEdit && C.db ? `<div class="panel stack"><h3>Review</h3><textarea class="textarea" id="rv-note" placeholder="Decision note (optional): what changes, who updates the document, effective date" style="min-height:60px">${esc(rv?.note || "")}</textarea>
            <div class="row"><button class="btn primary" data-rv="accepted">Accept</button><button class="btn" data-rv="implemented">Mark implemented</button><button class="btn danger" data-rv="declined">Decline</button>${p.status !== "open" ? `<button class="btn ghost" data-rv="open">Reopen</button>` : ""}<span style="flex:1"></span><button class="btn" id="pd-claude" hidden>${icon("spark", 15)}Send to Claude to apply</button></div>
            <p class="help">“Send to Claude” posts this proposal as a comment for a Claude session watching this page. Claude can then update the library and republish it.</p></div>` : ""}
          <section class="section">${sectionHead("Discussion")}<div class="thread">${commentsFor(id).map((c) => `<div class="msg"><div style="flex:1"><div class="meta">${personHtml(c.authorId)} · ${esc(fmtRel(c.at))}</div><div class="bubble">${esc(c.text)}</div></div></div>`).join("") || '<p class="muted small">No comments yet.</p>'}</div>
            ${canPropose() ? `<div class="stack" style="gap:8px"><textarea class="textarea" id="pd-c" placeholder="Add to the discussion" style="min-height:64px"></textarea><div><button class="btn" id="pd-send">Comment</button></div></div>` : ""}</section></div>`;
        fillPeople(box);
        const cb = $("#pd-claude", box);
        if (cb && C.comments?.canSendToClaude) C.comments.canSendToClaude().then((s) => { if (s === "available") cb.hidden = false; }).catch(() => { });
      };
      draw();
      root.addEventListener("click", async (e) => {
        const r = e.target.closest("[data-rv]"); if (r) { await setReview(id, r.dataset.rv, $("#rv-note")?.value || ""); return; }
        if (e.target.closest("#pd-send")) { const t = $("#pd-c").value.trim(); if (!t) return; await addComment(id, t.slice(0, 4000)); $("#pd-c").value = ""; return; }
        if (e.target.closest("#pd-withdraw")) { try { await C.db.doc("proposals/" + id).update({ withdrawn: true }); toast("Proposal withdrawn"); } catch (err) { writeErr(err); } return; }
        if (e.target.closest("#pd-claude")) {
          const p = C.proposals.get(id); const btn = e.target.closest("#pd-claude");
          const text = `Please apply this ${propStatus(id)} proposal to the HR library and republish.\nProposal: ${id}\nTarget: ${p.targetLabel} (${p.targetType} ${p.targetId}${p.path ? " / " + p.path : ""})\nChange: ${KINDS[p.kind]}\n\nPROPOSED:\n${p.proposed}\n\nWHY:\n${p.rationale || "—"}\n\nREVIEW NOTE:\n${C.reviews.get(id)?.note || "—"}`.slice(0, 3900);
          try { const anchor = await C.comments.anchorFor(btn); await C.comments.sendToClaude({ anchor, text }); toast("Sent to Claude"); }
          catch (err) { toast(err?.code === "consent_required" ? "Comment not posted. Allow comments from this page to send it." : "Couldn't send to Claude from here."); }
        }
      });
      onLive(draw);
    },
  };
}
function proposalsMd(list) {
  return `# HR library — proposed changes\n\nExported ${new Date().toLocaleString()} · ${list.length} proposals\n\n` + list.map((p) => `## ${p.targetLabel}\n\n- **Status:** ${p.status}\n- **Type:** ${KINDS[p.kind] || p.kind}\n- **Jurisdictions:** ${(p.jurisdictions || []).join(", ") || "—"}\n- **Support:** ${p.votes}\n- **Proposed:** ${fmtDate(p.createdAt)}\n- **Link:** ${shareUrl("proposal." + p.id)}\n\n**Current**\n\n${(p.current || "—").split("\n").map((l) => "> " + l).join("\n")}\n\n**Proposed**\n\n${(p.proposed || "—").split("\n").map((l) => "> " + l).join("\n")}\n\n**Why:** ${p.rationale || "—"}\n${C.reviews.get(p.id)?.note ? `\n**Review note:** ${C.reviews.get(p.id).note}\n` : ""}`).join("\n---\n\n");
}
function proposalsCsv(list) {
  const head = ["ID", "Status", "Target", "Type", "Jurisdictions", "Support", "Created", "Current", "Proposed", "Rationale", "Review note"];
  return [head, ...list.map((p) => [p.id, p.status, p.targetLabel, KINDS[p.kind] || p.kind, (p.jurisdictions || []).join("; "), p.votes, p.createdAt, p.current, p.proposed, p.rationale, C.reviews.get(p.id)?.note || ""])].map((r) => r.map(csvCell).join(",")).join("\n");
}

/* ===== markdown exports ===== */
function processMd(p) {
  const L = [`# ${p.id} — ${p.name}`, "", p.summary, "", `- **Stage:** ${STAGE[p.stage]?.label}`, `- **Owner:** ${p.owner}`, `- **Trigger:** ${p.trigger}`, `- **Service level:** ${p.sla}`, `- **Systems:** ${(p.systems || []).join(", ")}`, "", "## Outputs", ...p.outputs.map((o) => `- ${o}`), "", "## Steps", ""];
  const no = Object.fromEntries(p.steps.map((s, i) => [s.id, i + 1]));
  p.steps.forEach((s, i) => { L.push(`${i + 1}. **${s.label}** (${s.lane}${s.sla ? ", " + s.sla : ""}) — ${s.detail}${s.control ? ` *Control: ${s.control}*` : ""}${s.type === "decision" ? " → " + s.branches.map((b) => `${b.label}: step ${no[b.to]}`).join("; ") : ""}`); });
  if ((p.raci || []).length) { L.push("", "## RACI", "", "| Activity | R | A | C | I |", "|---|---|---|---|---|", ...p.raci.map((r) => `| ${r.activity} | ${r.R} | ${r.A} | ${r.C || ""} | ${r.I || ""} |`)); }
  L.push("", "## Controls", ...p.controls.map((c) => `- **${c.id}** (${c.type}) ${c.control} — Evidence: ${c.evidence}`));
  L.push("", "## KPIs", ...p.kpis.map((k) => `- **${k.name}:** ${k.target} — ${k.why}`));
  L.push("", "## Considerations", ...p.considerations.map((c) => `- ${c}`));
  L.push("", "## Variations", ...p.variations.map((v) => `- **${v.when}:** ${v.how}`));
  L.push("", "## Country notes", ...JUR.map((j) => `- **${j.name}:** ${p.countries?.[j.id] || ""}`));
  L.push("", `Related: ${[...(p.policies || []), ...(p.templates || []), ...(p.related || [])].join(", ")}`);
  return L.join("\n");
}
function policyMd(p) {
  return [`# ${p.id} — ${p.name}`, "", `*${TIERS[p.tier]?.label} · ${p.structure} · Owner: ${p.owner} · Approver: ${p.approver} · Review: ${p.review}*`, "", "## Purpose", p.purpose, "", `**Applies to:** ${p.audience}`, "", "## Key provisions", ...p.keyProvisions.map((k, i) => `4.${i + 1} ${k}`), "", "## Draft policy wording", "", p.sampleLanguage, "", "## Roles", ...p.roles.map((r) => `- **${r.role}:** ${r.duties}`), "", "## Country addenda", ...JUR.map((j) => `- **${j.name}:** ${p.countryAddenda?.[j.id] || ""}`), "", "## Decisions to make", ...p.decisions.map((d, i) => { const s = C.decisions.get(`${p.id}__${i}`); return `- ${d}${s?.choice ? `\n  - **Decided:** ${s.choice}` : ""}`; }), "", "## Pitfalls", ...p.pitfalls.map((x) => `- ${x}`), "", `**Training:** ${p.training}`, "", `**Processes:** ${(p.processes || []).join(", ")}`].join("\n");
}
function templateMd(t) {
  const L = [`# ${t.id} — ${t.name}`, "", t.purpose, "", `- **Used by:** ${t.audience}`, `- **When:** ${t.when}`, `- **Owner:** ${t.owner}`, ""];
  t.sections.forEach((s) => { L.push(`## ${s.title}`, ""); if (s.intro) L.push(`*${s.intro}*`, ""); s.items.forEach((it) => { if (it.type === "para") { L.push(it.text.replace(/ \| /g, "  \n"), ""); return; } const pre = it.type === "check" ? "- [ ] " : it.type === "question" ? "- **Q:** " : it.type === "say" ? "- **Say:** " : it.type === "field" ? "- **Field:** " : it.type === "note" ? "- **Note:** " : "- "; L.push(pre + it.text + (it.options ? ` _(${it.options.join(" / ")})_` : "") + (it.rows ? `\n  - ${it.rows.join("\n  - ")}` : "") + (it.detail ? `\n  - _${it.detail}_` : "") + (it.purpose ? `\n  - _Why: ${it.purpose}_` : "") + (it.logic ? `\n  - _Logic: ${it.logic}_` : "")); }); L.push(""); });
  L.push("## Notes", ...(t.notes || []).map((n) => `- ${n}`), "", "## Country notes", ...JUR.map((j) => `- **${j.name}:** ${t.countryNotes?.[j.id] || ""}`));
  return L.join("\n");
}

/* ===== search palette ===== */
let SEARCH_INDEX = null;
function buildIndex() {
  const ix = [];
  const add = (group, title, sub, route, text) => ix.push({ group, title, sub, route, hay: (title + " " + sub + " " + (text || "")).toLowerCase() });
  DB.processes.forEach((p) => { add("Processes", `${p.id} ${p.name}`, STAGE[p.stage]?.label, "process." + p.id, p.summary); p.steps.forEach((s) => add("Process steps", s.label, `${p.id} ${p.name}`, "process." + p.id, s.detail)); });
  DB.policies.forEach((p) => { add("Policies", `${p.id} ${p.name}`, p.category, "policy." + p.id, p.purpose + " " + p.keyProvisions.join(" ")); });
  DB.templates.forEach((t) => add("Templates", `${t.id} ${t.name}`, t.format, "template." + t.id, t.purpose));
  DB.countries.forEach((c) => { add("Countries", c.name, c.region, "country." + c.id, c.summary); c.keyFacts.forEach((f) => add("Country facts", `${JMAP[c.id].name}: ${f.label}`, f.value.slice(0, 120), "country." + c.id, f.value)); c.mandatoryPolicies.forEach((m) => add("Country facts", `${JMAP[c.id].name}: ${m.name}`, m.source, "country." + c.id, m.requirement)); });
  DB.register.forEach((r) => add("Obligations", `${r.id} ${r.name}`, `${r.type} · ${r.scope}`, "item." + r.id, r.requirement + " " + r.cite));
  ["publicCompany", "semiconductor", "globalFrameworks"].forEach((k) => DB.global[k].forEach((it) => add("Public co. & semiconductor", it.title, it.rule, "global." + k, it.requirement)));
  [["checklist", "Master checklist"], ["calendar", "Compliance calendar"], ["changes", "What's changed: library change log"], ["changes.legal", "What's changed: legal changes"], ["compare", "Compare jurisdictions"], ["proposals", "Proposed changes"]].forEach(([r, t]) => add("Pages", t, "", r, ""));
  RELEASES.forEach((r) => add("Library changes", `v${r.version} ${r.title}`, relDate(r), "changes", r.summary + " " + r.items.map((it) => it.text).join(" ")));
  DB.templates.forEach((t) => t.sections.forEach((s) => add("Template sections", s.title, `${t.id} ${t.name}`, "template." + t.id, s.items.map((it) => it.text).join(" ").slice(0, 600))));
  return ix;
}
function openSearch() {
  SEARCH_INDEX = SEARCH_INDEX || buildIndex();
  const m = openModal({ title: "Search the library", body: `<input class="input" id="pal-q" type="search" placeholder="Try “final pay”, “POSH”, “deemed export”, “OF-03”" autocomplete="off" aria-label="Search"><div class="pal-results" id="pal-r"></div>`, cls: "palette" });
  const q = $("#pal-q", m), out = $("#pal-r", m); let sel = 0, hits = [];
  const draw = () => {
    const terms = q.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    hits = terms.length ? SEARCH_INDEX.filter((x) => terms.every((t) => x.hay.includes(t))).slice(0, 60) : [];
    const score = (x) => (x.title.toLowerCase().includes(terms.join(" ")) ? 0 : 1) + ["Pages", "Processes", "Policies", "Templates", "Countries", "Obligations", "Public co. & semiconductor", "Country facts", "Process steps", "Template sections", "Library changes"].indexOf(x.group) * 0.01;
    hits.sort((a, b) => score(a) - score(b)); sel = 0;
    let g = ""; out.innerHTML = hits.map((h, i) => { const head = h.group !== g ? `<div class="pal-group">${esc(h.group)}</div>` : ""; g = h.group; return head + `<a class="pal-item ${i === sel ? "sel" : ""}" href="#${attr(h.route)}" data-i="${i}"><span class="t">${esc(h.title)}</span><span class="s">${esc(h.sub || "")}</span></a>`; }).join("") || (terms.length ? `<div class="empty" style="margin:8px">No matches</div>` : `<div class="small muted" style="padding:12px">Search ${DB.processes.length} processes, their steps, ${DB.policies.length} policies, templates, country rules and obligations.</div>`);
  };
  q.addEventListener("input", draw);
  q.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, Math.min(hits.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))); $$(".pal-item", out).forEach((a) => a.classList.toggle("sel", +a.dataset.i === sel)); $(".pal-item.sel", out)?.scrollIntoView({ block: "nearest" }); }
    if (e.key === "Enter" && hits[sel]) { location.hash = hits[sel].route; closeModal(); }
  });
  out.addEventListener("click", (e) => { if (e.target.closest(".pal-item")) closeModal(); });
  draw();
}

/* ===== shell, nav, router ===== */
const NAV = [
  ["Library", [["home", "Overview", "home"], ["checklist", "Master checklist", "check", () => ITEMS.length], ["processes", "Processes", "flow", () => DB.processes.length], ["policies", "Policy guide", "book", () => DB.policies.length], ["templates", "Templates", "file", () => DB.templates.length]]],
  ["Requirements", [["countries", "Countries", "globe", () => DB.countries.length], ["compare", "Compare", "grid"], ["global", "Public co. & semi", "chip"], ["calendar", "Compliance calendar", "cal"], ["changes", "What's changed", "pulse"]]],
  ["Collaborate", [["proposals", "Proposed changes", "inbox", "props"]]],
];
function renderNav() {
  $("#sidenav").innerHTML = NAV.map(([g, links]) => `<div class="nav-group"><span class="eyebrow">${g}</span>${links.map(([r, l, ic, cnt]) => `<a class="nav-link" href="#${r}" data-nav="${r}">${icon(ic, 17)}<span>${l}</span>${cnt === "props" ? `<span class="count" id="nav-props"></span>` : cnt ? `<span class="count">${cnt()}</span>` : ""}</a>`).join("")}</div>`).join("") +
    `<div class="nav-foot">Jurisdictions: ${JUR.map((j) => `<a href="#country.${j.id}">${esc(j.short)}</a>`).join(" · ")}<br><span class="faint">Research verified ${esc(RAW.meta.verified)}. Not legal advice.</span></div>`;
}
function updateNavCounts() {
  const el = $("#nav-props"); if (!el) return; const n = proposalsList().filter((p) => p.status === "open").length;
  el.textContent = n || ""; el.classList.toggle("hot", n > 0);
}
const ROUTES = { home: viewHome, checklist: viewChecklist, processes: viewProcesses, process: viewProcess, policies: viewPolicies, policy: viewPolicy, templates: viewTemplates, template: viewTemplate, countries: viewCountries, country: viewCountry, compare: viewCompare, global: viewGlobal, calendar: viewCalendar, changes: viewChanges, proposals: viewProposals, proposal: viewProposal, item: viewItem };
const NAV_OF = { process: "processes", policy: "policies", template: "templates", country: "countries", proposal: "proposals", item: "checklist" };
function parseHash() { const h = decodeURIComponent(location.hash.slice(1)) || "home"; const i = h.indexOf("."); return i < 0 ? { view: h, arg: null } : { view: h.slice(0, i), arg: h.slice(i + 1) }; }
let LAST_VIEW = "";
function render() {
  const { view, arg } = parseHash(); const fn = ROUTES[view] || viewNotFound;
  C.hooks.clear(); closeModal(); $("#tooltip").hidden = true;
  const r = fn(arg); const main = $("#main");
  main.innerHTML = r.html; docify(main); if (r.mount) r.mount(main);
  const key = view + "." + (arg || "");
  if (!(view === "processes" && arg)) { if (LAST_VIEW !== key) window.scrollTo(0, 0); }
  LAST_VIEW = key;
  const nv = NAV_OF[view] || view; $$(".nav-link").forEach((a) => a.classList.toggle("active", a.dataset.nav === nv));
  document.body.classList.remove("nav-open");
  refreshPropCounts(); fillPeople(main); updateNavCounts();
}
/* Detail pages: move the in-page nav into a right-hand "On this page" column with scroll tracking */
/* Detail pages: move the in-page nav into a right-hand "On this page" column.
   Clicking an entry scrolls that section to just below the top bar and marks it active;
   scrolling updates the active entry to the last section whose heading has passed the top bar. */
let SPY = null;
const topOffset = () => { const t = $(".topbar"); return Math.ceil((t ? (parseFloat(getComputedStyle(t).top) || 0) + t.offsetHeight : 56) + 16); };
function setTocActive(nav, link) { $$("a[data-jump]", nav).forEach((a) => { const on = a === link; a.classList.toggle("on", on); on ? a.setAttribute("aria-current", "location") : a.removeAttribute("aria-current"); }); }
function jumpTo(id, link) {
  const el = document.getElementById(id); if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - topOffset();
  window.scrollTo({ top: Math.max(0, y), behavior: "auto" });
  const nav = link && link.closest(".localnav");
  if (nav) { setTocActive(nav, link); if (SPY) SPY.lockUntil = Date.now() + 700; }
  el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
}
function docify(main) {
  if (SPY) { window.removeEventListener("scroll", SPY.onScroll); SPY = null; }
  const page = main.querySelector(".page"); const nav = page && page.querySelector(":scope > .localnav"); if (!nav) return;
  const body = document.createElement("div"); body.className = "doc-body";
  const aside = document.createElement("aside"); aside.className = "toc"; aside.setAttribute("aria-label", "On this page");
  aside.innerHTML = `<div class="toc-title">On this page</div>`;
  while (page.firstChild) { const n = page.firstChild; if (n === nav) { page.removeChild(n); continue; } body.appendChild(n); }
  aside.appendChild(nav); page.append(body, aside); page.classList.add("has-toc");
  const links = $$("a[data-jump]", nav);
  let raf = 0; let spy = null;
  const update = () => {
    raf = 0; if (SPY !== spy || Date.now() < spy.lockUntil) return;
    const line = topOffset() + 8; let cur = null;
    for (const a of links) { const el = document.getElementById(a.dataset.jump); if (!el) continue; if (el.getBoundingClientRect().top <= line) cur = a; }
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
    if (atBottom && !cur) cur = links[links.length - 1];
    setTocActive(nav, cur);
  };
  spy = SPY = { lockUntil: 0, onScroll: () => { if (!raf) raf = requestAnimationFrame(update); } };
  window.addEventListener("scroll", SPY.onScroll, { passive: true });
  setTimeout(update, 0);
}

/* Display settings (per viewer, stored in this browser) */
const UI_STYLES = [
  ["clean", "Clean", "Neutral and minimal. The default.", { head: "var(--f-ui)" }],
  ["document", "Document", "Serif headings and reading text for long policy review.", { head: "'Source Serif 4',Georgia,serif" }],
  ["compact", "Compact", "Smaller type and tighter spacing to fit more on screen.", { head: "var(--f-ui)", small: true }],
  ["contrast", "High contrast", "Darker text and stronger borders for readability.", { head: "var(--f-ui)", strong: true }],
];
const UI_ACCENTS = [["navy", "Navy", "hsl(214 52% 33%)"], ["teal", "Teal", "hsl(183 64% 25%)"], ["graphite", "Graphite", "hsl(215 10% 24%)"], ["plum", "Plum", "hsl(334 40% 34%)"]];
function openDisplay() {
  const body = `<div class="stack"><div class="label" style="font-weight:600">Style</div><div class="ui-grid" role="radiogroup" aria-label="Style">${UI_STYLES.map(([k, n, d, o]) => `<button class="ui-opt" role="radio" aria-checked="${PREFS.ui === k}" data-ui-style="${k}">
      <div class="ui-prev" aria-hidden="true"><div class="sb"><i></i><i style="width:70%"></i><i style="width:80%"></i><i style="width:60%"></i></div><div class="mn"><div class="h" style="font-family:${o.head};${o.small ? "font-size:12px;" : ""}">Aa Policy</div><i style="width:90%;${o.strong ? "background:var(--ink-2)" : ""}"></i><i style="width:75%;${o.strong ? "background:var(--ink-2)" : ""}"></i>${o.small ? '<i style="width:85%"></i><i style="width:60%"></i>' : '<i style="width:55%"></i>'}</div></div>
      <b>${n}</b><span>${d}</span></button>`).join("")}</div></div>
    <div class="stack"><div class="label" style="font-weight:600">Accent color</div><div class="swatches" role="radiogroup" aria-label="Accent color">${UI_ACCENTS.map(([k, n, c]) => `<button class="swatch" role="radio" aria-checked="${PREFS.accent === k}" data-ui-accent="${k}"><i style="background:${c}"></i>${n}</button>`).join("")}</div></div>
    <div class="stack"><div class="label" style="font-weight:600">Home page</div><div class="seg" role="radiogroup" aria-label="Home page">${HOME_VIEWS.map(([k, n]) => `<button role="radio" aria-pressed="${PREFS.home === k}" aria-checked="${PREFS.home === k}" data-ui-home="${k}">${n}</button>`).join("")}</div></div>
    <div class="stack"><div class="label" style="font-weight:600">Appearance</div><div class="seg" role="radiogroup" aria-label="Appearance">${[["auto", "Match system"], ["light", "Light"], ["dark", "Dark"]].map(([k, n]) => `<button role="radio" aria-pressed="${PREFS.mode === k}" aria-checked="${PREFS.mode === k}" data-ui-mode="${k}">${n}</button>`).join("")}</div></div>
    <p class="help">Saved in this browser only. It doesn't change what anyone else sees.</p>`;
  const m = openModal({ title: "Display settings", body, foot: `<button class="btn ghost" id="ui-reset">Reset to default</button><button class="btn primary" data-close>Done</button>` });
  const set = (patch) => { PREFS = { ...PREFS, ...patch }; applyPrefs(PREFS); savePrefs(PREFS); sync(); };
  const sync = () => {
    $$("[data-ui-style]", m).forEach((b) => b.setAttribute("aria-checked", PREFS.ui === b.dataset.uiStyle));
    $$("[data-ui-accent]", m).forEach((b) => b.setAttribute("aria-checked", PREFS.accent === b.dataset.uiAccent));
    $$("[data-ui-mode]", m).forEach((b) => { b.setAttribute("aria-pressed", PREFS.mode === b.dataset.uiMode); b.setAttribute("aria-checked", PREFS.mode === b.dataset.uiMode); });
    $$("[data-ui-home]", m).forEach((b) => { b.setAttribute("aria-pressed", PREFS.home === b.dataset.uiHome); b.setAttribute("aria-checked", PREFS.home === b.dataset.uiHome); });
  };
  m.addEventListener("click", (e) => {
    const a = e.target.closest("[data-ui-style]"); if (a) set({ ui: a.dataset.uiStyle });
    const b = e.target.closest("[data-ui-accent]"); if (b) set({ accent: b.dataset.uiAccent });
    const c = e.target.closest("[data-ui-mode]"); if (c) set({ mode: c.dataset.uiMode });
    const h = e.target.closest("[data-ui-home]"); if (h) { set({ home: h.dataset.uiHome }); if (parseHash().view === "home") { const keep = $("#modal"); keep.remove(); render(); document.body.appendChild(keep); } }
    if (e.target.closest("#ui-reset")) set({ ...UI_DEFAULTS });
  });
}

function mdFor(spec) { const [k, id] = spec.split(":"); if (k === "process") return [id + ".md", processMd(P[id])]; if (k === "policy") return [id + ".md", policyMd(POL[id])]; if (k === "template") return [id + ".md", templateMd(TPL[id])]; }

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-open-search]")) { openSearch(); return; }
  const pr = e.target.closest("[data-propose]"); if (pr) { e.preventDefault(); openPropose(JSON.parse(decodeURIComponent(pr.dataset.propose))); return; }
  const pc = e.target.closest("button.pcount[data-pkey]"); if (pc) { UI.propFilter = { ...UI.propFilter, key: pc.dataset.pkey, status: "open" }; location.hash = "proposals"; return; }
  const cl = e.target.closest("[data-copylink]"); if (cl) { copyLink(cl.dataset.copylink); return; }
  const md = e.target.closest("[data-md]"); if (md) { const [f, t] = mdFor(md.dataset.md); saveFile(f, t); return; }
  const j = e.target.closest("[data-jump]"); if (j) { e.preventDefault(); jumpTo(j.dataset.jump, j); return; }
  const v = e.target.closest("[data-vote]"); if (v) { toggleVote(v.dataset.vote); return; }
  const cm = e.target.closest("[data-comment]"); if (cm) {
    if (!C.comments) { toast("Comments are available when this page is open on claude.ai."); return; }
    const target = cm.closest(".phead") || cm;
    C.comments.openComposer({ element: target }).catch(() => toast("Commenting isn't available in this view."));
    return;
  }
});
document.addEventListener("keydown", (e) => {
  if ((e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); openSearch(); }
  if (e.key === "Escape") { closeModal(); document.body.classList.remove("nav-open"); }
});
$("#search-btn").addEventListener("click", openSearch);
$("#ui-btn").addEventListener("click", openDisplay);
$("#menu-btn").addEventListener("click", () => document.body.classList.toggle("nav-open"));
$("#scrim").addEventListener("click", () => document.body.classList.remove("nav-open"));
window.addEventListener("hashchange", render);
renderNav(); render(); initCollab();
