#!/usr/bin/env python3
"""Validate process / policy JSON files for the HR library."""
import json, sys, re

LANES = set("""Employee|Candidate|Manager|Dept Head|HRBP|Recruiter|TA Coordinator|People Ops|Payroll|Total Rewards|Stock Admin|Benefits|Employee Relations|Legal|Immigration|Trade Compliance|Ethics & Compliance|IT|Security|Facilities|EHS|Finance|FP&A|CHRO|CEO|Comp Committee|Board|Vendor|Mobility|L&D|HR Analytics|Works Council/Union""".split("|"))
COUNTRIES = ["us", "us-ca", "ca", "in", "tw", "cn"]
_R = __import__("os").path.dirname(__import__("os").path.dirname(__import__("os").path.abspath(__file__)))
def _tpl_ids():
    import os
    ids = {"T-EXIT-SURVEY"}
    for f in ["templates.json"] + [f"templates-{c}.json" for c in "abcde"]:
        fp = os.path.join(_R, "data", f)
        if os.path.exists(fp): ids |= {t["id"] for t in json.load(open(fp))["templates"]}
    return ids
TEMPLATES = _tpl_ids()
PROC_IDS = set("""PL-01 PL-02 PL-03 PL-04 PL-05 TA-01 TA-02 TA-03 TA-04 TA-05 TA-06 TA-07 TA-08 TA-09 TA-10 TA-11 ON-01 ON-02 ON-03 ON-04 ON-05 PY-01 PY-02 PY-03 PY-04 PY-05 CO-01 CO-02 CO-03 CO-04 CO-05 CO-06 CO-07 EQ-01 EQ-02 EQ-03 EQ-04 EQ-05 EQ-06 BN-01 BN-02 BN-03 BN-04 BN-05 BN-06 LV-01 LV-02 LV-03 LV-04 LV-05 PD-01 PD-02 PD-03 PD-04 PD-05 PD-06 PD-07 MV-01 MV-02 MV-03 MV-04 MV-05 MV-06 ER-01 ER-02 ER-03 ER-04 ER-05 ER-06 ER-07 ER-08 ER-09 ER-10 HS-01 HS-02 HS-03 DS-01 DS-02 DS-03 DS-04 DS-05 DS-06 DS-07 DS-08 EN-01 EN-02 EN-03 OF-01 OF-02 OF-03 OF-04 OF-05 OF-06 OF-07 OF-08 OF-09 OF-10""".split())
POL_IDS = set("POL-%02d" % i for i in range(1, 58))

errs, warns = [], []
def E(m): errs.append(m)
def W(m): warns.append(m)

def rng(obj, key, lo, hi, where):
    n = len(obj.get(key) or [])
    if n < lo or n > hi:
        W(f"{where}: '{key}' has {n} items (target {lo}-{hi})")

