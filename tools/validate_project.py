#!/usr/bin/env python3
"""Validate Project Atlas content files.
usage: python3 tools/validate_project.py data/project-charter.json | data/project-raid.json | data/videos.json"""
import json, os, re, sys

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JURS = ["us", "us-ca", "us-co", "us-nc", "us-tx", "us-wa", "ca", "de", "il", "in", "tw", "cn", "vn"]
LMH = {"High", "Medium", "Low"}
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
core = json.load(open(os.path.join(R, "data", "project-core.json")))
START, END = core["meta"]["start"], core["meta"]["end"]
errs, warns = [], []


def need(obj, keys, where):
    for k in keys:
        if k not in obj or obj[k] in (None, "", []):
            errs.append(f"{where}: missing {k}")


def count(lst, lo, hi, where):
    n = len(lst or [])
    if not lo <= n <= hi:
        warns.append(f"{where}: {n} entries (target {lo}-{hi})")


def text_checks(s, where):
    if "—" in s:
        errs.append(f"{where}: contains an em dash")


def walk_text(o, where):
    if isinstance(o, str):
        text_checks(o, where)
    elif isinstance(o, list):
        for i, x in enumerate(o):
            walk_text(x, f"{where}[{i}]")
    elif isinstance(o, dict):
        for k, v in o.items():
            walk_text(v, f"{where}.{k}")


def charter(d):
    c, g = d.get("charter") or {}, d.get("governance") or {}
    need(c, ["purpose", "problem", "objectives", "inScope", "outOfScope", "deliverables", "successMeasures", "approach", "assumptions", "constraints", "resourcing", "budget", "stakeholders"], "charter")
    for o in c.get("objectives", []): need(o, ["id", "text", "measure", "target"], "objective")
    for o in c.get("successMeasures", []): need(o, ["kpi", "baseline", "target", "when"], "successMeasure")
    for o in c.get("resourcing", []): need(o, ["role", "fte", "source"], "resourcing")
    for o in c.get("budget", []): need(o, ["line", "estimate"], "budget")
    for o in c.get("stakeholders", []):
        need(o, ["group", "interest", "influence", "engagement"], "stakeholder")
        if o.get("influence") not in LMH: errs.append(f"stakeholder {o.get('group')}: bad influence")
    count(c.get("objectives"), 5, 6, "objectives"); count(c.get("deliverables"), 8, 12, "deliverables")
    count(c.get("resourcing"), 12, 18, "resourcing"); count(c.get("stakeholders"), 10, 14, "stakeholders")
    need(g, ["bodies", "roles", "raci", "cadence", "decisionRights", "escalation", "definitionOfDone", "docStandards"], "governance")
    raci = g.get("raci") or {}
    roles = raci.get("roles") or []
    for r in raci.get("rows", []):
        cells = r.get("cells") or {}
        for k, v in cells.items():
            if k not in roles: errs.append(f"raci {r.get('activity')}: unknown role {k}")
            if v not in ("R", "A", "C", "I", "R/A", ""): errs.append(f"raci {r.get('activity')}: bad cell {v}")
        a = sum(1 for v in cells.values() if v in ("A", "R/A"))
        if a != 1: errs.append(f"raci {r.get('activity')}: {a} accountable roles (need exactly 1)")
    stages = [s.get("stage") for s in g.get("definitionOfDone", [])]
    if stages != ["Discover", "Draft", "Review", "Approve", "Go live"]: errs.append(f"definitionOfDone stages {stages}")


def raid(d):
    r = d.get("raid") or {}
    for x in r.get("risks", []):
        need(x, ["id", "title", "detail", "likelihood", "impact", "owner", "mitigation", "trigger", "status"], f"risk {x.get('id')}")
        if x.get("likelihood") not in LMH or x.get("impact") not in LMH: errs.append(f"risk {x.get('id')}: bad rating")
    for x in r.get("assumptions", []):
        need(x, ["id", "text", "owner", "validateBy"], f"assumption {x.get('id')}")
    for x in r.get("issues", []):
        need(x, ["id", "title", "detail", "owner", "action", "due", "priority", "status"], f"issue {x.get('id')}")
    for x in r.get("decisions", []):
        need(x, ["id", "title", "detail", "owner", "status", "due"], f"decision {x.get('id')}")
        if x.get("status") not in ("Proposed", "Agreed"): errs.append(f"decision {x.get('id')}: bad status")
    count(r.get("risks"), 18, 24, "risks")
    for x in d.get("comms", []):
        need(x, ["id", "date", "wave", "audience", "message", "channel", "owner", "type"], f"comms {x.get('id')}")
        if not DATE.match(x.get("date", "")) or not START <= x["date"] <= END: errs.append(f"comms {x.get('id')}: date {x.get('date')} outside project")
    count(d.get("comms"), 26, 34, "comms")
    t = d.get("training") or {}
    mods = {m.get("id") for m in t.get("modules", [])}
    for a in t.get("audiences", []):
        for m in a.get("modules", []):
            if m not in mods: errs.append(f"training audience {a.get('audience')}: unknown module {m}")
    for m in t.get("modules", []):
        need(m, ["id", "title", "audience", "length", "format", "objectives"], f"module {m.get('id')}")
        if m.get("video") not in (None, "V1", "V2", "V3", "V4", "V5"): errs.append(f"module {m.get('id')}: bad video")
    gates = d.get("countryGates") or []
    ids = [x.get("jur") for x in gates]
    if sorted(ids) != sorted(JURS): errs.append(f"countryGates jurisdictions {ids}")
    for x in gates: need(x, ["jur", "consultation", "filing", "language", "leadTime"], f"countryGate {x.get('jur')}")


