/* Scene builders. Each takes (root, scene, index, timeline) and registers tweens with absolute times. */
"use strict";
/* class intervals and timed content, evaluated each frame */
const CLS = new Map();   // key -> {el, name, iv: [[t0,t1]]}
function cls(el, name, t0, t1 = 1e9) { const k = el; if (!CLS.has(k)) CLS.set(k, {}); const m = CLS.get(k); (m[name] = m[name] || []).push([t0, t1]); }
const CONTENT = new Map(); // el -> [[t, html]] (initial html at -inf)
function contentAt(el, t, html) { if (!CONTENT.has(el)) CONTENT.set(el, [[-1e9, el.innerHTML]]); CONTENT.get(el).push([t, html]); CONTENT.get(el).sort((a, b) => a[0] - b[0]); }
HOOKS.push((t) => {
  for (const [el, m] of CLS) for (const name in m) el.classList.toggle(name, m[name].some(([a, b]) => t >= a && t < b));
  for (const [el, list] of CONTENT) { let cur = list[0][1]; for (const [k, v] of list) if (k <= t) cur = v; if (el._html !== cur) { el.innerHTML = cur; el._html = cur; } }
});
const sceneCss = document.createElement("style");
sceneCss.textContent = `
.title-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:26px}
.kicker{font-size:30px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#fff;background:var(--coral);padding:10px 26px;border-radius:999px}
.big-title{font-size:104px;font-weight:800;letter-spacing:-.035em;line-height:1.02;max-width:1500px}
.big-title span{display:inline-block;margin:0 .14em}
.sub{font-size:40px;color:var(--muted);font-weight:500;max-width:1250px;line-height:1.3}
.deco{position:absolute;border-radius:50%}
.nums{display:flex;gap:34px}
.num{flex:1;padding:40px 34px 36px;position:relative;overflow:hidden}
.num b{display:block;font-size:132px;font-weight:800;letter-spacing:-.04em;line-height:1}
.num span{display:block;font-size:36px;font-weight:600;color:var(--ink2);margin-top:12px}
.num .band{position:absolute;left:0;right:0;top:0;height:14px}
.steps{display:grid;gap:28px}
.stepc{padding:30px 30px 32px;display:flex;flex-direction:column;gap:14px;transition:none;border-width:3px}
.stepc .n{width:68px;height:68px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:34px;font-weight:800}
.stepc .tt{font-size:38px;font-weight:800;letter-spacing:-.01em;line-height:1.15}
.stepc .dd{font-size:28px;color:var(--muted);line-height:1.3;font-weight:500}
.stepc.cur{border-color:var(--ink);box-shadow:0 24px 50px -24px rgba(40,30,10,.5)}
.gantt{position:relative;padding:26px 30px 30px}
.gantt .row{display:flex;align-items:center;height:76px}
.gantt .lab{width:400px;font-size:30px;font-weight:700;padding-right:20px;line-height:1.15}
.gantt .track{position:relative;flex:1;height:100%}
.gantt .bar{position:absolute;top:14px;height:48px;border-radius:24px;display:flex;align-items:center;padding:0 18px;color:#fff;font-size:22px;font-weight:700;white-space:nowrap;overflow:hidden}
.gantt .axis{display:flex;margin-left:400px;border-bottom:2px solid var(--line);position:relative;height:44px}
.gantt .axis span{position:absolute;bottom:8px;font-size:21px;color:var(--muted);font-weight:700;transform:translateX(-50%)}
.gantt .mk{position:absolute;top:0;bottom:0;width:0;border-left:3px dashed var(--ink2)}
.gantt .mk em{position:absolute;bottom:-46px;left:0;transform:translateX(-50%);font-style:normal;font-size:22px;font-weight:800;background:var(--ink);color:#fff;padding:4px 12px;border-radius:10px;white-space:nowrap}
.lanes{position:relative}
.lane{position:absolute;left:0;right:0;border-top:2px dashed var(--line)}
.lane .ln{position:absolute;left:18px;top:50%;transform:translateY(-50%);font-size:26px;font-weight:800;color:var(--ink2);width:190px;line-height:1.1}
.node{position:absolute;display:grid;place-items:center;text-align:center;font-size:21px;font-weight:700;line-height:1.18;padding:8px 12px;color:var(--ink);background:#fff;border:3px solid var(--ink2);border-radius:18px}
.node.start{background:var(--accent);color:#fff;border-color:var(--accent);border-radius:48px}
.node.end{background:var(--ink);color:#fff;border-color:var(--ink);border-radius:48px}
.node.decision{background:var(--amber-soft);border-color:var(--amber);border-radius:22px}
.node.decision::before{content:"?";position:absolute;top:-16px;right:-14px;width:34px;height:34px;border-radius:50%;background:var(--amber);color:#fff;font-size:22px;display:grid;place-items:center}
.chainrow{position:relative;height:420px}
.cnode{position:absolute;width:112px;height:112px;border-radius:50%;background:#fff;border:5px solid #cfc6b6;display:grid;place-items:center;font-size:40px;font-weight:800;color:var(--ink2)}
.cnode .ic{position:absolute;inset:22px;opacity:0}
.cnode.cur{border-color:var(--accent);box-shadow:0 0 0 12px rgba(47,91,211,.15)}
.cnode.ok{background:var(--green);border-color:var(--green);color:transparent}.cnode.ok .ic.okc{opacity:1}
.cnode.bad{background:var(--red);border-color:var(--red);color:transparent}.cnode.bad .ic.badc{opacity:1}
.clab{position:absolute;text-align:center;font-size:25px;font-weight:800;line-height:1.15}
.clab small{display:block;font-size:21px;font-weight:600;color:var(--muted);margin-top:6px}
.cline{position:absolute;height:10px;border-radius:5px}
.token{position:absolute;width:74px;height:90px;border-radius:12px;background:#fff;border:3px solid var(--ink);box-shadow:0 10px 20px -10px rgba(0,0,0,.4)}
.token i{position:absolute;left:14px;right:14px;height:6px;border-radius:3px;background:#d6cfc2}
.stamp{position:absolute;font-size:64px;font-weight:800;letter-spacing:.08em;color:var(--green);border:7px solid var(--green);padding:6px 26px;border-radius:18px;background:rgba(255,255,255,.85)}
.regions{display:flex;gap:30px;align-items:stretch}
.region{padding:24px 24px 28px}
.region h4{margin:0 0 18px;font-size:26px;font-weight:800;color:var(--muted);letter-spacing:.08em;text-transform:uppercase}
.tiles{display:flex;flex-wrap:wrap;gap:16px}
.tile{width:142px;height:118px;border-radius:20px;background:#f3eee5;border:3px solid transparent;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.tile b{font-size:40px;font-weight:800;letter-spacing:-.01em}
.tile span{font-size:19px;font-weight:700;color:var(--muted)}
.tile.g0{background:var(--coral);color:#fff}.tile.g1{background:var(--accent);color:#fff}.tile.g2{background:var(--teal);color:#fff}
.tile.g0 span,.tile.g1 span,.tile.g2 span{color:rgba(255,255,255,.9)}
.legend{display:flex;gap:18px;margin-top:28px;flex-wrap:wrap}
.legend .lg{display:flex;align-items:center;gap:12px;font-size:28px;font-weight:700;background:#fff;border:2px solid var(--line);border-radius:999px;padding:10px 22px}
.legend .lg i{width:22px;height:22px;border-radius:50%}
.note{margin-top:22px;font-size:26px;color:var(--muted);font-weight:600}
.clist{padding:20px 40px;max-width:1300px}
.citem{display:flex;align-items:center;gap:26px;padding:22px 0;border-top:2px solid var(--line2);font-size:36px;font-weight:700;color:#b5ad9e}
.citem:first-child{border-top:0}
.citem .box{width:56px;height:56px;border-radius:14px;border:4px solid #cfc6b6;flex:none;position:relative;background:#fff}
.citem.done{color:var(--ink)}.citem.done .box{background:var(--green);border-color:var(--green)}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:40px}
.vcol{overflow:hidden}
.vcol h3{margin:0;padding:24px 34px;font-size:36px;font-weight:800;display:flex;align-items:center;gap:16px}
.vcol h3 i{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;padding:8px}
.vrow{display:flex;gap:18px;align-items:center;padding:22px 34px;border-top:2px solid var(--line2);font-size:34px;font-weight:700}
.vrow i{width:42px;height:42px;flex:none;border-radius:50%;padding:8px;display:grid;place-items:center}
.callout{position:absolute;left:330px;top:70px;width:1260px;min-height:420px;padding:60px 70px;display:flex;flex-direction:column;gap:30px;justify-content:center}
.callout .lbl{align-self:flex-start;font-size:28px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;background:var(--amber);color:#fff;padding:10px 24px;border-radius:999px}
.callout .txt{font-size:66px;font-weight:800;letter-spacing:-.025em;line-height:1.12}
.callout svg.sw{position:absolute;left:70px;bottom:44px}
.outro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;text-align:center}
.outro .t{font-size:86px;font-weight:800;letter-spacing:-.03em;line-height:1.05;max-width:1450px}
.outro .next{display:flex;align-items:center;gap:22px;padding:22px 34px;font-size:36px;font-weight:800}
.outro .next .play{width:62px;height:62px;border-radius:50%;background:var(--coral);display:grid;place-items:center}
.outro .where{font-size:32px;color:var(--muted);font-weight:600}
.confetti{position:absolute;width:16px;height:26px;border-radius:4px}
`;
document.head.appendChild(sceneCss);

