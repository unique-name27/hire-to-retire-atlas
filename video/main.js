/* Load a timeline, build the video and expose renderAt for the frame renderer. */
"use strict";
(async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get("v") || "V1";
  const tl = await fetch(`out/${id}/timeline.json`).then((r) => r.json());
  await document.fonts.load("800 40px Jakarta"); await document.fonts.load("600 40px Jakarta"); await document.fonts.load("700 40px Jakarta"); await document.fonts.load("500 40px Jakarta");
  await document.fonts.ready;
  const content = buildChrome(tl);
  tl.scenes.forEach((sc, i) => {
    const root = h("div", "scene will", null, content);
    const narrow = sc.chip && !["title", "callout", "outro"].includes(sc.type);
    root.style.width = narrow ? "1480px" : "1700px";
    S[sc.type](root, sc, i, tl);
    tw(root, { o: [0, 1] }, sc.start, 0.45); tw(root, { y: [28, 0] }, sc.start, 0.55, "out");
    if (i < tl.scenes.length - 1) { tw(root, { o: [1, 0] }, sc.end - 0.35, 0.3); tw(root, { y: [0, -22] }, sc.end - 0.35, 0.35, "in"); }
    if (i > 0) sfx(sc.start - 0.05, "whoosh");
  });
  buildChip(tl);
  window.renderAt = renderAt;
  window.READY = { duration: tl.duration, fps: tl.fps, sfx: SFX.sort((a, b) => a.t - b.t) };
  if (params.get("t")) renderAt(+params.get("t"));
  if (params.get("play")) { const t0 = performance.now(); const loop = () => { renderAt((performance.now() - t0) / 1000); requestAnimationFrame(loop); }; loop(); }
})();