SCENES = {
    "title": ["kicker", "title", "subtitle"], "bigNumbers": ["title", "items"], "steps": ["title", "steps"],
    "timeline": ["title", "bars"], "appTable": ["title", "columns", "rows"], "swimlane": ["title", "lanes", "nodes"],
    "chain": ["title", "steps"], "map": ["title", "groups"], "checklist": ["title", "items"],
    "versus": ["left", "right"], "callout": ["text", "label"], "outro": ["title", "next", "where"],
}
OPS = {"filter", "highlight", "set", "toast"}
CHIP = {"wave", "think", "thumbs", "alarm", "celebrate", "point", None}


def videos(d):
    vs = d.get("videos") or []
    if [v.get("id") for v in vs] != ["V1", "V2", "V3", "V4", "V5"]: errs.append("videos must be V1..V5 in order")
    for v in vs:
        need(v, ["id", "title", "episode", "summary", "scenes"], v.get("id"))
        sc = v.get("scenes") or []
        if not 6 <= len(sc) <= 9: warns.append(f"{v['id']}: {len(sc)} scenes (target 6-9)")
        if sc and sc[0].get("type") != "title": errs.append(f"{v['id']}: first scene must be title")
        if sc and sc[-1].get("type") != "outro": errs.append(f"{v['id']}: last scene must be outro")
        words = 0
        for s in sc:
            w = f"{v['id']}.{s.get('id')}"
            t = s.get("type")
            if t not in SCENES: errs.append(f"{w}: bad type {t}"); continue
            need(s.get("params") or {}, SCENES[t], w)
            if s.get("chip") not in CHIP: errs.append(f"{w}: bad chip {s.get('chip')}")
            if not s.get("lines"): errs.append(f"{w}: no lines")
            for i, l in enumerate(s.get("lines") or []):
                if l.get("who") not in ("ava", "leo"): errs.append(f"{w}.{i}: bad who")
                n = len((l.get("text") or "").split()); words += n
                if not 4 <= n <= 28: warns.append(f"{w}.{i}: {n} words")
                if re.search(r"[()/]|e\.g\.", l.get("text", "")): warns.append(f"{w}.{i}: avoid brackets, slashes and e.g.")
                for o in l.get("ops") or []:
                    if t != "appTable": errs.append(f"{w}.{i}: ops only allowed in appTable")
                    if o.get("op") not in OPS: errs.append(f"{w}.{i}: bad op {o.get('op')}")
            p = s.get("params") or {}
            if t == "map":
                for g in p.get("groups", []):
                    for c in g.get("codes", []):
                        if c not in JURS: errs.append(f"{w}: bad code {c}")
            if t == "timeline":
                for b in p.get("bars", []):
                    if not (DATE.match(b.get("start", "")) and DATE.match(b.get("end", ""))): errs.append(f"{w}: bad bar dates")
            if t == "appTable":
                cols = len(p.get("columns", []))
                for r in p.get("rows", []):
                    if len(r) != cols: errs.append(f"{w}: row width {len(r)} != {cols}")
        if not 200 <= words <= 260: warns.append(f"{v['id']}: {words} words (target 210-250)")


d = json.load(open(sys.argv[1]))
walk_text(d, os.path.basename(sys.argv[1]))
name = os.path.basename(sys.argv[1])
{"project-charter.json": charter, "project-raid.json": raid, "videos.json": videos}[name](d)
for e in errs: print("ERROR", e)
for w in warns: print("WARN ", w)
print(f"{name}: {len(errs)} errors, {len(warns)} warnings")
sys.exit(1 if errs else 0)