const S = {};

S.title = (root, sc) => {
  const p = sc.params, t = sc.start;
  const w = h("div", "title-wrap", null, root);
  const k = h("div", "kicker will", esc(p.kicker), w); popIn(k, t + 0.25);
  const ti = h("div", "big-title", null, w);
  p.title.split(" ").forEach((word, i) => { const s = h("span", "will", esc(word), ti); slideIn(s, t + 0.45 + i * 0.07, 60, 0.6); });
  const sub = h("div", "sub will", esc(p.subtitle), w); slideIn(sub, t + 0.9, 30);
  const deco = [["var(--amber)", 70, 230, 120], ["var(--teal)", 40, 1430, 90], ["var(--violet)", 56, 1500, 520], ["var(--coral)", 34, 170, 520], ["var(--accent)", 24, 380, 40]];
  deco.forEach(([c, size, x, y], i) => {
    const d = h("div", "deco will", null, root); Object.assign(d.style, { width: size + "px", height: size + "px", left: x + "px", top: y + "px", background: i % 2 ? "transparent" : c, border: i % 2 ? `8px solid ${c}` : "0" });
    popIn(d, t + 0.5 + i * 0.1, 0.7);
    HOOKS.push((tt) => { if (tt > t && tt < sc.end + 0.5) d.style.translate = `0 ${(Math.sin(tt * 1.3 + i) * 12).toFixed(1)}px`; });
  });
  sfx(t + 0.25, "sting");
};

