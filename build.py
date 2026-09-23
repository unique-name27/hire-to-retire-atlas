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
for f in "abcde":
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
data = {"meta": {"verified": "September 2026", "built": "2026-09-23"}, "processes": procs, "policies": pols,
        "templates": tpls, "register": reg, "countries": countries, "global": glob, "changelog": changelog}
blob = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")

css = open(S("styles.css")).read()
js = "\n".join(open(S(f)).read() for f in ["core.js", "viz.js", "views1.js", "views2.js", "views3.js"])
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
