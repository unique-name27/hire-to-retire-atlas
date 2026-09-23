/* ===== views: home, checklist, processes ===== */
const UI = { waferMode: "tier", clFilter: { q: "", type: "", domain: "", tier: "", jur: "", status: "" }, clOpen: new Set(), procQ: "", procDepth: "all", polQ: "", polTier: "", propFilter: { status: "open", jur: "", q: "", key: "", sort: "new" }, calJur: new Set(), chgJur: "", chgImpact: "", libChg: { type: "", area: "", q: "" }, tplQ: "", tplFmt: "" };

function sectionHead(title, right = "", id = "") { return `<div class="section-head"${id ? ` id="${id}"` : ""}><h2>${title}</h2>${right ? `<div class="row">${right}</div>` : ""}</div>`; }

/* ---------- HOME ---------- */
function allChanges() {
  const out = [];
  DB.countries.forEach((c) => (c.recentChanges || []).forEach((r) => out.push({ ...r, jur: c.id, jurName: c.shortName || JMAP[c.id]?.name })));
  (DB.global.recentChanges || []).forEach((r) => out.push({ ...r, jur: "global", jurName: r.area === "semi" ? "Semiconductor" : r.area === "framework" ? "Frameworks" : "Public company" }));
  return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
function stageCounts(k) { return { proc: DB.processes.filter((p) => p.stage === k).length, pol: DB.policies.filter((p) => p.domain === k).length, reg: DB.register.filter((r) => r.domain === k).length }; }

/* ---------- HOME: four layouts, chosen per viewer ---------- */
const HOME_VIEWS = [["overview", "Overview"], ["map", "Process map"], ["workspace", "Workspace"]];
function homeTop(sub) {
  return `<div class="home-top"><div class="stack" style="gap:6px;max-width:760px"><h1>HR policy and process library</h1><p class="lead">${sub}</p></div>
    <div class="tabs home-seg" role="tablist" aria-label="Home view">${HOME_VIEWS.map(([k, l]) => `<button role="tab" data-home="${k}" aria-selected="${PREFS.home === k}">${l}</button>`).join("")}</div></div>`;
}
const homeSearch = () => `<button class="home-search" data-open-search>${icon("search", 18)}<span>Search processes, policies, country rules and templates</span><span class="kbd">/</span></button>`;
function viewHome() {
  if (!HOME_VIEWS.some(([k]) => k === PREFS.home)) PREFS = { ...PREFS, home: "overview" };
  const fn = { overview: homeOverview, map: homeMap, workspace: homeWorkspace }[PREFS.home];
  const r = fn();
  return {
    html: r.html, mount(root) {
      root.querySelector(".home-seg").addEventListener("click", (e) => { const b = e.target.closest("[data-home]"); if (!b) return; PREFS = { ...PREFS, home: b.dataset.home }; savePrefs(PREFS); render(); });
      if (r.mount) r.mount(root);
    },
  };
}
function openPropsHtml(n) {
  const open = proposalsList().filter((p) => p.status === "open").sort((a, b) => b.votes - a.votes || (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, n);
  return open.length ? `<div class="stack">${open.map(propCard).join("")}</div>` : `<div class="empty">${C.db ? "No open proposals. Use the pencil icon beside any step, clause or country rule to suggest a change." : "Proposals are shared when this page is open on claude.ai."}</div>`;
}
const openCount = () => proposalsList().filter((p) => p.status === "open").length;
function changesFeed(list) {
  return `<div class="feed">${list.map((c) => `<div class="feed-item"><div class="date">${esc(ym(c.date))}</div><div><div style="font-weight:600;line-height:1.35">${esc(c.title)}</div><div class="small muted" style="margin-top:2px"><span class="impact ${attr(c.impact)}"></span>${esc(c.jurName)} · ${esc(c.impact)} impact</div></div></div>`).join("")}</div>`;
}

/* 1. Overview: the visual summary */
function homeOverview() {
  const deep = DB.processes.filter((p) => p.depth === "deep");
  const states = DB.countries.filter((c) => c.parent).length;
  const tile = (href, n, label, sub, id) => `<a class="tile" href="${href}"><b ${id ? `id="${id}"` : ""}>${n}</b><span class="tl">${label}</span><span class="ts">${sub}</span></a>`;
  const html = `<div class="page">
  ${homeTop(`Policies, processes, templates and legal requirements for a US-listed semiconductor company in ${DB.countries.length} jurisdictions, from requisition to offboarding.`)}
  <div class="ov-hero">
    <div class="stack" style="gap:16px">
      ${homeSearch()}
      <div class="tiles">
        ${tile("#processes", DB.processes.length, "Processes", `${deep.length} with full RACI and controls`)}
        ${tile("#policies", DB.policies.length, "Policies", "Draft wording and country addenda")}
        ${tile("#checklist", DB.register.length, "Legal obligations", "Notices, filings, trainings, controls")}
        ${tile("#templates", DB.templates.length, "Templates", "Includes the full exit survey")}
        ${tile("#countries", DB.countries.length, "Jurisdictions", `Federal, ${states} US states and ${DB.countries.length - states - 1} countries`)}
        ${tile("#proposals", 0, "Open proposals", "Suggested changes awaiting review", "stat-open")}
      </div>
    </div>
    <div class="panel wafer-card">
      <div class="row between"><div><h3>Coverage map</h3><div class="small muted">One square per policy, process or obligation</div></div>
        <div class="seg" role="group" aria-label="Color by">${["tier", "status", "type"].map((m) => `<button data-wmode="${m}" aria-pressed="${UI.waferMode === m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div></div>
      <div class="wafer-wrap" id="wafer">${waferSvg(ITEMS, UI.waferMode)}</div>
      <div class="wafer-legend" id="wafer-legend">${waferLegend(UI.waferMode)}</div>
    </div>
  </div>
  <section class="section">${sectionHead("Hire-to-retire map", `<span class="small muted">Select a stage to open its processes</span>`)}
    <div class="lifemap" id="lifemap">${lifecycleSvg()}</div></section>
  <div class="grid-2">
    <section class="section">${sectionHead("Recent legal changes", `<a class="small" href="#changes.legal">View all</a>`)}${changesFeed(allChanges().slice(0, 6))}</section>
    <section class="section">${sectionHead("Proposed changes", `<a class="small" href="#proposals">View all</a>`)}<div id="home-props"></div></section>
  </div>
  <section class="section">${sectionHead("Deep-dive processes", `<a class="small" href="#processes">All ${DB.processes.length} processes</a>`)}
    <div class="proc-grid">${deep.map(procCard).join("")}</div></section>
  <p class="disclaimer">Working draft for HR, Legal and People Operations, based on research completed in ${esc(RAW.meta.verified)}. Items marked “verify” were not confirmed against a primary source. This is not legal advice; confirm country specifics with employment counsel before adopting a policy.</p>
</div>`;
  return {
    html, mount(root) {
      const redraw = () => { $("#wafer").innerHTML = waferSvg(ITEMS, UI.waferMode); $("#wafer-legend").innerHTML = waferLegend(UI.waferMode); };
      bindWafer($("#wafer", root), (id) => (location.hash = ITEM[id].route));
      root.querySelector(".wafer-card .seg").addEventListener("click", (e) => { const b = e.target.closest("[data-wmode]"); if (!b) return; UI.waferMode = b.dataset.wmode; $$(".wafer-card [data-wmode]", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); redraw(); });
      const lm = $("#lifemap", root);
      const go = (e) => { const s = e.target.closest("[data-stage]"); if (!s) return; const k = s.dataset.stage; location.hash = k === "Governance" ? "policies" : "processes." + k; };
      lm.addEventListener("click", go); lm.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(e); } });
      const draw = () => { $("#stat-open").textContent = openCount(); $("#home-props").innerHTML = openPropsHtml(4); };
      draw(); onLive(() => { draw(); if (UI.waferMode === "status") redraw(); });
    },
  };
}

/* 2. Process map: every process on one screen, grouped by lifecycle stage */
function homeMap() {
  const bands = [
    ["Employee journey", "var(--accent)", ["Plan", "Recruit", "Onboard", "Grow", "Move", "Offboard"]],
    ["Always on while employed", "var(--ink-2)", ["Pay", "Reward", "Equity", "Benefits", "Leave", "Engage"]],
    ["Foundations", "var(--faint)", ["Relations", "Safety", "Data", "Governance"]],
  ];
  const col = (k, color) => {
    const items = k === "Governance" ? DB.policies.filter((p) => p.domain === "Governance").map((p) => ({ id: p.id, name: p.name, route: "policy." + p.id, deep: false })) : DB.processes.filter((p) => p.stage === k).map((p) => ({ id: p.id, name: p.name, route: "process." + p.id, deep: p.depth === "deep" }));
    return `<div class="pm-col" style="--band:${color}"><a class="pm-head" href="#${k === "Governance" ? "policies" : "processes." + k}"><span>${esc(STAGE[k].label)}</span><span class="n">${items.length}</span></a>
      <ul>${items.map((it) => `<li data-pm="${attr((it.id + " " + it.name).toLowerCase())}"><a href="#${attr(it.route)}"><i class="st" data-st="${attr(it.id)}"></i><span class="pid">${esc(it.id)}</span><span class="${it.deep ? "deep" : ""}">${esc(it.name)}</span></a></li>`).join("")}</ul></div>`;
  };
  const html = `<div class="page wide">
  ${homeTop(`Every process in the library on one screen, grouped by where it sits in the employee lifecycle. Bold names are deep dives. The dot shows each item's checklist status.`)}
  <div class="filters"><input class="input" id="pm-q" type="search" placeholder="Highlight processes, e.g. “final pay”, “visa”, “OF-”" aria-label="Highlight processes">
    <div class="wafer-legend" style="justify-content:flex-start">${Object.entries(STATUS).map(([k, v]) => `<span><i style="background:${v.color};border-radius:50%"></i>${v.label}</span>`).join("")}</div></div>
  ${bands.map(([name, color, keys]) => `<section class="pm-band"><div class="pm-band-h"><span style="background:${color}"></span>${esc(name)}</div>
    <div class="pm-cols" style="--n:${keys.length}">${keys.map((k) => col(k, color)).join("")}</div></section>`).join("")}
</div>`;
  return {
    html, mount(root) {
      const paint = () => $$(".st", root).forEach((d) => (d.style.background = STATUS[itemStatus(d.dataset.st)].color));
      paint(); onLive(paint);
      $("#pm-q", root).addEventListener("input", (e) => {
        const q = e.target.value.toLowerCase().trim();
        $$("[data-pm]", root).forEach((li) => li.classList.toggle("dim", !!q && !li.dataset.pm.includes(q)));
      });
    },
  };
}

/* 3. Workspace: what needs attention */
function homeWorkspace() {
  const m0 = new Date().getMonth() + 1, m1 = (m0 % 12) + 1;
  const cal = allCalendar();
  const monthList = (m) => { const es = cal.filter((e) => e.month === m); return `<div class="ws-month"><h4>${MONTHS[m - 1]} <span class="muted small">${es.length}</span></h4><ul>${es.slice(0, 14).map((e) => `<li><span class="j">${esc(e.jn)}</span> ${esc(e.title)}</li>`).join("")}${es.length > 14 ? `<li><a href="#calendar">${es.length - 14} more</a></li>` : ""}</ul></div>`; };
  const high = allChanges().filter((c) => c.impact === "high").slice(0, 6);
  const html = `<div class="page">
  ${homeTop(`What needs attention: progress on the checklist, work assigned to you, proposals waiting for review, and filing deadlines this month and next.`)}
  <div class="tiles four" id="ws-tiles"></div>
  <div class="grid-2">
    <div class="stack" style="gap:var(--gap)">
      <section class="section">${sectionHead("Assigned to you", `<a class="small" href="#checklist">Checklist</a>`)}<div id="ws-mine"></div></section>
      <section class="section">${sectionHead("Proposals waiting for review", `<a class="small" href="#proposals">View all</a>`)}<div id="home-props"></div></section>
    </div>
    <div class="stack" style="gap:var(--gap)">
      <section class="section">${sectionHead("Coming up", `<a class="small" href="#calendar">Full calendar</a>`)}<div class="ws-cal">${monthList(m0)}${monthList(m1)}</div></section>
      <section class="section">${sectionHead("High-impact legal changes", `<a class="small" href="#changes.legal">View all</a>`)}${changesFeed(high)}</section>
    </div>
  </div>
  <section class="section">${sectionHead("Progress by domain", `<span class="small muted" id="ws-overall"></span>`)}<div class="ws-bars" id="ws-bars"></div>
    <div class="wafer-legend" style="justify-content:flex-start">${["approved", "review", "drafting", "na", "none"].map((k) => `<span><i style="background:${STATUS[k].color}"></i>${STATUS[k].label}</span>`).join("")}</div></section>
</div>`;
  return {
    html, mount(root) {
      const draw = () => {
        const by = (s) => ITEMS.filter((i) => itemStatus(i.id) === s).length;
        $("#ws-tiles").innerHTML = [["approved", "Approved"], ["review", "In review"], ["drafting", "Drafting"]].map(([k, l]) => `<a class="tile" href="#checklist"><b>${by(k)}</b><span class="tl">${l}</span><span class="ts">of ${ITEMS.length} checklist items</span></a>`).join("") + `<a class="tile" href="#proposals"><b>${openCount()}</b><span class="tl">Open proposals</span><span class="ts">Suggested changes</span></a>`;
        const mine = C.me?.id ? ITEMS.filter((i) => C.status.get(i.id)?.assigneeId === C.me.id) : [];
        $("#ws-mine").innerHTML = mine.length ? `<div class="list-rows">${mine.map((i) => { const st = C.status.get(i.id) || {}; return `<a href="#${attr(i.route)}"><span class="idtag">${esc(i.id)}</span><span class="nm">${esc(i.name)}</span><span class="small muted">${esc(STATUS[itemStatus(i.id)].label)}${st.due ? " · due " + esc(fmtDate(st.due)) : ""}</span></a>`; }).join("")}</div>`
          : `<div class="empty">${C.me?.id ? "Nothing is assigned to you yet. Open an item in the checklist and set yourself as the assignee." : "Assignments appear here when this page is open on claude.ai."}</div>`;
        $("#home-props").innerHTML = openPropsHtml(4);
        const done = by("approved"); $("#ws-overall").textContent = `${done} of ${ITEMS.length} approved (${Math.round((done / ITEMS.length) * 100)}%)`;
        const doms = STAGES.filter((s) => ITEMS.some((i) => i.domain === s.key));
        $("#ws-bars").innerHTML = doms.map((d) => {
          const its = ITEMS.filter((i) => i.domain === d.key); const c = {}; its.forEach((i) => { const s = itemStatus(i.id); c[s] = (c[s] || 0) + 1; });
          return `<a class="ws-bar" href="#checklist"><span class="lbl">${esc(d.label)}</span><span class="stackbar">${["approved", "review", "drafting", "na"].map((k) => c[k] ? `<i style="width:${(c[k] / its.length) * 100}%;background:${STATUS[k].color}"></i>` : "").join("")}</span><span class="cnt">${c.approved || 0}/${its.length}</span></a>`;
        }).join("");
        fillPeople(root);
      };
      draw(); onLive(draw);
    },
  };
}

/* ---------- CHECKLIST ---------- */
function clFiltered() {
  const f = UI.clFilter; const q = f.q.toLowerCase();
  return ITEMS.filter((i) => (!f.type || (f.type === "Obligation" ? !["Policy", "Process"].includes(i.type) : i.type === f.type)) && (!f.domain || i.domain === f.domain) && (!f.tier || i.tier === f.tier)
    && (!f.jur || i.jur.includes(f.jur)) && (!f.status || itemStatus(i.id) === f.status)
    && (!q || (i.id + " " + i.name + " " + (i.owner || "")).toLowerCase().includes(q)));
}
function statusSelect(id) {
  const s = itemStatus(id);
  return `<select class="status-sel" data-status-for="${attr(id)}" data-s="${s}" aria-label="Status for ${attr(id)}" ${canPropose() ? "" : "disabled title=\"Shared status tracking needs edit access on claude.ai\""}>${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === s ? "selected" : ""}>${v.label}</option>`).join("")}</select>`;
}
function itemSummary(i) {
  if (i.type === "Process") return P[i.id].summary; if (i.type === "Policy") return POL[i.id].purpose; return REG[i.id]?.requirement || "";
}
function viewChecklist() {
  const domains = STAGES.filter((s) => ITEMS.some((i) => i.domain === s.key));
  const types = ["Policy", "Process", "Obligation", ...Object.keys(TYPE_COLORS).filter((t) => !["Policy", "Process"].includes(t) && ITEMS.some((i) => i.type === t))];
  const f = UI.clFilter;
  const opt = (arr, cur, all) => `<option value="">${all}</option>` + arr.map(([v, l]) => `<option value="${attr(v)}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`).join("");
  const html = `<div class="page">
  <div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><span>Checklist</span></div><h1>Master checklist</h1>
    <p class="lead">${ITEMS.length} items: ${DB.policies.length} policies, ${DB.processes.length} processes and ${DB.register.length} programs, notices, filings, trainings, controls and records. Set a status and owner for each one. Your team sees updates straight away.</p></div>
  <section class="section">${sectionHead("Progress by domain", `<span class="small muted" id="cl-overall"></span><div class="seg" role="group" aria-label="View"><button data-clv="bars" aria-pressed="true">Domains</button><button data-clv="map" aria-pressed="false">Coverage map</button></div>`)}
    <div class="prog" id="cl-prog"></div>
    <div class="panel wafer-card" id="cl-map" hidden><div class="row between"><p class="small muted">Each square is one policy, process or obligation. Select one to open it.</p><div class="seg" role="group" aria-label="Color by">${["status", "tier", "type"].map((m) => `<button data-wmode="${m}" aria-pressed="${m === "status"}">${m[0].toUpperCase() + m.slice(1)}</button>`).join("")}</div></div>
      <div class="wafer-wrap" id="wafer"></div><div class="wafer-legend" id="wafer-legend"></div></div></section>
  <section class="section">
    <div class="filters">
      <input class="input" id="cl-q" type="search" placeholder="Filter by name, ID or owner" value="${attr(f.q)}" aria-label="Filter checklist">
      <select class="select" id="cl-type" aria-label="Type">${opt(types.map((t) => [t, t === "Obligation" ? "All obligations" : t]), f.type, "All types")}</select>
      <select class="select" id="cl-domain" aria-label="Domain">${opt(domains.map((s) => [s.key, s.label]), f.domain, "All domains")}</select>
      <select class="select" id="cl-tier" aria-label="Tier">${opt(Object.entries(TIERS).map(([k, v]) => [k, v.label]), f.tier, "All tiers")}</select>
      <select class="select" id="cl-jur" aria-label="Jurisdiction">${opt(JUR.map((j) => [j.id, j.name]), f.jur, "All jurisdictions")}</select>
      <select class="select" id="cl-status" aria-label="Status">${opt(Object.entries(STATUS).map(([k, v]) => [k, v.label]), f.status, "Any status")}</select>
      <span class="small muted" id="cl-count"></span>
      <span style="flex:1"></span>
      <button class="btn sm" id="cl-csv">${icon("down", 15)}Export CSV</button>
      <button class="btn sm" data-propose="${encodeURIComponent(JSON.stringify({ type: "checklist", id: "CHECKLIST", path: "new", label: "Checklist: suggest a missing item", current: "", route: "checklist" }))}">${icon("edit", 15)}Suggest a missing item</button>
    </div>
    <div class="table-wrap"><table class="t" id="cl-table"><thead><tr><th>Status</th><th>ID</th><th>Item</th><th>Type</th><th>Domain</th><th>Tier</th><th>Owner</th><th></th></tr></thead><tbody id="cl-body"></tbody></table></div>
  </section></div>`;
  return {
    html, mount(root) {
      const drawProg = () => {
        const all = ITEMS; const done = all.filter((i) => itemStatus(i.id) === "approved").length;
        $("#cl-overall").textContent = `${done} of ${all.length} approved (${Math.round((done / all.length) * 100)}%)`;
        $("#cl-prog").innerHTML = domains.map((d) => {
          const its = all.filter((i) => i.domain === d.key); const by = {}; its.forEach((i) => { const s = itemStatus(i.id); by[s] = (by[s] || 0) + 1; });
          const bar = ["approved", "review", "drafting", "na"].map((k) => by[k] ? `<i style="width:${(by[k] / its.length) * 100}%;background:${STATUS[k].color}" title="${STATUS[k].label}: ${by[k]}"></i>` : "").join("");
          return `<a href="#checklist" data-dom="${d.key}" aria-pressed="${f.domain === d.key}"><div class="row between" style="flex-wrap:nowrap"><b style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${attr(d.label)}">${esc(d.label)}</b><span class="mono muted" style="flex:none">${by.approved || 0}/${its.length}</span></div><div class="stackbar">${bar}</div></a>`;
        }).join("");
      };
      const drawRows = () => {
        const rows = clFiltered();
        $("#cl-count").textContent = `${rows.length} shown`;
        $("#cl-body").innerHTML = rows.map((i) => {
          const open = UI.clOpen.has(i.id); const st = C.status.get(i.id) || {};
          const main = `<tr class="cl-row"><td>${statusSelect(i.id)}</td><td>${idTag(i.id)}</td><td><a class="nm" href="#${attr(i.route)}">${esc(i.name)}</a>${i.depth === "deep" ? ' <span class="chip depth-deep" style="height:18px;font-size:10.5px">Deep dive</span>' : ""}${st.assigneeId ? `<div style="margin-top:4px">${personHtml(st.assigneeId)}</div>` : ""}</td><td class="nowrap">${esc(i.type)}</td><td class="nowrap small">${esc(STAGE[i.domain]?.label || i.domain)}</td><td>${tierTag(i.tier)}</td><td class="small" style="min-width:180px">${esc(st.owner || i.owner || "")}</td><td><button class="icon-btn" data-clx="${attr(i.id)}" aria-expanded="${open}" aria-label="Details for ${attr(i.id)}">${icon(open ? "up" : "down", 16)}</button></td></tr>`;
          if (!open) return main;
          return main + `<tr class="cl-extra"><td colspan="8"><div class="stack" style="gap:10px;padding:4px 0 6px">
            <p class="small" style="max-width:90ch">${esc(itemSummary(i))}</p>
            <div class="row small muted">${i.cadence ? `<span><b>Cadence:</b> ${esc(i.cadence)}</span>` : ""}${i.jur?.length && i.jur.length < JUR.length ? `<span>·</span>${jurChips(i.jur)}` : ""}</div>
            <div class="grid-3">
              <div class="field"><label for="own-${attr(i.id)}">Owner (team or function)</label><input class="input" id="own-${attr(i.id)}" data-own="${attr(i.id)}" value="${attr(st.owner || "")}" placeholder="${attr(i.owner || "")}" ${canPropose() ? "" : "disabled"}></div>
              <div class="field"><label for="asg-${attr(i.id)}">Assignee</label><div style="position:relative"><input class="input" id="asg-${attr(i.id)}" data-asg="${attr(i.id)}" placeholder="Search people" autocomplete="off" ${canPropose() && C.user ? "" : "disabled"}><div class="asg-menu panel tight" hidden style="position:absolute;z-index:5;left:0;right:0;top:36px;padding:4px"></div></div></div>
              <div class="field"><label for="due-${attr(i.id)}">Target date</label><input class="input" type="date" id="due-${attr(i.id)}" data-due="${attr(i.id)}" value="${attr(st.due || "")}" ${canPropose() ? "" : "disabled"}></div>
            </div>
            <div class="field"><label for="note-${attr(i.id)}">Notes</label><textarea class="textarea" style="min-height:56px" id="note-${attr(i.id)}" data-note="${attr(i.id)}" placeholder="Where the current document lives, gaps, next step…" ${canPropose() ? "" : "disabled"}>${esc(st.note || "")}</textarea></div>
            ${st.at ? `<div class="tiny muted">Last updated ${esc(fmtRel(st.at))}${st.updatedBy ? " by " : ""}${st.updatedBy ? personHtml(st.updatedBy) : ""}</div>` : ""}
          </div></td></tr>`;
        }).join("") || `<tr><td colspan="8"><div class="empty">No items match these filters.</div></td></tr>`;
        fillPeople($("#cl-body"));
      };
      drawProg(); drawRows();
      let wmode = "status";
      const drawMap = () => { if ($("#cl-map").hidden) return; $("#wafer").innerHTML = waferSvg(ITEMS, wmode); $("#wafer-legend").innerHTML = waferLegend(wmode); };
      bindWafer($("#wafer", root), (id) => (location.hash = ITEM[id].route));
      root.addEventListener("click", (e) => {
        const v = e.target.closest("[data-clv]"); if (v) { $$("[data-clv]", root).forEach((x) => x.setAttribute("aria-pressed", x === v)); const map = v.dataset.clv === "map"; $("#cl-map").hidden = !map; $("#cl-prog").hidden = map; drawMap(); }
        const w = e.target.closest("[data-wmode]"); if (w) { wmode = w.dataset.wmode; $$("[data-wmode]", root).forEach((x) => x.setAttribute("aria-pressed", x === w)); drawMap(); }
      });
      const bindF = (id, key) => $(id, root).addEventListener(id === "#cl-q" ? "input" : "change", (e) => { UI.clFilter[key] = e.target.value; drawRows(); if (key === "domain") drawProg(); });
      bindF("#cl-q", "q"); bindF("#cl-type", "type"); bindF("#cl-domain", "domain"); bindF("#cl-tier", "tier"); bindF("#cl-jur", "jur"); bindF("#cl-status", "status");
      $("#cl-prog", root).addEventListener("click", (e) => { const a = e.target.closest("[data-dom]"); if (!a) return; e.preventDefault(); UI.clFilter.domain = UI.clFilter.domain === a.dataset.dom ? "" : a.dataset.dom; $("#cl-domain").value = UI.clFilter.domain; drawProg(); drawRows(); });
      const body = $("#cl-body", root);
      body.addEventListener("change", (e) => {
        const s = e.target.closest("[data-status-for]"); if (s) { s.dataset.s = s.value; setItemStatus(s.dataset.statusFor, { status: s.value }); return; }
        const d = e.target.closest("[data-due]"); if (d) setItemStatus(d.dataset.due, { due: d.value });
      });
      body.addEventListener("focusout", (e) => {
        const o = e.target.closest("[data-own]"); if (o && o.value !== (C.status.get(o.dataset.own)?.owner || "")) setItemStatus(o.dataset.own, { owner: o.value.trim().slice(0, 200) });
        const n = e.target.closest("[data-note]"); if (n && n.value !== (C.status.get(n.dataset.note)?.note || "")) setItemStatus(n.dataset.note, { note: n.value.slice(0, 4000) });
        const a = e.target.closest("[data-asg]"); if (a) setTimeout(() => { const m = a.parentElement.querySelector(".asg-menu"); if (m) m.hidden = true; }, 200);
      });
      const searchPeople = async (inp) => {
        const menu = inp.parentElement.querySelector(".asg-menu"); const hits = await C.user.search(inp.value.trim());
        menu.innerHTML = hits.length ? hits.map((h) => `<button class="pal-item" style="width:100%;border:0;background:none;text-align:left" data-pick="${attr(h.id)}" data-for="${attr(inp.dataset.asg)}"><img class="avatar" alt="" src="${attr(h.avatarUrl)}"><span class="t"></span></button>`).join("") : `<div class="small muted" style="padding:8px">No matches</div>`;
        $$("[data-pick]", menu).forEach((b, k) => (b.querySelector(".t").textContent = hits[k].name));
        menu.hidden = false;
      };
      body.addEventListener("focusin", (e) => { const a = e.target.closest("[data-asg]"); if (a && C.user) searchPeople(a); });
      body.addEventListener("input", (e) => { const a = e.target.closest("[data-asg]"); if (a && C.user) searchPeople(a); });
      body.addEventListener("click", (e) => {
        const pk = e.target.closest("[data-pick]"); if (pk) { setItemStatus(pk.dataset.for, { assigneeId: pk.dataset.pick }); pk.closest(".asg-menu").hidden = true; return; }
        const x = e.target.closest("[data-clx]"); if (x) { const id = x.dataset.clx; UI.clOpen.has(id) ? UI.clOpen.delete(id) : UI.clOpen.add(id); drawRows(); }
      });
      $("#cl-csv", root).addEventListener("click", () => saveFile("hr-master-checklist.csv", checklistCsv()));
      onLive(() => { drawProg(); drawMap(); if (!root.querySelector("#cl-body").contains(document.activeElement)) drawRows(); });
    },
  };
}
function csvCell(v) { const s = String(v == null ? "" : v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }
function checklistCsv() {
  const head = ["ID", "Name", "Type", "Domain", "Tier", "Jurisdictions", "Default owner", "Owner", "Status", "Target date", "Notes", "Cadence", "Summary"];
  const rows = ITEMS.map((i) => { const s = C.status.get(i.id) || {}; return [i.id, i.name, i.type, STAGE[i.domain]?.label || i.domain, TIERS[i.tier]?.label || "", (i.jur || []).map((j) => JMAP[j]?.name || j).join("; "), i.owner, s.owner || "", STATUS[itemStatus(i.id)].label, s.due || "", s.note || "", i.cadence || "", itemSummary(i)]; });
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\n");
}

/* ---------- PROCESS CATALOG ---------- */
function procCard(p) {
  const n = openCountForTarget(p.id);
  return `<a class="proc-card" href="#process.${attr(p.id)}"><div class="row" style="gap:6px">${idTag(p.id)}${p.depth === "deep" ? '<span class="chip depth-deep">Deep dive</span>' : ""}<span class="chip">${p.steps.length} steps</span></div>
    <div class="name">${esc(p.name)}</div><div class="sum">${esc(p.summary)}</div>
    <div class="foot small muted"><span>${esc(p.lanes.length)} roles</span><span>·</span><span>${esc((p.owner || "").split(/[,(;]/)[0].trim())}</span>${n ? `<span class="pcount" style="margin-left:auto">${n} open</span>` : ""}</div></a>`;
}
function viewProcesses(stageArg) {
  const order = ["Plan", "Recruit", "Onboard", "Pay", "Reward", "Equity", "Benefits", "Leave", "Grow", "Move", "Engage", "Relations", "Safety", "Data", "Offboard"];
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><span>Processes</span></div><h1>Processes, recruiting to offboarding</h1>
      <p class="lead">Each process has a swimlane flowchart, step-by-step detail with timings and embedded controls, KPIs, variations and notes for all ${DB.countries.length} jurisdictions. The ${DB.processes.filter((p) => p.depth === "deep").length} deep dives also include a full RACI. Select a stage on the map to jump to it.</p></div>
    <div class="lifemap" id="lifemap">${lifecycleSvg()}</div>
    <div class="filters"><input class="input" id="pq" type="search" placeholder="Filter processes" value="${attr(UI.procQ)}" aria-label="Filter processes">
      <div class="seg" role="group" aria-label="Depth"><button data-depth="all" aria-pressed="${UI.procDepth === "all"}">All</button><button data-depth="deep" aria-pressed="${UI.procDepth === "deep"}">Deep dives</button></div>
      <span class="small muted" id="pcount"></span></div>
    <div class="localnav" aria-label="Stages">${order.map((k) => `<a href="#processes.${k}" data-jump="stage-${k}">${esc(STAGE[k].label)}</a>`).join("")}</div>
    <div id="plist" class="stack lg"></div></div>`;
  return {
    html, mount(root) {
      const draw = () => {
        const q = UI.procQ.toLowerCase(); let n = 0;
        $("#plist").innerHTML = order.map((k) => {
          const ps = DB.processes.filter((p) => p.stage === k && (UI.procDepth === "all" || p.depth === "deep") && (!q || (p.id + " " + p.name + " " + p.summary).toLowerCase().includes(q)));
          n += ps.length; if (!ps.length) return "";
          return `<section class="stage-block section" id="stage-${k}">${sectionHead(`${esc(STAGE[k].label)} <span class="muted mono" style="font-size:14px;font-weight:400">${ps.length}</span>`)}<div class="proc-grid">${ps.map(procCard).join("")}</div></section>`;
        }).join("") || `<div class="empty">No processes match.</div>`;
        $("#pcount").textContent = `${n} shown`;
      };
      draw();
      $("#pq", root).addEventListener("input", (e) => { UI.procQ = e.target.value; draw(); });
      const lm = $("#lifemap", root);
      const go = (e) => { const st = e.target.closest("[data-stage]"); if (!st) return; const k = st.dataset.stage; if (k === "Governance") { location.hash = "policies"; return; } jumpTo("stage-" + k, document.querySelector(`.localnav a[data-jump="stage-${k}"]`)); };
      lm.addEventListener("click", go); lm.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(e); } });
      root.querySelector(".seg").addEventListener("click", (e) => { const b = e.target.closest("[data-depth]"); if (!b) return; UI.procDepth = b.dataset.depth; $$("[data-depth]", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
      if (stageArg) setTimeout(() => jumpTo("stage-" + stageArg, document.querySelector(`.localnav a[data-jump="stage-${stageArg}"]`)), 30);
      onLive(draw);
    },
  };
}

/* ---------- PROCESS DETAIL ---------- */
function raciHtml(p) {
  const rows = p.raci || []; if (!rows.length) return "";
  const split = (s) => String(s || "").split(/\s*(?:,|;|\s\+\s|\s\/\s)\s*/).map((x) => x.trim()).filter(Boolean);
  const roles = []; rows.forEach((r) => ["R", "A", "C", "I"].forEach((k) => split(r[k]).forEach((x) => { if (!roles.includes(x)) roles.push(x); })));
  const matrix = roles.length <= 11 && roles.every((r) => r.length <= 30);
  if (matrix) {
    return `<div class="table-wrap"><table class="t raci"><thead><tr><th style="min-width:240px">Activity</th>${roles.map((r) => `<th class="rot"><div>${esc(r)}</div></th>`).join("")}</tr></thead><tbody>
      ${rows.map((r) => `<tr><td>${esc(r.activity)}</td>${roles.map((role) => { const ls = ["R", "A", "C", "I"].filter((k) => split(r[k]).includes(role)); return `<td class="c">${ls.map((l) => `<span class="raci-l ${l}" title="${{ R: "Responsible", A: "Accountable", C: "Consulted", I: "Informed" }[l]}">${l}</span>`).join(" ")}</td>`; }).join("")}</tr>`).join("")}
    </tbody></table></div><div class="row small muted"><span class="raci-l R">R</span>Responsible <span class="raci-l A">A</span>Accountable <span class="raci-l C">C</span>Consulted <span class="raci-l I">I</span>Informed</div>`;
  }
  return `<div class="table-wrap"><table class="t"><thead><tr><th>Activity</th><th>Responsible</th><th>Accountable</th><th>Consulted</th><th>Informed</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${esc(r.activity)}</td><td>${esc(r.R)}</td><td>${esc(r.A)}</td><td>${esc(r.C)}</td><td>${esc(r.I)}</td></tr>`).join("")}</tbody></table></div>`;
}
function countryTabs(prefix, contentFn, first = "us") {
  const groups = REGIONS.map((r) => `<div class="cty-group"><span class="g">${r}</span>${JUR.filter((j) => j.region === r).map((j) => `<button role="tab" aria-selected="${j.id === first}" data-ct="${j.id}">${esc(j.name)}</button>`).join("")}</div>`).join("");
  return `<div class="stack" data-ctabs="${prefix}"><div class="cty-tabs" role="tablist" aria-label="Jurisdiction">${groups}</div>
    ${JUR.map((j) => `<div class="cty-panel" role="tabpanel" data-cp="${j.id}" ${j.id === first ? "" : "hidden"}>${contentFn(j.id)}</div>`).join("")}</div>`;
}
function bindCountryTabs(root) {
  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-ct]"); if (!b) return; const box = b.closest("[data-ctabs]");
    $$("[data-ct]", box).forEach((x) => x.setAttribute("aria-selected", x === b));
    $$("[data-cp]", box).forEach((x) => (x.hidden = x.dataset.cp !== b.dataset.ct));
  });
}
function viewProcess(id) {
  const p = P[id]; if (!p) return viewNotFound();
  const base = { type: "process", id: p.id, route: "process." + p.id };
  const pb = (path, label, current) => propBtn({ ...base, path, label: `${p.id} ${p.name} · ${label}`, current });
  const stepNo = Object.fromEntries(p.steps.map((s, i) => [s.id, i + 1]));
  const secs = [["flow", "Flowchart"], ["steps", "Steps"], ["raci", "RACI"], ["controls", "Controls"], ["kpis", "KPIs"], ["consider", "Considerations"], ["variations", "Variations"], ["countries", "Countries"], ["linked", "Linked"], ["history", "Change history"]].filter(([k]) => k !== "raci" || (p.raci || []).length);
  const html = `<div class="page">
    <div class="breadcrumb"><a href="#processes">Processes</a><span>/</span><a href="#processes.${attr(p.stage)}">${esc(STAGE[p.stage]?.label || p.stage)}</a><span>/</span><span class="mono">${esc(p.id)}</span></div>
    <div class="phead propable"><div class="title-row"><div class="stack" style="gap:8px"><div class="row">${idTag(p.id)}${p.depth === "deep" ? '<span class="chip depth-deep">Deep dive</span>' : '<span class="chip">Standard</span>'}${tierTag(p.tier)}</div><h1>${esc(p.name)}</h1></div>
      <div class="actions"><button class="btn" data-propose="${encodeURIComponent(JSON.stringify({ ...base, path: "summary", label: `${p.id} ${p.name} · Summary`, current: p.summary }))}">${icon("edit", 16)}Propose change</button><button class="btn ghost" data-comment title="Comment on this process">${icon("comment", 16)}Comment</button><button class="btn ghost" data-copylink="process.${attr(p.id)}">${icon("link", 16)}Copy link</button><button class="btn ghost" data-md="process:${attr(p.id)}">${icon("down", 16)}Markdown</button></div></div>
      <p class="lead">${esc(p.summary)}</p><div><button class="pcount" data-pkey="${attr(propKey(p.id, "summary"))}" hidden></button></div>
      <div class="meta-grid">
        <div><span class="eyebrow">Owner</span><span class="v">${esc(p.owner)}</span></div>
        <div><span class="eyebrow">Trigger</span><span class="v">${esc(p.trigger)}</span></div>
        <div><span class="eyebrow">Service level</span><span class="v">${esc(p.sla)}</span></div>
        <div><span class="eyebrow">Systems</span><span class="v row" style="gap:5px">${(p.systems || []).map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</span></div>
      </div>
      <div class="panel tight"><div class="eyebrow" style="margin-bottom:6px">Outputs &amp; records</div>${bullets(p.outputs)}</div>
    </div>
    <nav class="localnav" aria-label="On this page">${secs.map(([k, l]) => `<a href="#process.${attr(p.id)}" data-jump="sec-${k}">${l}</a>`).join("")}</nav>

    <section class="section" id="sec-flow">${sectionHead("Flowchart", `<span class="small muted">${p.lanes.length} lanes · ${p.steps.length} steps</span><button class="btn sm" id="fit-btn">Fit to width</button>`)}
      <div class="flow-wrap" id="flow">${swimlaneSvg(p)}</div>
      <div class="row small muted"><span class="chip" style="background:var(--accent);color:var(--accent-ink);border-color:var(--accent)">Start</span><span class="chip">Task</span><span class="chip" style="background:var(--amber-soft);border-color:var(--amber)">Decision</span><span class="chip" style="background:var(--ink);color:var(--surface);border-color:var(--ink)">End</span><span>Dashed lines loop back. Select a box to jump to the step.</span></div></section>

    <section class="section" id="sec-steps">${sectionHead("Steps")}
      <div class="steps">${p.steps.map((s, i) => `<div class="step propable" id="step-${attr(s.id)}" data-type="${attr(s.type)}" data-n="${i + 1}" data-stepcard="${attr(s.id)}"><div class="step-card">
        <div class="head">${laneChip(s.lane)}<span class="label">${esc(s.label)}</span>${s.sla ? `<span class="chip mono">${esc(s.sla)}</span>` : ""}<span style="flex:1"></span>${pb("steps/" + s.id, `Step ${i + 1}: ${s.label}`, s.label + "\n\n" + s.detail + (s.control ? "\n\nControl: " + s.control : ""))}</div>
        <div>${esc(s.detail)}</div>
        ${s.control ? `<div class="ctrl"><b>Control:</b> ${esc(s.control)}</div>` : ""}
        ${s.type === "decision" ? `<div class="branches">${(s.branches || []).map((b) => `<span>${esc(b.label)} → step ${stepNo[b.to] || "?"}</span>`).join(" · ")}</div>` : ""}
      </div></div>`).join("")}</div></section>

    ${(p.raci || []).length ? `<section class="section propable" id="sec-raci">${sectionHead("RACI", pb("raci", "RACI", (p.raci || []).map((r) => `${r.activity} — R: ${r.R}; A: ${r.A}; C: ${r.C || ""}; I: ${r.I || ""}`).join("\n")))}${raciHtml(p)}</section>` : ""}

    <section class="section" id="sec-controls">${sectionHead("Controls")}
      <div class="table-wrap"><table class="t"><thead><tr><th>ID</th><th>Control</th><th>Type</th><th>Evidence</th><th></th></tr></thead><tbody>
      ${(p.controls || []).map((c) => `<tr class="propable"><td class="mono">${esc(c.id)}</td><td>${esc(c.control)}</td><td><span class="chip ${c.type === "preventive" ? "accent" : "amber"}">${esc(c.type)}</span></td><td class="small">${esc(c.evidence)}</td><td>${pb("controls/" + c.id, "Control " + c.id, c.control + "\nEvidence: " + c.evidence)}</td></tr>`).join("")}
      </tbody></table></div></section>

    <section class="section" id="sec-kpis">${sectionHead("KPIs")}
      <div class="kpi-grid">${(p.kpis || []).map((k, i) => `<div class="kpi propable"><div class="row between"><b>${esc(k.name)}</b>${pb("kpis/" + i, "KPI: " + k.name, `${k.name}\nTarget: ${k.target}\n${k.why}`)}</div><div class="target">${esc(k.target)}</div><div class="small muted">${esc(k.why)}</div></div>`).join("")}</div></section>

    <section class="section" id="sec-consider">${sectionHead("Considerations")}
      <div class="consid">${(p.considerations || []).map((c, i) => `<div class="propable"><span style="flex:1">${esc(c)}</span>${pb("considerations/" + i, "Consideration " + (i + 1), c)}</div>`).join("")}</div></section>

    <section class="section" id="sec-variations">${sectionHead("Variations")}
      <div class="var-list">${(p.variations || []).map((v, i) => `<div class="var propable"><div class="when">${esc(v.when)}</div><div class="row" style="align-items:flex-start;flex-wrap:nowrap"><span style="flex:1">${esc(v.how)}</span>${pb("variations/" + i, "Variation: " + v.when, v.when + " → " + v.how)}</div></div>`).join("")}</div></section>

    <section class="section" id="sec-countries">${sectionHead("Country requirements", `<span class="small muted">Process-specific notes plus the related statutory rules</span>`)}
      ${countryTabs("pc", (cid) => {
        const note = p.countries?.[cid]; const c = CTY[cid]; const keys = STAGE_TO_COUNTRY[p.stage] || [];
        const reqs = keys.flatMap((k) => (c?.stages?.[k] || []).map((r) => ({ ...r, k })));
        return `<div class="row between propable" style="align-items:flex-start;flex-wrap:nowrap"><p style="flex:1">${esc(note || "No country note yet.")}</p>${pb("countries/" + cid, JMAP[cid].name + " note", note || "")}</div>
          ${reqs.length ? `<details class="acc"><summary>${reqs.length} related ${esc(JMAP[cid].name)} rules (${keys.map((k) => COUNTRY_STAGE_LABEL[k]).join(", ")})</summary><div class="acc-body">${reqs.map((r) => `<div class="req"><b>${esc(r.req)}</b><span class="small">${esc(r.detail)}</span>${r.cite ? `<span class="cite">${esc(r.cite)}</span>` : ""}</div>`).join("")}</div></details>` : ""}
          <a class="small" href="#country.${cid}">Open the ${esc(JMAP[cid].name)} page ${icon("arrow", 13)}</a>`;
      })}</section>

    <section class="section" id="sec-linked">${sectionHead("Linked policies, templates and processes")}
      <div class="grid-3">
        <div class="panel tight stack" style="gap:6px"><div class="eyebrow">Governing policies</div>${(p.policies || []).map((x) => `<div>${linkTo(x)}</div>`).join("") || '<span class="muted small">None</span>'}</div>
        <div class="panel tight stack" style="gap:6px"><div class="eyebrow">Templates</div>${(p.templates || []).map((x) => `<div>${linkTo(x)}</div>`).join("") || '<span class="muted small">None</span>'}</div>
        <div class="panel tight stack" style="gap:6px"><div class="eyebrow">Related processes</div>${(p.related || []).map((x) => `<div>${linkTo(x)}</div>`).join("") || '<span class="muted small">None</span>'}</div>
      </div></section>
    ${historySection(p.id, "process")}
  </div>`;
  return {
    html, mount(root) {
      const flow = $("#flow", root); let fit = false;
      $("#fit-btn", root).addEventListener("click", (e) => { fit = !fit; const svg = flow.querySelector("svg"); svg.style.width = fit ? "100%" : ""; svg.style.height = fit ? "auto" : ""; e.target.textContent = fit ? "Actual size" : "Fit to width"; });
      const hl = (sid, on) => { $$(`.fnode[data-step="${sid}"]`, root).forEach((n) => n.classList.toggle("hl", on)); const c = document.getElementById("step-" + sid); if (c) c.classList.toggle("hl", on); };
      const goStep = (sid) => { const c = document.getElementById("step-" + sid); if (!c) return; $$(".step.hl,.fnode.hl", root).forEach((x) => x.classList.remove("hl")); hl(sid, true); c.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); };
      flow.addEventListener("click", (e) => { const n = e.target.closest(".fnode"); if (n) goStep(n.dataset.step); });
      flow.addEventListener("keydown", (e) => { const n = e.target.closest(".fnode"); if (n && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); goStep(n.dataset.step); } });
      root.addEventListener("mouseover", (e) => { const c = e.target.closest("[data-stepcard]"); if (c) { $$(".fnode.hl", root).forEach((x) => x.classList.remove("hl")); $$(`.fnode[data-step="${c.dataset.stepcard}"]`, root).forEach((n) => n.classList.add("hl")); } });
      bindCountryTabs(root);
      drawHistoryLive(root); onLive(() => drawHistoryLive(root));
    },
  };
}
function viewNotFound() { return { html: `<div class="page"><div class="empty">That page doesn't exist. <a href="#home">Go to the overview</a>.</div></div>` }; }
