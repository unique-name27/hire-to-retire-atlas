/* Hosts (Ava, Leo), Chip the mascot, background, brand bar and captions. Original designs. */
"use strict";
const AVA_SVG = `<svg viewBox="0 0 230 230" width="230" height="230">
  <defs><clipPath id="cpA"><circle cx="115" cy="115" r="107"/></clipPath></defs>
  <circle cx="115" cy="115" r="107" fill="#d6f2ed"/>
  <g clip-path="url(#cpA)">
    <g class="head" style="transform-origin:115px 150px">
      <path d="M52 118 C 40 44, 190 44, 178 118 L 184 196 L 46 196 Z" fill="#3a2418"/>
      <path d="M26 250 C 36 184, 194 184, 204 250 Z" fill="#11998a"/>
      <path d="M86 186 q 29 22 58 0" fill="none" stroke="#0c7a6e" stroke-width="5" stroke-linecap="round"/>
      <rect x="100" y="148" width="30" height="40" rx="12" fill="#dd9f79"/>
      <ellipse cx="66" cy="118" rx="9" ry="13" fill="#eab08c"/><ellipse cx="164" cy="118" rx="9" ry="13" fill="#eab08c"/>
      <circle cx="66" cy="140" r="5.5" fill="#f4b73a"/><circle cx="164" cy="140" r="5.5" fill="#f4b73a"/>
      <ellipse cx="115" cy="112" rx="50" ry="58" fill="#f2c19d"/>
      <path d="M62 108 C 58 58, 112 42, 152 56 C 174 66, 176 92, 170 112 C 152 80, 110 76, 82 92 C 72 98, 66 104, 62 108 Z" fill="#3a2418"/>
      <path d="M88 96 q 10 -6 20 -1" stroke="#3a2418" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M122 95 q 10 -5 20 1" stroke="#3a2418" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <g class="eyes" style="transform-origin:115px 112px">
        <ellipse cx="98" cy="112" rx="6.5" ry="7.5" fill="#2a1d17"/><ellipse cx="132" cy="112" rx="6.5" ry="7.5" fill="#2a1d17"/>
        <circle cx="100" cy="109" r="2" fill="#fff"/><circle cx="134" cy="109" r="2" fill="#fff"/>
      </g>
      <circle cx="86" cy="132" r="9" fill="#f08e83" opacity=".4"/><circle cx="144" cy="132" r="9" fill="#f08e83" opacity=".4"/>
      <path d="M115 116 q -5 12 3 14" stroke="#c98a66" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path class="smile" d="M103 141 q 12 9 24 0" stroke="#8a3b34" stroke-width="4" fill="none" stroke-linecap="round"/>
      <g class="mouth" style="transform-origin:115px 139px"><ellipse cx="115" cy="145" rx="11.5" ry="9" fill="#7c2d2a"/><ellipse cx="115" cy="150" rx="7" ry="3.5" fill="#e0726a"/></g>
    </g>
  </g></svg>`;