S.bigNumbers = (root, sc) => {
  const p = sc.params;
  heading(root, p.title, sc.start + 0.15);
  const row = h("div", "nums", null, root);
  const times = revealTimes(sc, p.items.length, 0.45);
  p.items.forEach((it, i) => {
    const c = h("div", "card num will", `<div class="band" style="background:${COLORS[i % 6]}"></div><b style="color:${COLORS[i % 6]}">0</b><span>${esc(it.label)}</span>`, row);
    popIn(c, times[i]); sfx(times[i], "pop");
    const b = $("b", c), t0 = times[i] + 0.1;
    HOOKS.push((t) => { const v = Math.round(it.value * E.out(clamp((t - t0) / 1.1))); if (b._v !== v) { b.textContent = v; b._v = v; } });
  });
};

S.steps = (root, sc) => {
  const p = sc.params, n = p.steps.length;
  heading(root, p.title, sc.start + 0.15);
  const g = h("div", "steps", null, root);
  const cols = n <= 4 ? n : 3;
  g.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  const times = revealTimes(sc, n, 0.3);
  const cards = p.steps.map((s, i) => {
    const c = h("div", "card stepc will", `<div class="n" style="background:${COLORS[i % 6]}">${i + 1}</div><div class="tt">${esc(s.title)}</div><div class="dd">${esc(s.detail || "")}</div>`, g);
    if (n > 3) { $(".tt", c).style.fontSize = "34px"; $(".dd", c).style.fontSize = "26px"; c.style.padding = "26px 26px 28px"; }
    popIn(c, times[i]); sfx(times[i], "pop");
    return c;
  });
  cards.forEach((c, i) => cls(c, "cur", times[i] + 0.2, i < n - 1 ? times[i + 1] + 0.2 : sc.end));
};

