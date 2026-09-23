#!/usr/bin/env python3
"""Validate a templates file. usage: python3 tools/validate_templates.py data/templates-x.json"""
import json, sys, os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(R, "tools"))
JURS = ["us", "us-ca", "us-co", "us-nc", "us-tx", "us-wa", "ca", "de", "il", "in", "tw", "cn", "vn"]
CATS = "Recruit Onboard Perform Reward Move Leave Safety Relations Data Governance Offboard".split()
FMTS = "guide checklist form script matrix document survey letter".split()
TYPES = "check prompt field say note question para".split()
D = lambda f: json.load(open(os.path.join(R, "data", f)))
pids = set()
for f in "abcdefg": pids |= {p["id"] for p in D(f"proc-{f}.json")["processes"]}
polids = {p["id"] for p in D("pol-a.json")["policies"] + D("pol-b.json")["policies"]}
errs, warns = [], []
d = json.load(open(sys.argv[1]))
ts = d.get("templates") or []
if not ts: errs.append("no templates array")
for t in ts:
    w = t.get("id", "?")
    for k in ["id","name","category","format","purpose","audience","when","owner","sections","notes","countryNotes","processes","policies"]:
        if k not in t: errs.append(f"{w}: missing {k}")
    if not re.match(r"^T-[A-Z0-9-]+$", w): errs.append(f"{w}: bad id")
    if t.get("category") not in CATS: errs.append(f"{w}: bad category {t.get('category')}")
    if t.get("format") not in FMTS: errs.append(f"{w}: bad format {t.get('format')}")
    secs = t.get("sections") or []
    if not (3 <= len(secs) <= 8): warns.append(f"{w}: {len(secs)} sections (target 3-8)")
    n = 0; ids = set()
    for s in secs:
        if not s.get("title"): errs.append(f"{w}: section missing title")
        for it in s.get("items") or []:
            n += 1
            if it.get("id") in ids: errs.append(f"{w}: duplicate item id {it.get('id')}")
            ids.add(it.get("id"))
            if it.get("type") not in TYPES: errs.append(f"{w}.{it.get('id')}: bad type {it.get('type')}")
            if not (it.get("text") or "").strip(): errs.append(f"{w}.{it.get('id')}: empty text")
    if not (25 <= n <= 70): warns.append(f"{w}: {n} items (target 25-70)")
    cn = t.get("countryNotes") or {}
    for j in JURS:
        if not (cn.get(j) or "").strip(): errs.append(f"{w}: countryNotes missing {j}")
    for x in t.get("processes") or []:
        if x not in pids: errs.append(f"{w}: unknown process {x}")
    for x in t.get("policies") or []:
        if x not in polids: errs.append(f"{w}: unknown policy {x}")
    if not (4 <= len(t.get("notes") or []) <= 8): warns.append(f"{w}: notes count {len(t.get('notes') or [])}")
for m in errs: print("ERROR", m)
for m in warns: print("WARN ", m)
print(f"{len(ts)} templates; {len(errs)} errors; {len(warns)} warnings"); print("OK" if not errs and not warns else "FIX")