const LEO_SVG = `<svg viewBox="0 0 230 230" width="230" height="230">
  <defs><clipPath id="cpL"><circle cx="115" cy="115" r="107"/></clipPath></defs>
  <circle cx="115" cy="115" r="107" fill="#ffe6d3"/>
  <g clip-path="url(#cpL)">
    <g class="head" style="transform-origin:115px 150px">
      <path d="M22 250 C 32 182, 198 182, 208 250 Z" fill="#ef7b2d"/>
      <path d="M78 186 C 90 210, 140 210, 152 186 C 140 196, 90 196, 78 186 Z" fill="#f6a066"/>
      <rect x="99" y="146" width="32" height="40" rx="12" fill="#a46b46"/>
      <ellipse cx="65" cy="116" rx="9" ry="13" fill="#ad744e"/><ellipse cx="165" cy="116" rx="9" ry="13" fill="#ad744e"/>
      <ellipse cx="115" cy="112" rx="50" ry="56" fill="#b97f57"/>
      <g fill="#1f1814"><circle cx="74" cy="78" r="17"/><circle cx="94" cy="62" r="20"/><circle cx="117" cy="57" r="21"/><circle cx="140" cy="62" r="20"/><circle cx="158" cy="78" r="17"/><circle cx="166" cy="96" r="11"/><circle cx="64" cy="96" r="11"/><circle cx="104" cy="70" r="16"/><circle cx="130" cy="70" r="16"/></g>
      <path d="M68 118 C 70 176, 160 176, 162 118 C 156 150, 140 160, 115 160 C 90 160, 74 150, 68 118 Z" fill="#2a201b"/>
      <path d="M86 94 q 11 -7 22 -1" stroke="#1f1814" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M122 93 q 11 -6 22 1" stroke="#1f1814" stroke-width="6" fill="none" stroke-linecap="round"/>
      <g class="eyes" style="transform-origin:115px 111px">
        <ellipse cx="98" cy="111" rx="6" ry="7" fill="#1f1814"/><ellipse cx="132" cy="111" rx="6" ry="7" fill="#1f1814"/>
        <circle cx="100" cy="108" r="2" fill="#fff"/><circle cx="134" cy="108" r="2" fill="#fff"/>
      </g>
      <rect x="80" y="97" width="36" height="28" rx="10" fill="rgba(255,255,255,.18)" stroke="#1f1814" stroke-width="4"/>
      <rect x="114" y="97" width="36" height="28" rx="10" fill="rgba(255,255,255,.18)" stroke="#1f1814" stroke-width="4"/>
      <path d="M116 108 h -2" stroke="#1f1814" stroke-width="4"/>
      <path d="M115 116 q -5 11 3 13" stroke="#8f5a39" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path class="smile" d="M102 140 q 13 9 26 0" stroke="#f1c7b0" stroke-width="4" fill="none" stroke-linecap="round"/>
      <g class="mouth" style="transform-origin:115px 138px"><ellipse cx="115" cy="144" rx="12" ry="9" fill="#5e1f1c"/><ellipse cx="115" cy="149" rx="7" ry="3.5" fill="#d9695f"/></g>
    </g>
  </g></svg>`;
const CHIP_SVG = `<svg viewBox="0 0 190 190" width="190" height="190">
  <ellipse cx="95" cy="180" rx="52" ry="8" fill="rgba(40,30,10,.14)"/>
  <g fill="#bdb3ff">${[0, 1, 2, 3].map((i) => `<rect x="${52 + i * 24}" y="18" width="10" height="22" rx="4"/><rect x="${52 + i * 24}" y="150" width="10" height="22" rx="4"/><rect x="18" y="${52 + i * 24}" width="22" height="10" rx="4"/><rect x="150" y="${52 + i * 24}" width="22" height="10" rx="4"/>`).join("")}</g>
  <rect x="35" y="35" width="120" height="120" rx="28" fill="#6f5cf1"/>
  <rect x="49" y="49" width="92" height="92" rx="18" fill="#8b7cff" opacity=".55"/>
  <path d="M60 132 h18 v-10 M130 60 h-14 v10 M60 60 h10" stroke="#c9c1ff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>
  <g class="eyes" style="transform-origin:95px 92px">
    <ellipse cx="78" cy="90" rx="15" ry="17" fill="#fff"/><ellipse cx="112" cy="90" rx="15" ry="17" fill="#fff"/>
    <g class="pupils"><circle cx="80" cy="93" r="8" fill="#16213b"/><circle cx="114" cy="93" r="8" fill="#16213b"/><circle cx="83" cy="89" r="2.6" fill="#fff"/><circle cx="117" cy="89" r="2.6" fill="#fff"/></g>
  </g>
  <circle cx="64" cy="114" r="7" fill="#ff8fb0" opacity=".55"/><circle cx="126" cy="114" r="7" fill="#ff8fb0" opacity=".55"/>
  <path class="m-smile" d="M84 118 q 11 10 22 0" stroke="#16213b" stroke-width="4.5" fill="none" stroke-linecap="round"/>
  <ellipse class="m-o" cx="95" cy="121" rx="7" ry="8" fill="#16213b" opacity="0"/>
</svg>`;