S.timeline = (root, sc) => {
  const p = sc.params;
  heading(root, p.title, sc.start + 0.15);
  const card = h("div", "card gantt will", null, root); slideIn(card, sc.start + 0.3, 40);
  const ds = (s) => new Date(s + "T00:00:00Z").getTime();
  const all = p.bars.flatMap((b) => [ds(b.start), ds(b.end)]).concat((p.markers || []).map((m) => ds(m.date)));
  const d0 = new Date(Math.min(...all)); d0.setUTCDate(1);
  const d1 = new Date(Math.max(...all)); d1.setUTCMonth(d1.getUTCMonth() + 1, 1);
  const W = (root.offsetWidth || 1700) - 60 - 400;
  const X = (ms) => ((ms - d0) / (d1 - d0)) * W;
  const axis = h("div", "axis", null, card);
  const months = []; for (let d = new Date(d0); d < d1; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(new Date(d));
  const step = months.length > 14 ? 3 : months.length > 8 ? 2 : 1;
  months.forEach((m, i) => { if (i % step) return; const s = h("span", null, m.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) + (m.getUTCMonth() === 0 || i === 0 ? " " + String(m.getUTCFullYear()).slice(2).padStart(3, "’") : ""), axis); s.style.left = (X(m.getTime()) + 0) + "px"; });
  const times = revealTimes(sc, p.bars.length, 0.45);
  p.bars.forEach((b, i) => {
    const r = h("div", "row", `<div class="lab">${esc(b.label)}</div><div class="track"></div>`, card);
    slideIn($(".lab", r), times[i] - 0.05, 20, 0.4);
    const bar = h("div", "bar", "", $(".track", r));
    const x = X(ds(b.start)), w = Math.max(30, X(ds(b.end)) - x);
    bar.style.left = x + "px"; bar.style.background = COLORS[i % 6];
    tw(bar, { w: [0, w] }, times[i], 0.8, "io"); sfx(times[i], "swish");
  });
  const mt = revealTimes({ lines: sc.lines.slice(-1) }, (p.markers || []).length, 0.3);
  let lastX = -1e9, flip = false;
  (p.markers || []).forEach((m, i) => {
    const mk = h("div", "mk will", `<em>${esc(m.label)}</em>`, card);
    const mx = 430 + X(ds(m.date));
    mk.style.left = mx + "px"; mk.style.top = "40px"; mk.style.bottom = "60px";
    flip = mx - lastX < 260 ? !flip : false; lastX = mx;
    if (flip) { const em = $("em", mk); em.style.bottom = "auto"; em.style.top = "-44px"; }
    popIn(mk, mt[i] + 0.3); sfx(mt[i] + 0.3, "pop");
  });
  if ((p.markers || []).length) card.style.paddingBottom = "70px";
};

