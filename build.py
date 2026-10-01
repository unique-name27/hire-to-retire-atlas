#!/usr/bin/env python3
"""Assemble the Hire-to-Retire Atlas page from data/ + src/.

Usage: python3 build.py [artifact_url]
Writes dist/atlas.html (the page to publish) and dist/preview.html (a standalone copy for local viewing)."""
import json, os, re, sys
ROOT = os.path.dirname(os.path.abspath(__file__))
D = lambda f: os.path.join(ROOT, "data", f)
S = lambda f: os.path.join(ROOT, "src", f)
load = lambda f: json.load(open(D(f)))

STAGE_ORDER = ["Plan", "Recruit", "Onboard", "Pay", "Reward", "Equity", "Benefits", "Leave", "Grow", "Move", "Engage", "Relations", "Safety", "Data", "Offboard"]
procs = []
for f in "abcdefg":
    procs += load(f"proc-{f}.json")["processes"]
procs.sort(key=lambda p: (STAGE_ORDER.index(p["stage"]), p["id"]))
pols = load("pol-a.json")["policies"] + load("pol-b.json")["policies"]
pols.sort(key=lambda p: p["id"])
tpls = [load("exit-survey.json")] + load("templates.json")["templates"]
for f in ["a", "b", "c", "d", "e", "pm"]:
    if os.path.exists(D(f"templates-{f}.json")): tpls += load(f"templates-{f}.json")["templates"]
reg = load("register.json")["items"]
JURS = ["us", "us-ca", "us-co", "us-nc", "us-tx", "us-wa", "ca", "de", "il", "in", "tw", "cn", "vn"]
countries = [load(f"country-{c}.json") for c in JURS]
# merge per-jurisdiction notes for the jurisdictions added later
P = {p["id"]: p for p in procs}; PO = {p["id"]: p for p in pols}; T = {t["id"]: t for t in tpls}
for j in JURS:
    f = D(f"notes-{j}.json")
    if not os.path.exists(f): continue
    n = json.load(open(f))
    for k, v in n["processes"].items(): P[k]["countries"][j] = v
    for k, v in n["policies"].items(): PO[k]["countryAddenda"][j] = v
    for k, v in n["templates"].items(): T[k].setdefault("countryNotes", {})[j] = v
    reg += n.get("register", [])
# link each template from the processes it names
for t in tpls:
    for pid in t.get("processes", []):
        if pid in P and t["id"] not in P[pid].setdefault("templates", []): P[pid]["templates"].append(t["id"])
for c in countries:
    if c["id"] == "ca":
        c["name"] = "Canada: Toronto (Ontario) and Vancouver (British Columbia)"
        c["sites"] = "Toronto office: Ontario ESA, OHSA and AODA apply. Vancouver office: BC ESA, WorkSafeBC and BC PIPA apply. Neither city adds its own employment ordinances; federal payroll rules (CPP, EI, T4, ROE) apply to both."
glob = load("global.json")

changelog = load("changelog.json")

# ---------------- Project Atlas: plan every item into a wave, workstream and dated stages ----------------
import datetime as dt
core = load("project-core.json")
project = {**core, **load("project-charter.json"), **load("project-raid.json")}
POLICY_DOMAIN = {"Ethics & Governance": "Governance", "Workplace Conduct": "Relations", "Hiring & Employment": "Recruit",
                 "Pay & Rewards": "Reward", "Time Off & Benefits": "Leave", "Work Arrangements": "Move",
                 "Performance & Development": "Grow", "Data, IP & Technology": "Data", "Health & Safety": "Safety",
                 "Separation": "Offboard", "Inclusion & Accessibility": "Relations"}
WS_OF = {d: i for i, w in enumerate(core["workstreams"]) for d in w["domains"]}
DD = lambda s: dt.date.fromisoformat(s)
freeze = [(DD(f["start"]), DD(f["end"])) for f in core["meta"]["holidayFreezes"][:1]]   # year-end freeze applies to everyone


def work_weeks(start, end):
    """Mondays from start to end, skipping weeks inside the global freeze."""
    out, d = [], start
    while d <= end:
        if not any(a <= d <= b for a, b in freeze): out.append(d)
        d += dt.timedelta(days=7)
    return out