function buildChrome(tl) {
  const st = $("#stage");
  // background blobs + dots
  const blobs = [["#ffd2c7", 520, -120, -160], ["#cdeee9", 620, 1460, 520], ["#ddd7ff", 480, 1180, -220], ["#ffe8bf", 420, -100, 640]];
  const bEls = blobs.map(([c, size, x, y]) => { const b = h("div", "blob", null, st); Object.assign(b.style, { background: c, width: size + "px", height: size + "px", left: x + "px", top: y + "px" }); return b; });
  h("div", "dots", null, st);
  HOOKS.push((t) => bEls.forEach((b, i) => { b.style.transform = `translate(${Math.sin(t * 0.21 + i * 1.7) * 60}px,${Math.cos(t * 0.17 + i) * 40}px)`; }));
  // brand + progress
  const brand = h("div", "abs", `<span class="logo">${LOGO}</span><span>Project Atlas</span><span class="ep">· ${esc(tl.episode)}</span>`, st);
  brand.id = "brand";
  const prog = h("div", "abs", "<i></i>", st); prog.id = "prog";
  tw($("i", prog), { sx: [0, 1] }, 0, tl.duration, "lin"); $("i", prog).style.transformOrigin = "0 50%";
  const content = h("div", "abs", null, st); content.id = "content";
  // hosts
  const mk = (id, svg, color, left) => {
    const el = h("div", "abs host will", `<div class="ring"></div>${svg}<div class="tag" style="background:${color}">${id === "ava" ? "Ava" : "Leo"}</div>`, st);
    el.style.left = left + "px"; el.id = id;
    $(".ring", el).style.boxShadow = `0 0 0 8px ${color}`;
    return el;
  };
  const ava = mk("ava", AVA_SVG, "var(--ava)", 70), leo = mk("leo", LEO_SVG, "var(--leo)", 1620);
  // entrance
  [ava, leo].forEach((el, i) => { tw(el, { y: [300, 0] }, 0.15 + i * 0.12, 0.7, "back"); });
  const lines = tl.scenes.flatMap((s) => s.lines);
  const activity = (who, t) => {
    let a = 0;
    for (const l of lines) if (l.who === who) a = Math.max(a, clamp((t - l.start + 0.25) / 0.25) * clamp((l.end + 0.35 - t) / 0.3));
    return a;
  };
  const frameEnv = (who, t) => { const e = tl.env[who]; const f = Math.floor(t * tl.fps); return e[Math.min(e.length - 1, Math.max(0, f))] || 0; };
  HOOKS.push((t) => {
    for (const [el, who, phase] of [[ava, "ava", 0.3], [leo, "leo", 1.9]]) {
      const a = activity(who, t);
      const amp = frameEnv(who, t);
      const mouth = $(".mouth", el), smile = $(".smile", el);
      const open = clamp(amp * 1.25);
      mouth.style.transform = `scale(${0.9 + 0.2 * open},${Math.max(0.08, open)})`;
      mouth.style.opacity = open > 0.06 ? 1 : 0;
      smile.style.opacity = open > 0.06 ? 0 : 1;
      const bt = (t + phase) % 3.7; const blink = bt < 0.13 ? 0.12 : 1;
      $(".eyes", el).style.transform = `scaleY(${blink})`;
      $(".head", el).style.transform = `rotate(${(Math.sin(t * 2.3 + phase) * 2.2 * a).toFixed(2)}deg) translateY(${(-Math.abs(Math.sin(t * 4.1 + phase)) * 3 * a).toFixed(2)}px)`;
      $(".ring", el).style.boxShadow = `0 0 0 ${(4 + 7 * a).toFixed(1)}px ${who === "ava" ? "var(--ava)" : "var(--leo)"}, 0 14px 30px -10px rgba(0,0,0,${(0.15 + 0.2 * a).toFixed(2)})`;
      el.style.filter = `saturate(${(0.75 + 0.25 * Math.max(a, 0.2)).toFixed(2)})`;
    }
  });
  // captions
  const cap = h("div", "abs", null, st); cap.id = "cap";
  const box = h("div", "box", `<span class="who"></span><span class="tx"></span>`, cap);
  const caps = tl.captions;
  HOOKS.push((t) => {
    let c = null;
    for (const k of caps) if (k.start - 0.06 <= t) c = k;
    const show = c && t <= c.end + 0.4;
    box.style.opacity = show ? clamp((t - c.start + 0.06) / 0.12) : 0;
    if (show && box.dataset.k !== c.start + "") {
      box.dataset.k = c.start;
      $(".tx", box).textContent = c.text;
      const w = $(".who", box); w.textContent = c.who === "ava" ? "Ava" : "Leo"; w.style.background = c.who === "ava" ? "var(--ava)" : "var(--leo)";
    }
  });
  return content;
}