S.appTable = (root, sc, idx) => {
  const p = sc.params;
  heading(root, p.title, sc.start + 0.15);
  const win = h("div", "card win will", null, root);
  win.style.width = Math.min(1500, root.offsetWidth - 40) + "px"; win.style.left = "0px"; win.style.top = "90px";
  win.innerHTML = `<div class="bar"><i style="background:#f2665a"></i><i style="background:#f4a62a"></i><i style="background:#1e9b57"></i><span style="margin-left:14px">Atlas · ${esc(p.title)}</span></div>
    <div class="filters"><span>Filters</span></div>
    <table class="t"><thead><tr>${p.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${p.rows.map((r) => `<tr>${r.map((v, ci) => `<td class="${ci === 0 && /^[A-Z]{1,4}-\d+/.test(v) ? "id" : ""}"><span class="cv" style="display:inline-block">${cellHtml(v)}</span></td>`).join("")}</tr>`).join("")}</tbody></table>`;
  slideIn(win, sc.start + 0.3, 50);
  const frow = $(".filters", win);
  if (!(p.filters || []).length && !sc.lines.some((l) => (l.ops || []).some((o) => o.op === "filter"))) frow.style.display = "none";
  const chips = {};
  (p.filters || []).forEach((f) => { chips[f] = h("span", "fchip", esc(f), frow); });
  // pre-create chips that ops will add
  sc.lines.forEach((l) => (l.ops || []).forEach((o) => { if (o.op === "filter" && !chips[o.value]) { chips[o.value] = h("span", "fchip will", esc(o.value), frow); tw(chips[o.value], { o: [0, 0] }, 0, 0.01); } }));
  const toast = h("div", "toast will", "", win); tw(toast, { o: [0, 0] }, 0, 0.01);
  const rows = [...win.querySelectorAll("tbody tr")];
  const cursor = h("div", "cursor will", `<svg viewBox="0 0 44 44" width="44" height="44"><path d="M6 4 L6 36 L15 28 L21 41 L27 38 L21 26 L33 26 Z" fill="#16213b" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`, $("#stage"));
  const ripple = h("div", "ripple will", null, cursor); tw(ripple, { o: [0, 0] }, 0, 0.01);
  let cx = 1500, cy = 1000, first = true, hlRow = null, hlStart = 0;
  const moveTo = (el, t) => {
    const r = rel(el); const tx = r.x + Math.min(r.w * 0.5, 60), ty = r.cy;
    if (first) { tw(cursor, { o: [0, 1] }, t - 0.2, 0.2); first = false; }
    tw(cursor, { x: [cx, tx], y: [cy, ty] }, t, 0.45, "io"); cx = tx; cy = ty;
    tw(ripple, { o: [0.9, 0], s: [0.3, 1.3] }, t + 0.47, 0.35); sfx(t + 0.47, "click");
  };
  tw(cursor, { o: [0, 0] }, 0, 0.01);
  sc.lines.forEach((l) => {
    let t = l.start + 0.2;
    (l.ops || []).forEach((o) => {
      const eff = t + 0.5;
      if (o.op === "filter") { const c = chips[o.value]; moveTo(c, t); popIn(c, eff); const tb = $("tbody", win); tw(tb, { o: [1, 0.25] }, eff, 0.15); tw(tb, { o: [0.25, 1] }, eff + 0.18, 0.3); }
      if (o.op === "highlight") { const r = rows[o.row]; if (r) { moveTo(r.children[Math.min(1, r.children.length - 1)], t); if (hlRow) cls(hlRow, "hl", hlStart, eff); hlRow = r; hlStart = eff; } }
      if (o.op === "set") {
        const r = rows[o.row]; const td = r && r.children[o.col]; if (td) {
          const cv = $(".cv", td); moveTo(cv, t); contentAt(cv, eff, cellHtml(o.value)); tw(cv, { s: [1.3, 1] }, eff, 0.45, "back");
          if (/^(approved|live)$/i.test(o.value)) sfx(eff + 0.05, "ding");
        }
      }
      if (o.op === "toast") { contentAt(toast, eff - 0.3, `<span style="width:30px;height:30px;display:inline-block">${CHECK("#7ee2a8", 6)}</span>${esc(o.value)}`); tw(toast, { o: [0, 1], y: [30, 0] }, eff - 0.2, 0.35, "back"); tw(toast, { o: [1, 0] }, eff + 1.6, 0.3); sfx(eff - 0.2, "pop"); t -= 0.45; }
      t += 0.95;
    });
  });
  if (hlRow) cls(hlRow, "hl", hlStart, sc.end);
  tw(cursor, { o: [1, 0] }, sc.end - 0.45, 0.3);
};

