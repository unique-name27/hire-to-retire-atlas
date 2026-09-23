/* ===== visualizations ===== */
function wrapText(s, max, maxLines = 3) {
  const words = String(s).split(/\s+/); const lines = []; let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length <= max) cur = (cur + " " + w).trim();
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const k = lines.slice(0, maxLines); k[maxLines - 1] = k[maxLines - 1].replace(/.{0,2}$/, "") + "…"; return k; }
  return lines;
}

/* ---------- swimlane flowchart ---------- */
function swimlaneSvg(p) {
  const lanes = p.lanes, steps = p.steps;
  const LANE_W = 124, COL_W = 178, NODE_W = 146, NODE_H = 62, LANE_H = 100, GAP = COL_W - NODE_W, X0 = LANE_W + 18;
  const idx = Object.fromEntries(steps.map((s, i) => [s.id, i]));
  const outs = (s) => s.type === "decision" ? (s.branches || []).map((b) => ({ to: b.to, label: b.label })) : (s.next || []).map((t) => ({ to: t }));
  const preds = {};
  steps.forEach((s) => outs(s).forEach((e) => { if (idx[e.to] > idx[s.id]) (preds[e.to] = preds[e.to] || []).push(s.id); }));
  const rank = {}, occ = new Set();
  steps.forEach((s, i) => {
    let r = 0; const pr = preds[s.id] || [];
    pr.forEach((u) => (r = Math.max(r, rank[u] + 1)));
    if (i > 0 && !pr.length) r = rank[steps[i - 1].id] + 1;
    while (occ.has(s.lane + "|" + r)) r++;
    rank[s.id] = r; occ.add(s.lane + "|" + r);
  });
  const maxR = Math.max(...Object.values(rank));
  const W = X0 + (maxR + 1) * COL_W + 10, H = lanes.length * LANE_H + 2;
  const li = (l) => Math.max(0, lanes.indexOf(l));
  const nx = (s) => X0 + rank[s.id] * COL_W, ny = (s) => li(s.lane) * LANE_H + (LANE_H - NODE_H) / 2;
  const cx = (s) => nx(s) + NODE_W / 2, cy = (s) => ny(s) + NODE_H / 2;
  const laneTop = (l) => l * LANE_H, laneBot = (l) => (l + 1) * LANE_H;
  const S = Object.fromEntries(steps.map((s) => [s.id, s]));
  let g = "";
  // lanes
  lanes.forEach((l, i) => {
    const y = i * LANE_H;
    g += `<rect x="0" y="${y}" width="${W}" height="${LANE_H}" fill="${i % 2 ? "var(--surface-2)" : "var(--surface)"}"/>`;
    g += `<line x1="0" x2="${W}" y1="${y + LANE_H}" y2="${y + LANE_H}" stroke="var(--line-2)"/>`;
    g += `<rect x="0" y="${y}" width="${LANE_W}" height="${LANE_H}" fill="var(--lane-bg)"/>`;
    const lines = wrapText(l, 14, 2);
    lines.forEach((t, k) => (g += `<text x="12" y="${y + LANE_H / 2 + (k - (lines.length - 1) / 2) * 15 + 4}" font-size="12.5" font-weight="600" fill="var(--ink-2)" font-family="var(--f-ui)">${esc(t)}</text>`));
  });
  g += `<line x1="${LANE_W}" x2="${LANE_W}" y1="0" y2="${H}" stroke="var(--line)"/>`;
  // edges
  let eg = "", lg = "";
  steps.forEach((s) => {
    const os = outs(s);
    os.forEach((e, k) => {
      const t = S[e.to]; if (!t) return;
      const back = rank[t.id] < rank[s.id] || (rank[t.id] === rank[s.id] && idx[t.id] < idx[s.id]);
      let pts, lx, ly, anchor = "start";
      const su = li(s.lane), tu = li(t.lane);
      if (back) {
        const ch = laneBot(Math.max(su, tu)) - 7;
        pts = [[cx(s) + (k ? 10 : 0), ny(s) + NODE_H], [cx(s) + (k ? 10 : 0), ch], [cx(t) - 12, ch], [cx(t) - 12, ny(t) + NODE_H]];
        lx = cx(s) + 14 + (k ? 10 : 0); ly = ny(s) + NODE_H + 14;
      } else if (rank[t.id] === rank[s.id]) {
        const down = tu > su;
        pts = [[cx(s), down ? ny(s) + NODE_H : ny(s)], [cx(t), down ? ny(t) : ny(t) + NODE_H]];
        lx = cx(s) + 6; ly = down ? ny(s) + NODE_H + 14 : ny(s) - 6;
      } else {
        const tx = nx(t), ty = cy(t), gx = tx - GAP / 2;
        const altExit = s.type === "decision" && k > 0;
        const adjacent = rank[t.id] - rank[s.id] === 1;
        if (!altExit) {
          if (adjacent || su === tu && !steps.some((o) => o.lane === s.lane && rank[o.id] > rank[s.id] && rank[o.id] < rank[t.id])) {
            pts = [[nx(s) + NODE_W, cy(s)], [gx, cy(s)], [gx, ty], [tx, ty]];
          } else {
            const ch = tu >= su ? laneBot(su) - 7 : laneTop(su) + 7;
            pts = [[nx(s) + NODE_W, cy(s)], [nx(s) + NODE_W + GAP / 2, cy(s)], [nx(s) + NODE_W + GAP / 2, ch], [gx, ch], [gx, ty], [tx, ty]];
          }
          lx = nx(s) + NODE_W + 3; ly = cy(s) - 6;
        } else {
          const downward = tu >= su;
          const ex = cx(s), ey = downward ? ny(s) + NODE_H : ny(s);
          const ch = downward ? laneBot(su) - 7 : laneTop(su) + 7;
          if (tu !== su && adjacent) pts = [[ex, ey], [ex, ty], [tx, ty]];
          else pts = [[ex, ey], [ex, ch], [gx, ch], [gx, ty], [tx, ty]];
          lx = ex + 5; ly = downward ? ey + 13 : ey - 5;
        }
      }
      const d = "M" + pts.map((p) => p.map((v) => Math.round(v)).join(",")).join(" L");
      eg += `<path d="${d}" fill="none" stroke="${back ? "var(--faint)" : "var(--muted)"}" stroke-width="1.4" ${back ? 'stroke-dasharray="4 3"' : ""} marker-end="url(#arr)"/>`;
      if (e.label) {
        const txt = e.label.length > 18 ? e.label.slice(0, 17) + "…" : e.label;
        const w = txt.length * 6.1 + 8;
        const x = anchor === "start" ? lx : lx - w;
        lg += `<g><title>${esc(e.label)}</title><rect x="${x - 2}" y="${ly - 10}" width="${w}" height="14" rx="3" fill="var(--surface)" stroke="var(--line)" stroke-width=".8"/><text x="${x + 2}" y="${ly + 1}" font-size="10.5" fill="var(--ink-2)" font-family="var(--f-ui)">${esc(txt)}</text></g>`;
      }
    });
  });
  // nodes
  let ng = "";
  steps.forEach((s, i) => {
    const x = nx(s), y = ny(s);
    const lines = wrapText(s.label, s.type === "task" ? 21 : 17, 3);
    let shape, fg = "var(--ink)";
    if (s.type === "start") { shape = `<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="${NODE_H / 2}" fill="var(--accent)" stroke="var(--accent)"/>`; fg = "var(--accent-ink)"; }
    else if (s.type === "end") { shape = `<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="${NODE_H / 2}" fill="var(--ink-2)" stroke="var(--ink-2)"/>`; fg = "var(--surface)"; }
    else if (s.type === "decision") {
      const m = 14; shape = `<polygon points="${x},${y + NODE_H / 2} ${x + m},${y} ${x + NODE_W - m},${y} ${x + NODE_W},${y + NODE_H / 2} ${x + NODE_W - m},${y + NODE_H} ${x + m},${y + NODE_H}" fill="var(--amber-soft)" stroke="var(--amber)" stroke-width="1.3"/>`;
    } else {
      shape = `<rect x="${x}" y="${y}" width="${NODE_W}" height="${NODE_H}" rx="5" fill="var(--surface)" stroke="var(--faint)" stroke-width="1"/>`;
    }
    const tl = lines.map((t, k) => `<text x="${x + NODE_W / 2}" y="${y + NODE_H / 2 + (k - (lines.length - 1) / 2) * 14 + 4}" text-anchor="middle" font-size="11.5" fill="${fg}" font-family="var(--f-ui)" font-weight="${s.type === "task" ? 500 : 600}">${esc(t)}</text>`).join("");
    const num = `<circle cx="${x + 2}" cy="${y + 2}" r="9" fill="var(--surface)" stroke="var(--line)"/><text x="${x + 2}" y="${y + 5.5}" text-anchor="middle" font-size="9.5" font-family="var(--f-ui)" fill="var(--ink-2)">${i + 1}</text>`;
    ng += `<g class="fnode" data-step="${attr(s.id)}" tabindex="0" role="button" aria-label="Step ${i + 1}: ${attr(s.label)} (${attr(s.lane)})"><title>${esc(s.label)} — ${esc(s.lane)}${s.sla ? " · " + esc(s.sla) : ""}</title>${shape}${tl}${num}</g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Swimlane flowchart for ${attr(p.name)}">
    <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--muted)"/></marker></defs>
    ${g}${eg}${ng}${lg}</svg>`;
}

/* ---------- wafer map ---------- */
const TYPE_COLORS = {
  Policy: "hsl(212 45% 45%)", Process: "hsl(172 40% 38%)", Program: "hsl(140 30% 45%)", Notice: "hsl(205 15% 60%)",
  Filing: "hsl(38 65% 52%)", Training: "hsl(270 25% 58%)", Control: "hsl(350 40% 52%)", Committee: "hsl(22 45% 52%)", Record: "hsl(55 18% 50%)",
};
let WAFER_CACHE = null;
function waferGeometry(N) {
  if (WAFER_CACHE && WAFER_CACHE.N === N) return WAFER_CACHE;
  let R = 6, full, partial;
  for (; ; R += 0.2) {
    full = []; partial = [];
    const k = Math.ceil(R) + 1;
    for (let gy = -k; gy < k; gy++) for (let gx = -k; gx < k; gx++) {
      const c = [[gx, gy], [gx + 1, gy], [gx, gy + 1], [gx + 1, gy + 1]].filter(([x, y]) => x * x + y * y <= R * R).length;
      if (c === 4) full.push([gx, gy]); else if (c > 0) partial.push([gx, gy]);
    }
    if (full.length >= N * 1.04) break;
  }
  full.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  WAFER_CACHE = { N, R, full, partial };
  return WAFER_CACHE;
}
function waferColor(it, mode) {
  if (mode === "status") return STATUS[itemStatus(it.id)].color;
  if (mode === "type") return TYPE_COLORS[it.type] || "var(--faint)";
  return TIERS[it.tier]?.color || "var(--faint)";
}
function waferSvg(items, mode) {
  const { R, full, partial } = waferGeometry(items.length);
  const S = 20, pad = 14, rr = (R + 0.5) * S, size = rr * 2 + pad * 2, c = size / 2;
  const X = (gx) => c + gx * S, Y = (gy) => c + gy * S;
  let d = "";
  partial.forEach(([gx, gy]) => (d += `<rect x="${X(gx) + 1}" y="${Y(gy) + 1}" width="${S - 2}" height="${S - 2}" rx="1.5" fill="var(--line)" opacity=".45"/>`));
  full.forEach(([gx, gy], i) => {
    const it = items[i];
    if (!it) { d += `<rect x="${X(gx) + 1}" y="${Y(gy) + 1}" width="${S - 2}" height="${S - 2}" rx="1.5" fill="var(--line)" opacity=".55"/>`; return; }
    d += `<rect class="die" data-item="${attr(it.id)}" x="${X(gx) + 1}" y="${Y(gy) + 1}" width="${S - 2}" height="${S - 2}" rx="1.5" fill="${waferColor(it, mode)}"/>`;
  });
  const notchY = c + rr;
  return `<svg viewBox="0 0 ${size} ${size}" role="img" aria-label="Coverage wafer: ${items.length} policies, processes and obligations">
    <defs><clipPath id="wclip"><circle cx="${c}" cy="${c}" r="${rr}"/></clipPath>
    <radialGradient id="wgrad" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="var(--surface)"/><stop offset="1" stop-color="var(--sunken)"/></radialGradient></defs>
    <circle cx="${c}" cy="${c}" r="${rr + 4}" fill="url(#wgrad)" stroke="var(--line)" stroke-width="1.5"/>
    <g clip-path="url(#wclip)">${d}</g>
    <path d="M${c - 9},${notchY + 4.5} L${c},${notchY - 5} L${c + 9},${notchY + 4.5} Z" fill="var(--bg)" stroke="var(--line)" stroke-width="1.2"/>
  </svg>`;
}
function waferLegend(mode) {
  let entries;
  if (mode === "status") entries = Object.entries(STATUS).map(([k, v]) => [v.label, v.color, ITEMS.filter((i) => itemStatus(i.id) === k).length]);
  else if (mode === "type") entries = Object.entries(TYPE_COLORS).map(([k, v]) => [k, v, ITEMS.filter((i) => i.type === k).length]).filter((e) => e[2]);
  else entries = Object.entries(TIERS).map(([k, v]) => [v.label, v.color, ITEMS.filter((i) => i.tier === k).length]);
  return entries.map(([l, c, n]) => `<span><i style="background:${c}"></i>${esc(l)} <span class="muted num">${n}</span></span>`).join("");
}
function bindWafer(root, onClick) {
  const tip = $("#tooltip");
  root.addEventListener("mousemove", (e) => {
    const d = e.target.closest(".die"); if (!d) { tip.hidden = true; return; }
    const it = ITEM[d.dataset.item]; if (!it) return;
    tip.innerHTML = `<b>${esc(it.name)}</b><span class="mono">${esc(it.id)}</span> · ${esc(it.type)} · ${esc(STAGE[it.domain]?.label || it.domain)}<br>${esc(TIERS[it.tier]?.label || "")} · ${esc(STATUS[itemStatus(it.id)].label)}`;
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, innerWidth - 320), y = Math.min(e.clientY + 14, innerHeight - 90);
    tip.style.left = x + "px"; tip.style.top = y + "px";
  });
  root.addEventListener("mouseleave", () => (tip.hidden = true));
  root.addEventListener("click", (e) => { const d = e.target.closest(".die"); if (d) { tip.hidden = true; onClick(d.dataset.item); } });
}

/* ---------- lifecycle (transit-map) ---------- */
function lifecycleSvg() {
  const count = (k) => ({ proc: DB.processes.filter((p) => p.stage === k).length, pol: DB.policies.filter((p) => p.domain === k).length, reg: DB.register.filter((r) => r.domain === k).length });
  const lines = [
    { name: "Employee journey", color: "var(--accent)", y: 66, keys: ["Plan", "Recruit", "Onboard", "Grow", "Move", "Offboard"] },
    { name: "Always on while employed", color: "var(--ink-2)", y: 184, keys: ["Pay", "Reward", "Equity", "Benefits", "Leave", "Engage"] },
    { name: "Foundations", color: "var(--faint)", y: 302, keys: ["Relations", "Safety", "Data", "Governance"] },
  ];
  const W = 1040, X0 = 112, X1 = W - 112;
  const SHORT = { Move: "Mobility & changes", Engage: "Engagement", Relations: "Employee relations", Data: "HR data & systems", Safety: "Health & safety", Governance: "Corporate governance", Leave: "Leave & accommodation" };
  let s = "";
  lines.forEach((ln) => {
    const n = ln.keys.length, step = (X1 - X0) / (n - 1);
    s += `<text x="16" y="${ln.y - 26}" font-size="11.5" font-weight="600" fill="var(--muted)" font-family="var(--f-ui)" letter-spacing=".05em">${esc(ln.name.toUpperCase())}</text>`;
    s += `<line x1="${X0}" x2="${X1}" y1="${ln.y}" y2="${ln.y}" stroke="${ln.color}" stroke-width="3" stroke-linecap="round"/>`;
    ln.keys.forEach((k, i) => {
      const x = X0 + i * step; const c = count(k); const tot = c.proc + c.pol + c.reg;
      const sub = [c.proc && `${c.proc} proc`, c.pol && `${c.pol} pol`, c.reg && `${c.reg} req`].filter(Boolean).join(" · ");
      s += `<g class="lm-station" data-stage="${k}" tabindex="0" role="link" aria-label="${attr(STAGE[k].label)}: ${tot} items">
        <circle class="lm-dot" cx="${x}" cy="${ln.y}" r="14" fill="var(--surface)" stroke="${ln.color}" stroke-width="2"/>
        <text x="${x}" y="${ln.y + 4.5}" text-anchor="middle" font-size="12" font-weight="600" font-family="var(--f-ui)" fill="var(--ink)">${tot}</text>
        <text x="${x}" y="${ln.y + 36}" text-anchor="middle" font-size="13" font-weight="600" fill="var(--ink)" font-family="var(--f-ui)">${esc(SHORT[k] || STAGE[k].label)}</text>
        <text x="${x}" y="${ln.y + 52}" text-anchor="middle" font-size="12" fill="var(--muted)" font-family="var(--f-ui)">${esc(sub)}</text></g>`;
    });
  });
  // interchange connectors: Onboard -> always-on start, always-on end -> Offboard
  const j = lines[0], a = lines[1];
  const jx = (i) => X0 + i * ((X1 - X0) / 5);
  s = `<path d="M${jx(2)},${j.y + 60} L${jx(2)},${a.y - 26}" stroke="var(--line)" stroke-width="2" stroke-dasharray="3 4" fill="none"/>` + s;
  return `<svg viewBox="0 0 ${W} 372" role="img" aria-label="Hire-to-retire map of HR domains">${s}</svg>`;
}

/* ---------- small charts ---------- */
function paretoSvg(rows) {
  const W = 720, H = 280, L = 200, R = 96, T = 16, B = 26;
  const data = [...rows].sort((a, b) => (a.label === "Other") - (b.label === "Other") || b.n - a.n); const total = data.reduce((s, r) => s + r.n, 0);
  const max = Math.ceil(Math.max(...data.map((r) => r.n)) / 10) * 10; const bh = (H - T - B) / data.length;
  const x = (v) => L + (v / max) * (W - L - R);
  let cum = 0, s = "", pts = [];
  for (let v = 0; v <= max; v += 10) { const gx = x(v); s += `<line class="grid" x1="${gx}" x2="${gx}" y1="${T}" y2="${H - B}"/><text x="${gx}" y="${H - 8}" text-anchor="middle">${v}</text>`; }
  data.forEach((r, i) => {
    const y = T + i * bh; cum += r.n;
    s += `<text x="${L - 8}" y="${y + bh / 2 + 4}" text-anchor="end">${esc(r.label)}</text>`;
    s += `<rect x="${L}" y="${y + 3}" width="${x(r.n) - L}" height="${bh - 6}" rx="2" fill="var(--accent)"/>`;
    s += `<text x="${x(r.n) + 4}" y="${y + bh / 2 + 4}" style="font-family:var(--f-ui)">${r.n}</text>`;
    pts.push([W - 30, y + bh / 2, Math.round((cum / total) * 100)]);
  });
  s += pts.map(([px, py, pc]) => `<text x="${px}" y="${py + 4}" text-anchor="middle" style="font-family:var(--f-ui);fill:var(--muted)">${pc}%</text>`).join("");
  s += `<text x="${W - 30}" y="${T - 4}" text-anchor="middle" style="fill:var(--muted);font-size:10px">cum.</text>`;
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:760px;height:auto;min-width:560px" role="img" aria-label="Primary reasons for leaving, illustrative">${s}</svg>`;
}
function heatColor(v, lo = 1, hi = 5) {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo))); const k = Math.min(4, Math.floor(t * 5));
  return { bg: `var(--h${k + 1})`, fg: k >= 3 ? "var(--h-ink-light)" : "var(--h-ink-dark)" };
}
function heatLegend(lo, hi, loLabel, hiLabel) {
  return `<div class="heat-legend"><span>${esc(loLabel || lo)}</span>${[1, 2, 3, 4, 5].map((k) => `<i style="background:var(--h${k})"></i>`).join("")}<span>${esc(hiLabel || hi)}</span></div>`;
}

/* SVG presentation attributes don't reliably resolve var(); move them into style */
function cssify(svg) {
  return svg.replace(/<([a-zA-Z]+)([^<>]*?)(\/?)>/g, (m, tag, attrs, sl) => {
    if (!/var\(/.test(attrs)) return m;
    let style = "";
    attrs = attrs.replace(/\s(fill|stroke|font-family|stop-color)="([^"]*var\([^"]*)"/g, (mm, k, v) => { style += `${k}:${v};`; return ""; });
    if (!style) return m;
    if (/\sstyle="/.test(attrs)) attrs = attrs.replace(/\sstyle="/, ` style="${style}`); else attrs += ` style="${style}"`;
    return `<${tag}${attrs}${sl}>`;
  });
}
{ const _s = swimlaneSvg, _w = waferSvg, _l = lifecycleSvg, _p = paretoSvg;
  swimlaneSvg = (...a) => cssify(_s(...a)); waferSvg = (...a) => cssify(_w(...a)); lifecycleSvg = (...a) => cssify(_l(...a)); paretoSvg = (...a) => cssify(_p(...a)); }