/* Chip: appears per scene with a pose; never speaks */
function buildChip(tl) {
  const st = $("#stage");
  const chip = h("div", "abs will", `${CHIP_SVG}<div class="bubble"></div>`, st); chip.id = "chip";
  const bubble = $(".bubble", chip);
  const poses = [];
  tl.scenes.forEach((sc, i) => {
    if (!sc.chip) return;
    const t0 = sc.start + (i === 0 ? 0.9 : 0.45), t1 = sc.end - 0.3;
    const pos = sc.type === "callout" ? [-1470, 290] : sc.type === "title" ? [30, 10] : sc.type === "outro" ? [40, 440] : [0, 0];
    tw(chip, { x: [pos[0], pos[0]], y: [pos[1], pos[1]] }, t0 - 0.01, 0.001);
    tw(chip, { o: [0, 1] }, t0, 0.2); tw(chip, { s: [0.3, sc.type === "callout" ? 1.25 : 1] }, t0, 0.6, "back");
    if (i < tl.scenes.length - 1) { tw(chip, { o: [1, 0] }, t1, 0.25); tw(chip, { s: [1, 0.5] }, t1, 0.25, "in"); }
    poses.push({ t0, t1: i < tl.scenes.length - 1 ? t1 : 1e9, pose: sc.chip });
    sfx(t0, "boing");
  });
  if (!poses.length || poses[0].t0 > 0) tw(chip, { o: [0, 0] }, 0, 0.01);
  const BUB = { wave: "Hi!", think: "?", thumbs: `<span style="width:40px;height:40px;display:block">${CHECK("#1e9b57", 6)}</span>`, alarm: "!", celebrate: "Yay!", point: "Look" };
  HOOKS.push((t) => {
    const p = poses.find((q) => t >= q.t0 - 0.05 && t < q.t1 + 0.3);
    if (!p) return;
    if (bubble.dataset.p !== p.pose) { bubble.innerHTML = BUB[p.pose] || ""; bubble.dataset.p = p.pose; bubble.style.color = p.pose === "alarm" ? "var(--red)" : "var(--ink)"; }
    const lt = t - p.t0;
    bubble.style.opacity = clamp((lt - 0.35) / 0.2) * clamp((p.t1 - t) / 0.2);
    bubble.style.transform = `scale(${0.7 + 0.3 * E.back(clamp((lt - 0.35) / 0.4))})`;
    let bob = Math.sin(t * 2.6) * 6, rot = 0, dx = 0;
    if (p.pose === "wave" || p.pose === "celebrate") { bob -= Math.abs(Math.sin(lt * 7)) * 22 * clamp(1.6 - lt); rot = Math.sin(lt * 9) * 8 * clamp(1.6 - lt); }
    if (p.pose === "alarm") dx = Math.sin(lt * 50) * 7 * clamp(1.2 - lt);
    if (p.pose === "think") rot = Math.sin(t * 1.4) * 4;
    $("svg", chip).style.transform = `translate(${dx.toFixed(1)}px,${bob.toFixed(1)}px) rotate(${rot.toFixed(1)}deg)`;
    const look = { think: [3, -6], point: [-7, 1], alarm: [0, 0], wave: [0, 2], thumbs: [-2, 1], celebrate: [0, -2] }[p.pose] || [0, 0];
    $(".pupils", chip).style.transform = `translate(${look[0]}px,${look[1]}px)`;
    $(".eyes", chip).style.transform = `scale(${p.pose === "alarm" ? 1.12 : 1},${((t + 0.7) % 4.3) < 0.12 ? 0.12 : p.pose === "alarm" ? 1.12 : 1})`;
    $(".m-smile", chip).style.opacity = p.pose === "alarm" || p.pose === "think" ? 0 : 1;
    $(".m-o", chip).style.opacity = p.pose === "alarm" || p.pose === "think" ? 1 : 0;
  });
}