S.swimlane = (root, sc) => {
  const p = sc.params, n = p.nodes.length, L = p.lanes.length;
  heading(root, p.title, sc.start + 0.15);
  const W = root.offsetWidth || 1700, H = 560;
  const box = h("div", "card lanes will", null, root); box.style.height = H + "px"; box.style.width = W + "px"; slideIn(box, sc.start + 0.3, 40);
  const laneH = H / L, labelW = 230, colW = (W - labelW - 30) / n, nodeW = Math.min(200, colW - 24), nodeH = Math.min(104, laneH - 18);
  p.lanes.forEach((ln, i) => { const d = h("div", "lane", `<div class="ln">${esc(ln)}</div>`, box); d.style.top = i * laneH + "px"; d.style.height = laneH + "px"; if (i === 0) d.style.borderTop = "0"; d.style.background = i % 2 ? "rgba(0,0,0,.018)" : "transparent"; });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("width", W); svg.setAttribute("height", H); svg.style.position = "absolute"; svg.style.left = 0; svg.style.top = 0; box.appendChild(svg);
  svg.innerHTML = `<defs><marker id="ar${sc.id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.6" markerHeight="3.6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#38425a"/></marker></defs>`;
  const pos = p.nodes.map((nd, i) => ({ x: labelW + 15 + i * colW + (colW - nodeW) / 2, y: nd.lane * laneH + (laneH - nodeH) / 2 }));
  const times = revealTimes(sc, n, 0.32);
  p.nodes.forEach((nd, i) => {
    const e = h("div", `node ${nd.kind} will`, esc(nd.label), box);
    Object.assign(e.style, { left: pos[i].x + "px", top: pos[i].y + "px", width: nodeW + "px", height: nodeH + "px", fontSize: nd.label.length > 26 ? "19px" : "21px" });
    popIn(e, times[i] + 0.12); sfx(times[i] + 0.12, "pop");
    if (i > 0) {
      const a = pos[i - 1], b = pos[i];
      const x1 = a.x + nodeW, y1 = a.y + nodeH / 2, x2 = b.x - 4, y2 = b.y + nodeH / 2, mx = (x1 + x2) / 2;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", y1 === y2 ? `M${x1} ${y1} L${x2} ${y2}` : `M${x1} ${y1} L${mx} ${y1} L${mx} ${y2} L${x2} ${y2}`);
      path.setAttribute("fill", "none"); path.setAttribute("stroke", "#38425a"); path.setAttribute("stroke-width", "4"); path.setAttribute("marker-end", `url(#ar${sc.id})`); path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);
      const len = path.getTotalLength(); path.style.strokeDasharray = len;
      tw(path, { dash: [len, 0] }, times[i] - 0.2, 0.35, "io");
      tw(path, { o: [0, 1] }, times[i] - 0.2, 0.05);
    }
  });
};

S.chain = (root, sc) => {
  const p = sc.params, n = p.steps.length;
  heading(root, p.title, sc.start + 0.15);
  const W = root.offsetWidth || 1700;
  const row = h("div", "chainrow will", null, root); slideIn(row, sc.start + 0.3, 40);
  const sp = W / n, cy = 150, xs = p.steps.map((_, i) => sp * i + sp / 2);
  const base = h("div", "cline", null, row); Object.assign(base.style, { left: xs[0] + "px", width: xs[n - 1] - xs[0] + "px", top: cy - 5 + "px", background: "#e2d9c9" });
  const prog = h("div", "cline", null, row); Object.assign(prog.style, { left: xs[0] + "px", width: "0px", top: cy - 5 + "px", background: "var(--green)" });
  const nodes = p.steps.map((s, i) => {
    const c = h("div", "cnode will", `${i + 1}<span class="ic okc">${CHECK("#fff", 6)}</span><span class="ic badc">${CROSS("#fff", 6)}</span>`, row);
    Object.assign(c.style, { left: xs[i] - 56 + "px", top: cy - 56 + "px" });
    popIn(c, sc.start + 0.45 + i * 0.12);
    const lb = h("div", "clab will", `${esc(s.label)}<small>${esc(s.who || "")}</small>`, row);
    Object.assign(lb.style, { left: xs[i] - sp / 2 + 10 + "px", width: sp - 20 + "px", top: cy + 80 + "px" });
    slideIn(lb, sc.start + 0.55 + i * 0.12, 20);
    return c;
  });
  const token = h("div", "token will", "<i style='top:18px'></i><i style='top:34px'></i><i style='top:50px;right:30px'></i>", row);
  Object.assign(token.style, { left: xs[0] - 37 + "px", top: cy - 170 + "px" });
  popIn(token, sc.start + 0.6);
  const a = sc.lines[0].start + 0.4, b = sc.end - 1.5;
  const r = Number.isInteger(p.reject) && p.reject < n ? p.reject : -1;
  const units = n + (r >= 0 ? 2 : 0), dt = (b - a) / units;
  let tx = 0, k = 0;
  const go = (i, t) => { tw(token, { x: [tx, xs[i] - xs[0]] }, t - 0.35, 0.35, "io"); tx = xs[i] - xs[0]; };
  const approve = (i, t) => { go(i, t); cls(nodes[i], "cur", t - 0.1, t + dt * 0.35); cls(nodes[i], "ok", t + dt * 0.35, 1e9); tw(nodes[i], { s: [1.25, 1] }, t + dt * 0.35, 0.45, "back"); tw(prog, { w: [Math.max(0, xs[Math.max(0, i - 1)] - xs[0]), xs[i] - xs[0]] }, t + dt * 0.35, 0.3); sfx(t + dt * 0.35, "tick"); };
  for (let i = 0; i < n; i++) {
    if (i === r) {
      const t = a + k * dt; go(i, t); cls(nodes[i], "cur", t - 0.1, t + dt * 0.4); cls(nodes[i], "bad", t + dt * 0.4, t + dt * 1.6);
      tw(nodes[i], { x: [-10, 0] }, t + dt * 0.4, 0.4, "el"); sfx(t + dt * 0.4, "buzz");
      k += 1; go(0, a + k * dt); tw(token, { r: [0, -8] }, a + k * dt - 0.3, 0.2); tw(token, { r: [-8, 0] }, a + k * dt + 0.2, 0.3);
      k += 1;
    }
    approve(i, a + k * dt + 0.35); k += 1;
  }
  const stamp = h("div", "stamp will", "APPROVED", row);
  Object.assign(stamp.style, { left: W / 2 - 220 + "px", top: cy + 190 + "px" });
  tw(stamp, { o: [0, 1] }, b + 0.15, 0.15); tw(stamp, { s: [2.2, 1], r: [-14, -6] }, b + 0.15, 0.45, "back"); sfx(b + 0.2, "tada");
};