def ptier(p):
    t = [PO[x]["tier"] for x in p.get("policies", []) if x in PO]
    return "legal" if "legal" in t else "public" if "public" in t else "semi" if "semi" in t else "best"


TYPE_RANK = {"Policy": 0, "Program": 1, "Committee": 1, "Notice": 2, "Training": 2, "Process-deep": 3, "Control": 4, "Filing": 4, "Record": 5, "Process": 5}
items = [("Policy", p["id"], POLICY_DOMAIN.get(p["category"], "Governance"), p["tier"], 0) for p in pols]
items += [("Process", p["id"], p["stage"], ptier(p), 0 if p.get("depth") == "deep" else 1) for p in procs]
items += [(r["type"], r["id"], r["domain"], r["tier"], 0) for r in reg]
waves = core["waves"]
stage_weeks = [s["weeks"] for s in core["stages"]]          # discover, draft, review, approve, live
plan, buckets = {}, {}
for typ, iid, dom, tier, deep in items:
    ws = WS_OF.get(dom, 0)
    rank = TYPE_RANK.get("Process-deep" if typ == "Process" and deep == 0 else typ, 4)
    buckets.setdefault(ws, []).append((tier == "best", rank, iid, typ))
for ws, lst in buckets.items():
    req = sorted([x for x in lst if not x[0]], key=lambda x: (x[1], x[2]))
    best = sorted([x for x in lst if x[0]], key=lambda x: (x[1], x[2]))
    n = len(req); cut1, cut2 = round(n * 0.40), round(n * 0.75)
    groups = {1: req[:cut1], 2: req[cut1:cut2], 3: req[cut2:], 4: best}
    for wi, grp in groups.items():
        w = waves[wi]; weeks = work_weeks(DD(w["start"]), DD(w["end"]))
        total = sum(stage_weeks)
        scale = min(1.0, (len(weeks) - 1) / total)
        sw = [max(1, round(x * scale)) for x in stage_weeks]
        slack = max(0, len(weeks) - sum(sw))
        for k, (_, _, iid, typ) in enumerate(grp):
            s0 = round(slack * k / max(1, len(grp) - 1)) if len(grp) > 1 else 0
            marks, acc = [], s0
            for x in sw:
                acc += x; marks.append(weeks[min(len(weeks) - 1, acc - 1)] + dt.timedelta(days=4))   # Friday of that week
            plan[iid] = [wi, ws, weeks[s0].isoformat()] + [m.isoformat() for m in marks]
project["plan"] = plan
project["videos"] = load("videos.json")["videos"]
assets_file = os.path.join(ROOT, "data", "video-assets.json")
project["videoAssets"] = json.load(open(assets_file)) if os.path.exists(assets_file) else {}
for v in project["videos"]:
    tlf = os.path.join(ROOT, "video", "out", v["id"], "timeline.json")
    if os.path.exists(tlf):
        tl = json.load(open(tlf)); v["duration"] = tl["duration"]; v["captions"] = [[c["start"], c["who"], c["text"]] for c in tl["captions"]]
    v.pop("scenes", None)

data = {"meta": {"verified": "September 2026", "built": "2026-09-30"}, "processes": procs, "policies": pols,
        "templates": tpls, "register": reg, "countries": countries, "global": glob, "changelog": changelog, "project": project}
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

css = open(S("styles.css")).read()
js = "\n".join(open(S(f)).read() for f in ["core.js", "viz.js", "views1.js", "views2.js", "project.js", "views3.js"])
url = sys.argv[1] if len(sys.argv) > 1 else "https://claude.ai/artifact/JVU8J4nKU6Sjj35K9TA7Cn"
if url:
    js = js.replace('const ARTIFACT_URL = "";', f'const ARTIFACT_URL = {json.dumps(url)};')
shell = open(S("shell.html")).read()
page = shell.replace("/*CSS*/", css).replace("/*DATA*/", blob).replace("/*JS*/", js)
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
open(os.path.join(ROOT, "dist", "atlas.html"), "w").write(page)
# local preview wrapper (not published)
open(os.path.join(ROOT, "dist", "preview.html"), "w").write("<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1,viewport-fit=cover'></head><body>" + page + "</body></html>")
print("processes", len(procs), "policies", len(pols), "templates", len(tpls), "register", len(reg), "countries", len(countries))
print("page bytes", len(page.encode()))
