#!/usr/bin/env python3
"""Validate a jurisdiction notes file. usage: python3 tools/validate_notes.py data/notes-XX.json"""
import json, sys, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda f: json.load(open(os.path.join(R, "data", f)))
procs = []
for f in "abcdefg": procs += D(f"proc-{f}.json")["processes"]
pols = D("pol-a.json")["policies"] + D("pol-b.json")["policies"]
tpls = [D("exit-survey.json")] + D("templates.json")["templates"]
pids = {p["id"] for p in procs}; polids = {p["id"] for p in pols}; tids = {t["id"] for t in tpls}
errs, warns = [], []
d = json.load(open(sys.argv[1]))
j = d.get("jurisdiction")
if not j: errs.append("missing jurisdiction")
for key, ids in [("processes", pids), ("policies", polids), ("templates", tids)]:
    m = d.get(key) or {}
    miss = sorted(ids - set(m)); extra = sorted(set(m) - ids)
    if miss: errs.append(f"{key}: missing {len(miss)}: {miss[:12]}")
    if extra: errs.append(f"{key}: unknown ids {extra}")
    for k, v in m.items():
        if not isinstance(v, str) or len(v.strip()) < 25: errs.append(f"{key}.{k}: note too short/empty")
        elif len(v) > 900: warns.append(f"{key}.{k}: note long ({len(v)} chars)")
dom = "Recruit Onboard Pay Reward Equity Benefits Leave Grow Relations Safety Data Governance Offboard".split()
types = "Program Notice Filing Training Control Committee Record".split()
reg = d.get("register") or []
if not (6 <= len(reg) <= 25): warns.append(f"register has {len(reg)} items (target 8-20)")
seen = set()
for r in reg:
    w = r.get("id", "?")
    if w in seen: errs.append(f"dup register id {w}")
    seen.add(w)
    for k in ["id","name","type","domain","tier","scope","countries","requirement","owner","cadence","cite","processes"]:
        if k not in r: errs.append(f"{w}: missing {k}")
    if r.get("type") not in types: errs.append(f"{w}: bad type {r.get('type')}")
    if r.get("domain") not in dom: errs.append(f"{w}: bad domain {r.get('domain')}")
    if r.get("tier") not in ("legal","public","semi","best"): errs.append(f"{w}: bad tier")
    if r.get("countries") != [j]: errs.append(f"{w}: countries must be [\"{j}\"]")
    for x in r.get("processes") or []:
        if x not in pids: errs.append(f"{w}: unknown process {x}")
for m in errs: print("ERROR", m)
for m in warns: print("WARN ", m)
print(f"{len(errs)} errors; {len(warns)} warnings"); print("OK" if not errs else "FIX")
