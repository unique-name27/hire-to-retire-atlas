#!/usr/bin/env python3
"""End-to-end link and navigation test for the built page.

Checks, in a headless browser:
  1. Every route renders (home layouts, every process, policy, template, jurisdiction and obligation),
     and every internal link, copy-link token and search result points to a page that exists.
  2. Every "On this page" entry scrolls its section to just below the top bar and highlights the entry
     that was clicked, and the highlight follows the reader when scrolling, at two window sizes.

Usage:
  python3 build.py && python3 tests/test_links.py
Needs: pip install playwright (and a Chromium; set CHROMIUM_PATH to use an existing binary).
"""
import asyncio, functools, http.server, os, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

CRAWL = r"""
async () => {
  const R = { bad: [], jumpsMissing: [], errors: [], visited: 0, emptyLinks: [] };
  const internal = new Set(); const seen = new Set();
  const visit = (r) => {
    if (seen.has(r)) return; seen.add(r);
    history.replaceState(null, "", "#" + r);
    try { render(); } catch (e) { R.errors.push(r + ": " + e.message); return; }
    R.visited++;
    if (/That page doesn.t exist/.test(document.querySelector("main").textContent)) R.bad.push(r);
    document.querySelectorAll('a[href^="#"]').forEach((a) => { const h = decodeURIComponent(a.getAttribute("href").slice(1)); if (!h) R.emptyLinks.push(r); else internal.add(h); });
    document.querySelectorAll("[data-jump]").forEach((a) => { if (!document.getElementById(a.dataset.jump)) R.jumpsMissing.push(r + " -> " + a.dataset.jump); });
    document.querySelectorAll("[data-copylink]").forEach((b) => internal.add(b.dataset.copylink));
  };
  for (const h of HOME_VIEWS) { PREFS = { ...PREFS, home: h[0] }; seen.delete("home"); visit("home"); }
  ["checklist", "processes", "policies", "templates", "countries", "compare", "global", "global.publicCompany", "global.semiconductor",
   "global.globalFrameworks", "calendar", "changes", "changes.legal", "proposals",
   ...DB.processes.map((p) => "process." + p.id), ...DB.policies.map((p) => "policy." + p.id), ...DB.templates.map((t) => "template." + t.id),
   ...DB.countries.map((c) => "country." + c.id), ...DB.register.map((x) => "item." + x.id), ...STAGES.map((s) => "processes." + s.key)].forEach(visit);
  buildIndex().forEach((x) => internal.add(x.route));
  let pending = [...internal].filter((x) => !seen.has(x));
  while (pending.length) { pending.forEach(visit); pending = [...internal].filter((x) => !seen.has(x)); }
  R.internal = internal.size;
  return R;
}
"""

TOC = r"""
async (routes) => {
  const fails = []; let clicks = 0;
  const raf = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  for (const r of routes) {
    location.hash = r; await new Promise((res) => setTimeout(res, 60));
    window.scrollTo(0, 0); await raf();
    const links = [...document.querySelectorAll(".toc a[data-jump]")];
    if (!links.length) { fails.push(r + ": no 'On this page' list"); continue; }
    for (const a of links) {
      a.click(); clicks++;
      const el = document.getElementById(a.dataset.jump);
      const top = el.getBoundingClientRect().top, want = topOffset();
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const active = document.querySelector(".toc a.on");
      if (active !== a) fails.push(`${r}: clicked "${a.textContent}" but "${active && active.textContent}" is highlighted`);
      if (!(Math.abs(top - want) <= 3 || (atBottom && top > 0 && top < window.innerHeight))) fails.push(`${r}: "${a.textContent}" landed at ${Math.round(top)}px, expected ${want}px`);
    }
    SPY.lockUntil = 0;
    for (const a of links) {
      const el = document.getElementById(a.dataset.jump);
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - topOffset()); await raf();
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const active = document.querySelector(".toc a.on");
      if (!atBottom && active !== a) fails.push(`${r}: scrolled to "${a.textContent}" but "${active && active.textContent}" is highlighted`);
    }
  }
  return { fails, clicks };
}
"""


def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=DIST)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


async def main():
    httpd = serve(); url = f"http://127.0.0.1:{httpd.server_address[1]}/preview.html"
    failed = False
    async with async_playwright() as p:
        kw = {"executable_path": os.environ["CHROMIUM_PATH"]} if os.environ.get("CHROMIUM_PATH") else {}
        browser = await p.chromium.launch(**kw)
        errors = []
        page = await browser.new_page(viewport={"width": 1440, "height": 900})
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto(url); await page.wait_for_timeout(800)
        R = await page.evaluate(CRAWL)
        print(f"Rendered {R['visited']} pages; {R['internal']} distinct internal link targets")
        for key, label in [("bad", "Links to missing pages"), ("jumpsMissing", "On-page links with no target"), ("errors", "Render errors"), ("emptyLinks", "Empty links")]:
            if R[key]:
                failed = True; print(f"FAIL {label}: {len(R[key])}"); [print("   ", x) for x in R[key][:20]]
        routes = await page.evaluate("() => ['processes', ...DB.processes.map(p=>'process.'+p.id), ...DB.policies.map(p=>'policy.'+p.id), ...DB.templates.filter(t=>t.id!=='T-EXIT-SURVEY').map(t=>'template.'+t.id), ...DB.countries.map(c=>'country.'+c.id)]")
        await page.close()
        for vw in [(1440, 900), (1024, 800)]:
            page = await browser.new_page(viewport={"width": vw[0], "height": vw[1]})
            page.on("pageerror", lambda e: errors.append(str(e)))
            await page.goto(url); await page.wait_for_timeout(800)
            T = await page.evaluate(TOC, routes)
            print(f"'On this page' at {vw[0]}x{vw[1]}: {T['clicks']} clicks checked, {len(T['fails'])} failures")
            if T["fails"]:
                failed = True; [print("   ", x) for x in T["fails"][:20]]
            await page.close()
        if errors:
            failed = True; print("FAIL page errors:", errors[:10])
        await browser.close()
    httpd.shutdown()
    print("FAILED" if failed else "ALL CHECKS PASSED")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    asyncio.run(main())