const JLIST = [["Americas", [["us", "US", "Federal"], ["us-ca", "CA", "California"], ["us-co", "CO", "Colorado"], ["us-nc", "NC", "N. Carolina"], ["us-tx", "TX", "Texas"], ["us-wa", "WA", "Washington"], ["ca", "CAN", "Canada"]]],
  ["EMEA", [["de", "DE", "Germany"], ["il", "IL", "Israel"]]], ["APAC", [["in", "IN", "India"], ["tw", "TW", "Taiwan"], ["cn", "CN", "China"], ["vn", "VN", "Vietnam"]]]];
S.map = (root, sc) => {
  const p = sc.params;
  heading(root, p.title, sc.start + 0.15);
  const wrap = h("div", "regions", null, root);
  const tiles = {};
  JLIST.forEach(([reg, js], ri) => {
    const c = h("div", "card region will", `<h4>${reg}</h4><div class="tiles"></div>`, wrap);
    c.style.flex = ri === 0 ? "0 0 680px" : ri === 1 ? "0 0 352px" : "0 0 352px";
    slideIn(c, sc.start + 0.3 + ri * 0.12, 40);
    js.forEach(([id, code, name]) => { tiles[id] = h("div", "tile will", `<b>${code}</b><span>${name}</span>`, $(".tiles", c)); });
  });
  const leg = h("div", "legend", null, root);
  const gc = ["var(--coral)", "var(--accent)", "var(--teal)"];
  const times = revealTimes(sc, p.groups.length, 0.5);
  p.groups.forEach((g, gi) => {
    const t = times[gi];
    g.codes.forEach((c, k) => { const el = tiles[c]; if (!el) return; cls(el, "g" + (gi % 3), t + k * 0.1); tw(el, { s: [1.18, 1] }, t + k * 0.1, 0.45, "back"); });
    const l = h("div", "lg will", `<i style="background:${gc[gi % 3]}"></i>${esc(g.label)}`, leg); popIn(l, t); sfx(t, "pop");
  });
  if (p.note) { const nt = h("div", "note will", esc(p.note), root); slideIn(nt, times[times.length - 1] + 0.8, 16); }
};

S.checklist = (root, sc) => {
  const p = sc.params;
  heading(root, p.title, sc.start + 0.15);
  const c = h("div", "card clist will", null, root); slideIn(c, sc.start + 0.3, 40);
  const times = revealTimes(sc, p.items.length, 0.45);
  p.items.forEach((it, i) => {
    const row = h("div", "citem", `<span class="box"><svg viewBox="0 0 40 40" width="48" height="48" style="position:absolute;left:0;top:0"><path d="M9 21l7 7 15-16" fill="none" stroke="#fff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span>${esc(it)}</span>`, c);
    const path = $("path", row); path.style.strokeDasharray = 40; tw(path, { dash: [40, 0] }, times[i] + 0.1, 0.3);
    cls(row, "done", times[i]); tw($(".box", row), { s: [1.3, 1] }, times[i], 0.4, "back"); sfx(times[i], "tick");
  });
};