def check_process(p):
    w = p.get("id", "?")
    for k in ["id","name","stage","depth","summary","owner","trigger","outputs","systems","sla","lanes","steps","raci","controls","kpis","considerations","variations","countries","templates","policies","related"]:
        if k not in p: E(f"{w}: missing key {k}")
    if w not in PROC_IDS: E(f"{w}: unknown process id")
    deep = p.get("depth") == "deep"
    lanes = p.get("lanes") or []
    for l in lanes:
        if l not in LANES: E(f"{w}: lane '{l}' not in vocabulary")
    steps = p.get("steps") or []
    ids = [s.get("id") for s in steps]
    if len(set(ids)) != len(ids): E(f"{w}: duplicate step ids")
    idset = set(ids)
    if steps and steps[0].get("type") != "start": E(f"{w}: first step must be type start")
    if not any(s.get("type") == "end" for s in steps): E(f"{w}: needs an end step")
    used_lanes = set()
    for s in steps:
        sid = f"{w}.{s.get('id')}"
        t = s.get("type")
        if t not in ("start","task","decision","end"): E(f"{sid}: bad type {t}")
        if s.get("lane") not in lanes: E(f"{sid}: lane '{s.get('lane')}' not in process lanes")
        used_lanes.add(s.get("lane"))
        if not s.get("label"): E(f"{sid}: missing label")
        elif len(s["label"]) > 42: W(f"{sid}: label >42 chars ({len(s['label'])})")
        if not s.get("detail"): E(f"{sid}: missing detail")
        if t == "decision":
            br = s.get("branches") or []
            if not (2 <= len(br) <= 3): E(f"{sid}: decision needs 2-3 branches")
            for b in br:
                if b.get("to") not in idset: E(f"{sid}: branch to unknown step {b.get('to')}")
                if not b.get("label"): E(f"{sid}: branch missing label")
            if s.get("next"): E(f"{sid}: decision must not have next")
        elif t in ("start","task"):
            nx = s.get("next") or []
            if len(nx) != 1: E(f"{sid}: start/task needs exactly 1 next")
            for n in nx:
                if n not in idset: E(f"{sid}: next to unknown step {n}")
        elif t == "end":
            if s.get("next") or s.get("branches"): E(f"{sid}: end must not have next/branches")
    for l in lanes:
        if l not in used_lanes: W(f"{w}: lane '{l}' has no steps")
    c = p.get("countries") or {}
    for k in COUNTRIES:
        if not c.get(k): E(f"{w}: countries missing '{k}'")
    for t in p.get("templates") or []:
        if t not in TEMPLATES: E(f"{w}: unknown template {t}")
    for t in p.get("policies") or []:
        if t not in POL_IDS: E(f"{w}: unknown policy {t}")
    for t in p.get("related") or []:
        if t not in PROC_IDS: E(f"{w}: unknown related process {t}")
    for r in p.get("raci") or []:
        for k in ["activity","R","A"]:
            if not r.get(k): E(f"{w}: raci row missing {k}")
    for v in p.get("variations") or []:
        if not v.get("when") or not v.get("how"): E(f"{w}: variation needs when/how")
    if deep:
        rng(p,"steps",11,16,w); rng(p,"raci",6,10,w); rng(p,"controls",4,8,w); rng(p,"kpis",4,6,w)
        rng(p,"considerations",6,10,w); rng(p,"variations",5,8,w)
    else:
        rng(p,"steps",6,10,w); rng(p,"raci",3,5,w); rng(p,"controls",2,4,w); rng(p,"kpis",2,4,w)
        rng(p,"considerations",3,6,w); rng(p,"variations",2,4,w)

def check_policy(p):
    w = p.get("id","?")
    for k in ["id","name","category","tier","structure","owner","approver","review","audience","purpose","keyProvisions","sampleLanguage","roles","countryAddenda","decisions","pitfalls","processes","training","related","sources"]:
        if k not in p: E(f"{w}: missing key {k}")
    if w not in POL_IDS: E(f"{w}: unknown policy id")
    if p.get("tier") not in ("legal","public","semi","best"): E(f"{w}: bad tier")
    c = p.get("countryAddenda") or {}
    for k in COUNTRIES:
        if not c.get(k): E(f"{w}: countryAddenda missing '{k}'")
    for t in p.get("processes") or []:
        if t not in PROC_IDS: E(f"{w}: unknown process {t}")
    for t in p.get("related") or []:
        if t not in POL_IDS: E(f"{w}: unknown related policy {t}")
    rng(p,"keyProvisions",8,14,w); rng(p,"roles",3,6,w); rng(p,"decisions",4,8,w); rng(p,"pitfalls",3,6,w)
    n = len((p.get("sampleLanguage") or "").split())
    if n < 100 or n > 280: W(f"{w}: sampleLanguage {n} words (target 120-250)")
    for s in p.get("sources") or []:
        if not str(s.get("url","")).startswith("http"): E(f"{w}: bad source url")

def main():
    kind, path = sys.argv[1], sys.argv[2]
    try:
        d = json.load(open(path))
    except Exception as ex:
        print("JSON ERROR:", ex); sys.exit(1)
    items = d.get(kind) or []
    if not items: E(f"no '{kind}' array")
    for it in items:
        (check_process if kind == "processes" else check_policy)(it)
    for m in errs: print("ERROR", m)
    for m in warns: print("WARN ", m)
    print(f"{len(items)} {kind}; {len(errs)} errors; {len(warns)} warnings")
    print("OK" if not errs and not warns else "FIX")

main()
