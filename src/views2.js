/* ===== views: policies, templates ===== */
const POLICY_CATS = [...new Set(DB.policies.map((p) => p.category))];
function polCard(p) {
  const n = openCountForTarget(p.id);
  return `<a class="proc-card" href="#policy.${attr(p.id)}"><div class="row" style="gap:6px">${idTag(p.id)}${tierTag(p.tier)}</div>
    <div class="name">${esc(p.name)}</div><div class="sum">${esc(p.purpose)}</div>
    <div class="foot small muted"><span>${esc(p.structure)}</span><span>·</span><span>${esc(p.review)}</span>${n ? `<span class="pcount" style="margin-left:auto">${n} open</span>` : ""}</div></a>`;
}
function viewPolicies() {
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><span>Policy guide</span></div><h1>Policy guide</h1>
      <p class="lead">${DB.policies.length} policies. Each has its purpose, key provisions, draft wording you can adapt, roles, an addendum for each of the ${DB.countries.length} jurisdictions, the decisions your team needs to make, common mistakes, and the processes it governs.</p></div>
    <div class="panel stack" style="gap:10px"><h3>How the policy set is organized</h3>
      <div class="grid-3 small">
        <div><b>Global policy</b><p class="muted">Sets the standard and principles for everyone. Approved by the CHRO and General Counsel, or a Board committee where required.</p></div>
        <div><b>Country addendum</b><p class="muted">Adds what local law requires, such as statutory committees, notice periods or filings. It overrides the global policy only where the law demands it.</p></div>
        <div><b>Procedure &amp; template</b><p class="muted">Explains how the policy is carried out. These are the processes and templates in this library, linked from each policy.</p></div>
      </div>
      <p class="small muted">Tiers: ${Object.values(TIERS).map((t) => `<span class="tier"><i style="background:${t.color}"></i>${t.label}</span>`).join(" &nbsp; ")}. The policy lifecycle itself is process <a href="#process.DS-08">DS-08</a>.</p></div>
    <div class="filters"><input class="input" id="polq" type="search" placeholder="Filter policies" value="${attr(UI.polQ)}" aria-label="Filter policies">
      <div class="row" id="poltier">${[["", "All"], ...Object.entries(TIERS).map(([k, v]) => [k, v.short])].map(([k, l]) => `<button class="chip" data-tier="${k}" aria-pressed="${UI.polTier === k}">${esc(l)}</button>`).join("")}</div></div>
    <div id="pollist" class="stack lg"></div></div>`;
  return {
    html, mount(root) {
      const draw = () => {
        const q = UI.polQ.toLowerCase();
        $("#pollist").innerHTML = POLICY_CATS.map((cat) => {
          const ps = DB.policies.filter((p) => p.category === cat && (!UI.polTier || p.tier === UI.polTier) && (!q || (p.id + " " + p.name + " " + p.purpose).toLowerCase().includes(q)));
          return ps.length ? `<section class="section">${sectionHead(`${esc(cat)} <span class="muted mono" style="font-size:14px;font-weight:400">${ps.length}</span>`)}<div class="proc-grid">${ps.map(polCard).join("")}</div></section>` : "";
        }).join("") || `<div class="empty">No policies match.</div>`;
      };
      draw();
      $("#polq", root).addEventListener("input", (e) => { UI.polQ = e.target.value; draw(); });
      $("#poltier", root).addEventListener("click", (e) => { const b = e.target.closest("[data-tier]"); if (!b) return; UI.polTier = b.dataset.tier; $$("[data-tier]", root).forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); });
      onLive(draw);
    },
  };
}
function viewPolicy(id) {
  const p = POL[id]; if (!p) return viewNotFound();
  const base = { type: "policy", id: p.id, route: "policy." + p.id };
  const pb = (path, label, current) => propBtn({ ...base, path, label: `${p.id} ${p.name} · ${label}`, current });
  const secs = [["prov", "Key provisions"], ["lang", "Draft wording"], ["roles", "Roles"], ["addenda", "Country addenda"], ["decisions", "Decisions"], ["pitfalls", "Pitfalls"], ["links", "Linked"], ["history", "Change history"]];
  const html = `<div class="page">
    <div class="breadcrumb"><a href="#policies">Policy guide</a><span>/</span><span>${esc(p.category)}</span><span>/</span><span class="mono">${esc(p.id)}</span></div>
    <div class="phead"><div class="title-row"><div class="stack" style="gap:8px"><div class="row">${idTag(p.id)}${tierTag(p.tier)}<span class="chip">${esc(p.structure)}</span></div><h1>${esc(p.name)}</h1></div>
      <div class="actions"><button class="btn" data-propose="${encodeURIComponent(JSON.stringify({ ...base, path: "purpose", label: `${p.id} ${p.name} · Purpose`, current: p.purpose }))}">${icon("edit", 16)}Propose change</button><button class="btn ghost" data-comment>${icon("comment", 16)}Comment</button><button class="btn ghost" data-copylink="policy.${attr(p.id)}">${icon("link", 16)}Copy link</button><button class="btn ghost" data-md="policy:${attr(p.id)}">${icon("down", 16)}Markdown</button></div></div>
      <p class="lead">${esc(p.purpose)}</p><div><button class="pcount" data-pkey="${attr(propKey(p.id, "purpose"))}" hidden></button></div>
      <div class="meta-grid">
        <div><span class="eyebrow">Owner</span><span class="v">${esc(p.owner)}</span></div>
        <div><span class="eyebrow">Approver</span><span class="v">${esc(p.approver)}</span></div>
        <div><span class="eyebrow">Review cycle</span><span class="v">${esc(p.review)}</span></div>
        <div><span class="eyebrow">Applies to</span><span class="v">${esc(p.audience)}</span></div>
        <div><span class="eyebrow">Training &amp; acknowledgment</span><span class="v">${esc(p.training)}</span></div>
      </div></div>
    <nav class="localnav" aria-label="On this page">${secs.map(([k, l]) => `<a href="#policy.${attr(p.id)}" data-jump="sec-${k}">${l}</a>`).join("")}</nav>
    <section class="section" id="sec-prov">${sectionHead("Key provisions", `<span class="small muted">Clause numbers are for review; renumber to match your policy template</span>`)}
      <div class="provisions">${p.keyProvisions.map((k, i) => `<div class="prov propable"><span class="n">4.${i + 1}</span><span>${esc(k)}</span>${pb("keyProvisions/" + i, "Clause 4." + (i + 1), k)}</div>`).join("")}</div></section>
    <section class="section propable" id="sec-lang">${sectionHead("Draft policy wording", `<button class="btn sm" data-copytext="lang">${icon("copy", 15)}Copy</button>${pb("sampleLanguage", "Draft wording", p.sampleLanguage)}`)}
      <div class="policy-text" id="lang-text">${esc(p.sampleLanguage)}</div></section>
    <section class="section" id="sec-roles">${sectionHead("Roles and responsibilities")}
      <div class="table-wrap"><table class="t kv"><tbody>${p.roles.map((r, i) => `<tr class="propable"><td>${esc(r.role)}</td><td><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span style="flex:1">${esc(r.duties)}</span>${pb("roles/" + i, "Role: " + r.role, r.role + ": " + r.duties)}</div></td></tr>`).join("")}</tbody></table></div></section>
    <section class="section" id="sec-addenda">${sectionHead("Country addenda")}
      ${countryTabs("pa", (cid) => `<div class="row propable" style="align-items:flex-start;flex-wrap:nowrap"><p style="flex:1">${esc(p.countryAddenda?.[cid] || "")}</p>${pb("countryAddenda/" + cid, JMAP[cid].name + " addendum", p.countryAddenda?.[cid] || "")}</div>
        ${(CTY[cid]?.mandatoryPolicies || []).filter((m) => relevantMandatory(m, p)).map((m) => `<div class="callout info small"><b>${esc(m.name)}</b> — ${esc(m.requirement)} <span class="mono muted">${esc(m.source)}</span></div>`).join("")}`)}</section>
    <section class="section" id="sec-decisions">${sectionHead("Decisions to make", `<span class="small muted">Record your team's choice. It's shared with everyone who opens this page.</span>`)}
      <div class="stack" id="decisions"></div></section>
    <section class="section" id="sec-pitfalls">${sectionHead("Common pitfalls")}<div class="consid">${p.pitfalls.map((x, i) => `<div class="propable"><span style="flex:1">${esc(x)}</span>${pb("pitfalls/" + i, "Pitfall " + (i + 1), x)}</div>`).join("")}</div></section>
    <section class="section" id="sec-links">${sectionHead("Linked")}
      <div class="grid-3">
        <div class="panel tight stack" style="gap:6px"><div class="eyebrow">Processes this policy governs</div>${[...new Set([...(p.processes || []), ...(POLICY_TO_PROCS[p.id] || [])])].map((x) => `<div>${linkTo(x)}</div>`).join("") || '<span class="muted small">None</span>'}</div>
        <div class="panel tight stack" style="gap:6px"><div class="eyebrow">Related policies</div>${(p.related || []).map((x) => `<div>${linkTo(x)}</div>`).join("") || '<span class="muted small">None</span>'}</div>
        <div class="panel tight stack" style="gap:6px"><div class="eyebrow">Sources</div>${(p.sources || []).map((s) => `<div class="small"><a href="${attr(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></div>`).join("") || '<span class="muted small">See the country pages for sources</span>'}</div>
      </div></section>
    ${historySection(p.id, "policy")}</div>`;
  return {
    html, mount(root) {
      bindCountryTabs(root);
      root.addEventListener("click", (e) => { if (e.target.closest("[data-copytext]")) copyText(p.sampleLanguage, "Draft wording copied"); });
      const draw = () => {
        const box = $("#decisions", root); if (box.contains(document.activeElement)) return;
        box.innerHTML = p.decisions.map((d, i) => {
          const key = `${p.id}__${i}`; const st = C.decisions.get(key) || {};
          const m = d.match(/^(.*?\?)\s*(\((.*)\))?\s*$/s); const q = m ? m[1] : d; const hint = m && m[3] ? m[3] : "";
          return `<div class="decision propable"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div style="flex:1"><div class="q">${esc(q)}</div>${hint ? `<div class="small muted" style="margin-top:3px">${esc(hint)}</div>` : ""}</div>${pb("decisions/" + i, "Decision: " + q, d)}</div>
            <div class="log"><select class="select" data-dstate="${key}" aria-label="Decision state" ${canPropose() ? "" : "disabled"}><option value="open" ${st.state !== "decided" && st.state !== "deferred" ? "selected" : ""}>Open</option><option value="decided" ${st.state === "decided" ? "selected" : ""}>Decided</option><option value="deferred" ${st.state === "deferred" ? "selected" : ""}>Deferred</option></select>
            <input class="input" data-dchoice="${key}" value="${attr(st.choice || "")}" placeholder="${canPropose() ? "Record what you chose and why" : "Decision log is shared on claude.ai"}" aria-label="Decision" ${canPropose() ? "" : "disabled"}></div>
            ${st.at ? `<div class="who">Updated ${esc(fmtRel(st.at))} ${st.updatedBy ? "by " + personHtml(st.updatedBy) : ""}</div>` : ""}</div>`;
        }).join("");
        fillPeople(box);
      };
      draw();
      const box = $("#decisions", root);
      box.addEventListener("change", (e) => { const s = e.target.closest("[data-dstate]"); if (s) setDecision(s.dataset.dstate, { state: s.value }); });
      box.addEventListener("focusout", (e) => { const c = e.target.closest("[data-dchoice]"); if (c && c.value !== (C.decisions.get(c.dataset.dchoice)?.choice || "")) setDecision(c.dataset.dchoice, { choice: c.value.slice(0, 2000) }); });
      onLive(draw);
      drawHistoryLive(root); onLive(() => drawHistoryLive(root));
    },
  };
}
function relevantMandatory(m, p) {
  const words = p.name.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter((w) => w.length > 4 && !["policy", "employee", "employees", "workplace"].includes(w));
  const t = (m.name + " " + m.requirement).toLowerCase();
  return words.some((w) => t.includes(w.slice(0, 6)));
}

/* ---------- TEMPLATES ---------- */
const TPL_CATS = ["Recruit", "Onboard", "Perform", "Reward", "Move", "Leave", "Safety", "Relations", "Data", "Governance", "Offboard"];
const TPL_CAT_LABEL = { Recruit: "Recruiting and hiring", Onboard: "Onboarding", Perform: "Performance and growth", Reward: "Pay and rewards", Move: "Mobility and job changes", Leave: "Leave and accommodation", Safety: "Health and safety", Relations: "Employee relations", Data: "HR data and privacy", Governance: "Governance and policy", Offboard: "Offboarding" };
const TPL_NEW = new Set(RELEASES.length ? RELEASES[0].items.filter((it) => it.type === "added" && TPL[it.ref]).map((it) => it.ref) : []);
function viewTemplates() {
  const cats = [...new Set(DB.templates.map((t) => t.category))].sort((a, b) => (TPL_CATS.indexOf(a) + 99) % 99 - (TPL_CATS.indexOf(b) + 99) % 99 || a.localeCompare(b));
  const fmts = [...new Set(DB.templates.map((t) => t.format))].sort();
  const ex = TPL["T-EXIT-SURVEY"];
  const card = (t) => `<a class="proc-card" href="#template.${attr(t.id)}"><div class="row" style="gap:6px">${idTag(t.id)}<span class="chip">${esc(t.format)}</span>${TPL_NEW.has(t.id) ? '<span class="chip ok">New</span>' : ""}</div><div class="name">${esc(t.name)}</div><div class="sum">${esc(t.purpose)}</div><div class="foot small muted">${esc(t.owner || "")}</div></a>`;
  const html = `<div class="page">
    <div class="phead"><div class="breadcrumb"><a href="#home">Home</a><span>/</span><span>Templates</span></div><h1>Templates</h1>
      <p class="lead">${DB.templates.length} forms, letters, scripts, interview guides and checklists, from the job description to the exit certificate. Each is written out in full with notes for all ${DB.countries.length} jurisdictions, so it can be adapted rather than started from scratch. Any item can be changed through a proposal.</p></div>
    <a class="panel" href="#template.T-EXIT-SURVEY" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center;color:inherit;text-decoration:none;border-color:var(--accent-line)">
      <div class="stack" style="gap:6px"><div class="row">${idTag(ex.id)}<span class="chip accent">Interactive preview</span></div><h2>${esc(ex.name)}</h2><p class="muted">${esc(ex.purpose)}</p></div>
      <span class="btn primary">Open survey ${icon("arrow", 15)}</span></a>
    <div class="filters"><input class="input" id="tp-q" type="search" placeholder="Search templates" value="${attr(UI.tplQ)}" aria-label="Search templates">
      <select class="select" id="tp-f" aria-label="Format"><option value="">All formats</option>${fmts.map((f) => `<option value="${attr(f)}" ${UI.tplFmt === f ? "selected" : ""}>${esc(f[0].toUpperCase() + f.slice(1))}</option>`).join("")}</select>
      <span class="small muted" id="tp-n"></span>${TPL_NEW.size ? `<span style="flex:1"></span><a class="small" href="#changes">${TPL_NEW.size} added in the latest release</a>` : ""}</div>
    <div id="tp-body"></div></div>`;
  return {
    html, mount(root) {
      const draw = () => {
        const q = UI.tplQ.toLowerCase().trim(); let n = 0;
        $("#tp-body", root).innerHTML = cats.map((c) => {
          const l = DB.templates.filter((t) => t.category === c && t.id !== "T-EXIT-SURVEY" && (!UI.tplFmt || t.format === UI.tplFmt) && (!q || (t.id + " " + t.name + " " + t.purpose + " " + t.audience).toLowerCase().includes(q)));
          n += l.length;
          return l.length ? `<section class="section">${sectionHead(`${esc(TPL_CAT_LABEL[c] || c)} <span class="mono muted small">${l.length}</span>`)}<div class="proc-grid">${l.map(card).join("")}</div></section>` : "";
        }).join("") || `<div class="empty">No templates match.</div>`;
        $("#tp-n", root).textContent = `${n} shown`;
      };
      draw();
      $("#tp-q", root).addEventListener("input", (e) => { UI.tplQ = e.target.value; draw(); });
      $("#tp-f", root).addEventListener("change", (e) => { UI.tplFmt = e.target.value; draw(); });
    },
  };
}
const TPL_KIND = { check: "Check", field: "Field", question: "Ask", say: "Say", prompt: "Prompt", note: "Note", para: "Text" };
const paraHtml = (text) => esc(text).replace(/ \| /g, "\n").replace(/^(Dear [^:\n]{1,60}:) /m, "$1\n\n");
/* plain text of a template, for pasting into Word, an email or an HRIS form */
function templateText(t) {
  const L = [t.name.toUpperCase(), "", t.purpose, ""];
  t.sections.forEach((s) => {
    L.push(s.title.toUpperCase(), ""); if (s.intro) L.push(s.intro, "");
    s.items.forEach((it) => {
      const d = it.detail ? `\n    ${it.detail}` : "";
      if (it.type === "para") L.push(it.text.replace(/ \| /g, "\n"), "");
      else if (it.type === "check") L.push(`[ ] ${it.text}${d}`);
      else if (it.type === "field") L.push(`${it.text}: ____________________${d}`);
      else if (it.type === "question") L.push(`Q: ${it.text}${d}`);
      else if (it.type === "say") L.push(`Say: ${it.text}${d}`);
      else if (it.type === "note") L.push(`Note: ${it.text}${d}`);
      else L.push(`- ${it.text}${d}`);
    });
    L.push("");
  });
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
function viewTemplate(id) {
  const t = TPL[id]; if (!t) return viewNotFound();
  if (id === "T-EXIT-SURVEY") return viewSurvey(t);
  const base = { type: "template", id: t.id, route: "template." + t.id };
  const pb = (path, label, current) => propBtn({ ...base, path, label: `${t.id} ${t.name} · ${label}`, current });
  const secs = [...t.sections.map((s, si) => ["s" + si, s.title]), ["use", "How to use it"], ["cn", "Country notes"], ["used", "Used in"], ["history", "Change history"]];
  const used = [...new Set([...(t.processes || []), ...(TPL_TO_PROCS[t.id] || [])])];
  const item = (s, si, it) => it.type === "para"
    ? `<div class="tpl-item para propable"><div class="grow"><div class="txt">${paraHtml(it.text)}</div>${it.detail ? `<div class="det">${esc(it.detail)}</div>` : ""}</div>${pb(`sections/${si}/${it.id}`, `${s.title}: ${it.text.slice(0, 60)}`, it.text)}</div>`
    : `<div class="tpl-item ${attr(it.type)} propable">${it.type === "check" ? `<input type="checkbox" aria-label="Done">` : `<span class="tpl-kind">${TPL_KIND[it.type] || esc(it.type)}</span>`}
        <div class="grow"><div class="txt">${esc(it.text)}</div>${it.detail ? `<div class="det">${esc(it.detail)}</div>` : ""}${it.type === "field" ? '<div class="fake" aria-hidden="true"></div>' : ""}${it.owner || it.when ? `<div class="row tiny muted" style="margin-top:5px">${it.owner ? laneChip(it.owner) : ""}${it.when ? `<span class="chip mono">${esc(it.when)}</span>` : ""}</div>` : ""}</div>
        ${pb(`sections/${si}/${it.id}`, `${s.title}: ${it.text.slice(0, 60)}`, it.text + (it.detail ? "\n\n" + it.detail : ""))}</div>`;
  const html = `<div class="page">
    <div class="breadcrumb"><a href="#templates">Templates</a><span>/</span><span>${esc(TPL_CAT_LABEL[t.category] || t.category)}</span><span>/</span><span class="mono">${esc(t.id)}</span></div>
    <div class="phead"><div class="title-row"><div class="stack" style="gap:8px"><div class="row">${idTag(t.id)}<span class="chip">${esc(t.format)}</span><span class="chip">${esc(TPL_CAT_LABEL[t.category] || t.category)}</span>${TPL_NEW.has(t.id) ? '<span class="chip ok">New</span>' : ""}</div><h1>${esc(t.name)}</h1></div>
      <div class="actions"><button class="btn" data-propose="${encodeURIComponent(JSON.stringify({ ...base, path: "purpose", label: `${t.id} ${t.name} · Purpose`, current: t.purpose }))}">${icon("edit", 16)}Propose change</button><button class="btn ghost" id="tpl-copy">${icon("copy", 16)}Copy text</button><button class="btn ghost" data-copylink="template.${attr(t.id)}">${icon("link", 16)}Copy link</button><button class="btn ghost" data-md="template:${attr(t.id)}">${icon("down", 16)}Markdown</button></div></div>
      <p class="lead">${esc(t.purpose)}</p><div><button class="pcount" data-pkey="${attr(propKey(t.id, "purpose"))}" hidden></button></div>
      <div class="meta-grid"><div><span class="eyebrow">Used by</span><span class="v">${esc(t.audience)}</span></div><div><span class="eyebrow">When</span><span class="v">${esc(t.when)}</span></div><div><span class="eyebrow">Owner</span><span class="v">${esc(t.owner)}</span></div>${(t.policies || []).length ? `<div><span class="eyebrow">Policies</span><span class="v row" style="gap:4px">${t.policies.map((x) => POL[x] ? `<a href="#policy.${attr(x)}">${idTag(x)}</a>` : "").join("")}</span></div>` : ""}</div></div>
    <nav class="localnav" aria-label="On this page">${secs.map(([k, l]) => `<a href="#template.${attr(t.id)}" data-jump="sec-${k}">${esc(l)}</a>`).join("")}</nav>
    ${t.format === "letter" ? `<div class="callout info small">Replace everything in [square brackets]. Have Legal approve the final wording for each country before first use; the country notes below list the local changes.</div>` : ""}
    ${t.sections.map((s, si) => `<section class="section" id="sec-s${si}">${sectionHead(esc(s.title))}${s.intro ? `<p class="muted">${esc(s.intro)}</p>` : ""}
      <div class="tpl-sec${s.items.every((it) => it.type === "para") ? " doc" : ""}">${s.items.map((it) => item(s, si, it)).join("")}</div></section>`).join("")}
    <section class="section" id="sec-use">${sectionHead("How to use it")}${bullets(t.notes)}</section>
    <section class="section" id="sec-cn">${sectionHead("Country notes")}${countryTabs("tn", (cid) => `<div class="row propable" style="align-items:flex-start;flex-wrap:nowrap"><p style="flex:1">${esc(t.countryNotes?.[cid] || "No country note yet.")}</p>${pb("countryNotes/" + cid, JMAP[cid].name + " note", t.countryNotes?.[cid] || "")}</div>`)}</section>
    <section class="section" id="sec-used">${sectionHead("Used in")}<div class="stack" style="gap:6px">${used.map((x) => `<div>${linkTo(x)}</div>`).join("") || '<span class="muted small">Not linked to a process yet</span>'}</div></section>
    ${historySection(t.id, "template")}
  </div>`;
  return {
    html, mount(root) {
      bindCountryTabs(root);
      $("#tpl-copy", root).addEventListener("click", () => copyText(templateText(t), "Template text copied"));
      drawHistoryLive(root); onLive(() => drawHistoryLive(root));
    },
  };
}

/* exit survey: interactive */
const SV_LOGIC = {
  q1_1o: (a) => a.q1_1 === "Other (please describe)",
  q1_4a: (a) => a.q1_4 === "Yes",
  q1_6a: (a) => a.q1_6 === "No",
  q1_6b: (a) => (a.q1_6 || "").startsWith("Yes"),
  q2_2: (a) => ["Joining another semiconductor company", "Joining a hyperscaler, cloud or large tech company", "Joining a startup", "Joining a customer or partner of [Company]", "Moving to a different industry", "Starting my own company"].includes(a.q2_1),
  q2_3: (a) => ["Joining another semiconductor company", "Joining a hyperscaler, cloud or large tech company", "Joining a startup", "Joining a customer or partner of [Company]", "Moving to a different industry"].includes(a.q2_1),
  q3_7: (a) => !!a.__newhire,
  q7_1a: (a) => a.q7_1 === "Yes, and I'd like someone to follow up with me",
  q7_1b: (a) => a.q7_1 === "Yes, but I'd prefer to report it anonymously",
};
function viewSurvey(t) {
  const A = { __newhire: false };
  const base = { type: "template", id: t.id, route: "template." + t.id };
  const pb = (path, label, current) => propBtn({ ...base, path, label: `Exit survey · ${label}`, current });
  const qnum = {}; let n = 0; t.sections.forEach((s, si) => { let k = 0; s.items.forEach((it) => { if (it.type === "question") { k++; qnum[it.id] = s.title.match(/^(\d+)\./) ? `${s.title.match(/^(\d+)\./)[1]}.${k}` : `${++n}`; } }); });
  const qText = (it) => it.text + (it.options ? "\nOptions: " + it.options.join(" | ") : "") + (it.rows ? "\nItems: " + it.rows.join(" | ") : "");
  const qHtml = (it, si) => {
    if (it.type === "note") return `<div class="sv-note propable" data-q="${attr(it.id)}" ${it.logic && SV_LOGIC[it.id] && !SV_LOGIC[it.id](A) ? "hidden" : ""}><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span style="flex:1">${esc(it.text)}</span>${pb(`sections/${si}/${it.id}`, "Note: " + it.text.slice(0, 50), it.text)}</div></div>`;
    const name = "sv-" + it.id; let body = "";
    const opts = (type) => `<div class="opts">${it.options.map((o, k) => `<label class="opt"><input type="${type}" name="${name}" value="${attr(o)}" ${A[it.id] === o || (Array.isArray(A[it.id]) && A[it.id].includes(o)) ? "checked" : ""}><span>${esc(o)}</span></label>`).join("")}</div>`;
    if (it.qtype === "single") body = opts("radio");
    else if (it.qtype === "multi") body = opts("checkbox");
    else if (it.qtype === "yesno") { it.options = ["Yes", "No"]; body = opts("radio"); }
    else if (it.qtype === "text") body = `<textarea class="textarea" name="${name}" style="min-height:70px" placeholder="Type your answer">${esc(A[it.id] || "")}</textarea>`;
    else if (it.qtype === "nps") body = `<div class="nps" role="group" aria-label="0 to 10">${Array.from({ length: 11 }, (_, k) => `<button type="button" data-nps="${it.id}" data-v="${k}" aria-pressed="${A[it.id] === k}">${k}</button>`).join("")}</div><div class="nps-labels"><span>Not at all likely</span><span>Extremely likely</span></div>`;
    else if (it.qtype === "likert" || it.qtype === "matrix") {
      const cols = it.qtype === "likert" ? ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree", "N/A"] : it.options;
      body = `<div style="overflow-x:auto"><table class="lik"><thead><tr><th></th>${cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${it.rows.map((r, ri) => `<tr><td>${esc(r)}</td>${cols.map((c) => `<td><input type="radio" name="${name}-${ri}" value="${attr(c)}" aria-label="${attr(r + ": " + c)}"></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    }
    const hidden = SV_LOGIC[it.id] && !SV_LOGIC[it.id](A);
    return `<div class="sv-q propable" data-q="${attr(it.id)}" ${hidden ? "hidden" : ""}><div class="qt"><span><span class="qn">${qnum[it.id] || ""}</span>${esc(it.text)}${it.required ? ' <span class="req">Required</span>' : ""}</span>${pb(`sections/${si}/${it.id}`, `Q${qnum[it.id]}: ${it.text.slice(0, 60)}`, qText(it))}</div>
      ${it.logic ? `<div class="logic-tag">${esc(it.logic)}</div>` : ""}${body}</div>`;
  };
  const questions = t.sections.flatMap((s, si) => s.items.filter((i) => i.type === "question").map((i) => ({ ...i, si, sec: s.title })));
  const ill = t.illustrative;
  const html = `<div class="page">
    <div class="breadcrumb"><a href="#templates">Templates</a><span>/</span><span class="mono">${esc(t.id)}</span></div>
    <div class="phead"><div class="title-row"><div class="stack" style="gap:8px"><div class="row">${idTag(t.id)}<span class="chip">${questions.length} questions</span><span class="chip">10–12 minutes</span></div><h1>Exit survey</h1></div>
      <div class="actions"><button class="btn" data-propose="${encodeURIComponent(JSON.stringify({ ...base, path: "purpose", label: "Exit survey · Purpose & design", current: t.purpose }))}">${icon("edit", 16)}Propose change</button><button class="btn ghost" data-copylink="template.${attr(t.id)}">${icon("link", 16)}Copy link</button><button class="btn ghost" data-md="template:${attr(t.id)}">${icon("down", 16)}Markdown</button></div></div>
      <p class="lead">${esc(t.purpose)}</p>
      <div class="meta-grid"><div><span class="eyebrow">Who gets it</span><span class="v">${esc(t.audience)}</span></div><div><span class="eyebrow">When</span><span class="v">${esc(t.when)}</span></div><div><span class="eyebrow">Owner</span><span class="v">${esc(t.owner)}</span></div>
        <div><span class="eyebrow">Confidentiality</span><span class="v">${esc(t.admin.confidentiality)}</span></div><div><span class="eyebrow">Platform &amp; data</span><span class="v">${esc(t.admin.platform)}</span></div><div><span class="eyebrow">Languages</span><span class="v">${esc(t.admin.languages)}</span></div></div></div>
    <div class="tabs" role="tablist"><button role="tab" aria-selected="true" data-svtab="preview">Preview as a leaver</button><button role="tab" aria-selected="false" data-svtab="design">Question design</button><button role="tab" aria-selected="false" data-svtab="report">How results are reported</button><button role="tab" aria-selected="false" data-svtab="country">Country notes</button></div>
    <div data-svpanel="preview"><div class="row" style="margin-bottom:12px"><label class="opt" style="padding:0"><input type="checkbox" id="sv-newhire"> Simulate a leaver with less than 12 months' tenure</label><span class="small muted">Follow-up questions appear as you answer. Nothing is saved.</span></div>
      <form class="survey" id="survey" onsubmit="return false">${t.sections.map((s, si) => `<section class="sv-sec"><header><h3>${esc(s.title)}</h3>${s.intro ? `<p class="small muted" style="margin-top:4px">${esc(s.intro)}</p>` : ""}</header><div class="sv-body">${s.items.map((it) => qHtml(it, si)).join("")}</div></section>`).join("")}</form></div>
    <div data-svpanel="design" hidden><div class="table-wrap"><table class="t"><thead><tr><th>#</th><th>Question</th><th>Type</th><th>Measures</th><th>Why it's asked</th><th>Logic</th><th></th></tr></thead><tbody>
      ${questions.map((q) => `<tr class="propable"><td class="mono">${esc(qnum[q.id])}</td><td style="min-width:260px">${esc(q.text)}${q.required ? ' <span class="chip bad" style="height:18px">Required</span>' : ""}</td><td class="nowrap mono small">${esc(q.qtype)}</td><td class="small nowrap">${esc(q.driver || "")}</td><td class="small" style="min-width:220px">${esc(q.purpose || "")}</td><td class="small">${esc(q.logic || "")}</td><td>${pb(`sections/${q.si}/${q.id}`, `Q${qnum[q.id]}: ${q.text.slice(0, 60)}`, qText(q))}</td></tr>`).join("")}
      </tbody></table></div><section class="section" style="margin-top:20px">${sectionHead("Design notes")}${bullets(t.notes)}</section></div>
    <div data-svpanel="report" hidden class="stack lg"><div class="callout">${esc(ill.note)}</div>
      <div class="panel stack"><div><h3>Primary reason for leaving</h3><p class="small muted">Pareto view, last 4 quarters, voluntary leavers (n=${ill.reasons.reduce((s, r) => s + r.n, 0)}). Named reasons are sorted by count with “Other” last; the right column is the cumulative share.</p></div><div style="overflow-x:auto">${paretoSvg(ill.reasons)}</div></div>
      <div class="panel stack"><div class="row between"><div><h3>Experience drivers: leavers vs. current employees</h3><p class="small muted">Mean agreement (1–5) for each theme in Section 3. Current employees use the same items in the engagement survey.</p></div>${heatLegend(2.5, 4.2, "2.5", "4.2")}</div>
        <div style="overflow-x:auto"><table class="heat"><thead><tr><th></th>${ill.drivers.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${ill.drivers.rows.map((r) => `<tr><th class="rowh">${esc(r.label)}</th>${r.v.map((v) => { const h = heatColor(v, 2.5, 4.2); return `<td style="background:${h.bg};color:${h.fg}">${v.toFixed(1)}</td>`; }).join("")}</tr>`).join("")}</tbody></table></div>
        <p class="small muted">The gap to read first is regretted leavers against current employees. In this example, Rewards (−0.7) and Growth (−0.8) are the biggest gaps.</p></div>
      <div class="panel stack"><h3>Standard readout</h3>${bullets(["Quarterly to the CHRO staff and business-unit leaders: attrition rate, regretted share, primary and contributing reasons, driver gaps, top text themes.", "Twice a year to the Compensation Committee (or Board) as part of the human capital review: regretted attrition in critical engineering roles, destination mix and competitive gap.", "Per manager only when there are 10+ responses over 4 rolling quarters; below that, roll up to the department.", "Section 7 escalations are reported by count and time to first contact only. Their content stays in ER case management."])}</div></div>
    <div data-svpanel="country" hidden>${countryTabs("sv", (cid) => `<div class="row propable" style="align-items:flex-start;flex-wrap:nowrap"><p style="flex:1">${esc(t.countryNotes[cid])}</p>${pb("countryNotes/" + cid, JMAP[cid].name + " note", t.countryNotes[cid])}</div>`)}</div>
  </div>`;
  return {
    html, mount(root) {
      bindCountryTabs(root);
      root.querySelector(".tabs").addEventListener("click", (e) => { const b = e.target.closest("[data-svtab]"); if (!b) return; $$("[data-svtab]", root).forEach((x) => x.setAttribute("aria-selected", x === b)); $$("[data-svpanel]", root).forEach((p) => (p.hidden = p.dataset.svpanel !== b.dataset.svtab)); });
      const form = $("#survey", root);
      const applyLogic = () => $$("[data-q]", form).forEach((el) => { const f = SV_LOGIC[el.dataset.q]; if (f) el.hidden = !f(A); });
      form.addEventListener("change", (e) => {
        const inp = e.target; const qid = inp.name?.replace(/^sv-/, "").replace(/-\d+$/, ""); if (!qid) return;
        if (inp.type === "checkbox") {
          const q = questions.find((x) => x.id === qid); const boxes = $$(`input[name="${inp.name}"]:checked`, form);
          if (q?.max && boxes.length > q.max) { inp.checked = false; toast(`Choose up to ${q.max}`); return; }
          A[qid] = boxes.map((b) => b.value);
        } else A[qid] = inp.value;
        applyLogic();
      });
      form.addEventListener("click", (e) => { const b = e.target.closest("[data-nps]"); if (!b) return; A[b.dataset.nps] = +b.dataset.v; $$(`[data-nps="${b.dataset.nps}"]`, form).forEach((x) => x.setAttribute("aria-pressed", x === b)); });
      $("#sv-newhire", root).addEventListener("change", (e) => { A.__newhire = e.target.checked; applyLogic(); });
    },
  };
}