S.versus = (root, sc) => {
  const p = sc.params;
  const g = h("div", "vs", null, root); g.style.marginTop = "40px";
  const mk = (side, col, soft, icon, t) => {
    const c = h("div", "card vcol will", `<h3 style="background:${soft};color:${col}"><i style="background:${col}">${icon("#fff", 6)}</i>${esc(side.title)}</h3>`, g);
    slideIn(c, t, 40); return c;
  };
  const L = mk(p.left, "var(--red)", "var(--red-soft)", CROSS, sc.start + 0.3), R = mk(p.right, "var(--green)", "var(--green-soft)", CHECK, sc.start + 0.45);
  const seq = []; const m = Math.max(p.left.items.length, p.right.items.length);
  for (let i = 0; i < m; i++) { if (p.left.items[i]) seq.push([L, p.left.items[i], "var(--red)", CROSS]); if (p.right.items[i]) seq.push([R, p.right.items[i], "var(--green)", CHECK]); }
  const times = revealTimes(sc, seq.length, 0.4);
  seq.forEach(([col, text, c, icon], i) => { const r = h("div", "vrow will", `<i style="background:${c}">${icon("#fff", 6)}</i><span>${esc(text)}</span>`, col); slideIn(r, times[i], 20, 0.4); sfx(times[i], "pop"); });
};

S.callout = (root, sc) => {
  const p = sc.params;
  const c = h("div", "card callout will", `<div class="lbl">${esc(p.label)}</div><div class="txt">${esc(p.text)}</div>`, root);
  popIn(c, sc.start + 0.3, 0.6); sfx(sc.start + 0.3, "pop");
  const sw = document.createElementNS("http://www.w3.org/2000/svg", "svg"); sw.setAttribute("class", "sw"); sw.setAttribute("width", "420"); sw.setAttribute("height", "24");
  sw.innerHTML = `<path d="M4 16 C 90 4, 200 22, 300 10 S 400 8, 416 12" fill="none" stroke="var(--amber)" stroke-width="8" stroke-linecap="round"/>`; c.appendChild(sw);
  const path = $("path", sw); path.style.strokeDasharray = 440; tw(path, { dash: [440, 0] }, sc.start + 0.9, 0.7, "io");
};

S.outro = (root, sc) => {
  const p = sc.params, t = sc.start;
  const w = h("div", "outro", null, root);
  const ti = h("div", "t will", esc(p.title), w); slideIn(ti, t + 0.25, 50, 0.7);
  const nx = h("div", "card next will", `<span class="play"><svg width="26" height="26" viewBox="0 0 26 26"><path d="M8 5 L21 13 L8 21 Z" fill="#fff"/></svg></span><span><span style="color:var(--muted);font-weight:700">Next:</span> ${esc(p.next)}</span>`, w); popIn(nx, t + 0.8);
  const wh = h("div", "where will", `Find it in the Atlas: <b style="color:var(--ink)">${esc(p.where)}</b>`, w); slideIn(wh, t + 1.1, 20);
  // confetti
  const cols = ["#f2665a", "#f4a62a", "#11998a", "#6f5cf1", "#2f5bd3", "#1e9b57"];
  for (let i = 0; i < 70; i++) {
    const c = h("div", "confetti will", null, $("#stage"));
    c.style.background = cols[i % 6]; c.style.left = "960px"; c.style.top = "420px";
    const ang = rnd() * Math.PI * 2, sp = 300 + rnd() * 700, t0 = t + 0.3 + rnd() * 0.25;
    const dx = Math.cos(ang) * sp, dy = Math.sin(ang) * sp * 0.6 - 200;
    tw(c, { o: [0, 1] }, t0, 0.05); tw(c, { x: [0, dx], r: [0, (rnd() - 0.5) * 900] }, t0, 2.6, "out"); tw(c, { y: [0, dy] }, t0, 0.9, "out"); tw(c, { y: [dy, dy + 700] }, t0 + 0.9, 1.8, "in"); tw(c, { o: [1, 0] }, t0 + 2.3, 0.4);
  }
  sfx(t + 0.3, "tada");
};
