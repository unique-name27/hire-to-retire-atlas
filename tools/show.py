#!/usr/bin/env python3
"""Show library items compactly so you can write jurisdiction notes.
usage: python3 tools/show.py processes|policies|templates [ref_jur ...] [--from ID] [--to ID]
Prints id, name, depth/category, summary, and the existing notes for the given reference jurisdictions
(us, us-ca, ca, in, tw, cn)."""
import json, sys, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = lambda f: json.load(open(os.path.join(R, "data", f)))
kind = sys.argv[1]; args = sys.argv[2:]
fr = to = None
if "--from" in args: i = args.index("--from"); fr = args[i+1]; del args[i:i+2]
if "--to" in args: i = args.index("--to"); to = args[i+1]; del args[i:i+2]
refs = args
if kind == "processes":
    items = []
    for f in "abcdefg": items += D(f"proc-{f}.json")["processes"]
    order = ["Plan","Recruit","Onboard","Pay","Reward","Equity","Benefits","Leave","Grow","Move","Engage","Relations","Safety","Data","Offboard"]
    items.sort(key=lambda p: (order.index(p["stage"]), p["id"]))
    get = lambda p, j: p["countries"].get(j, "")
    head = lambda p: f'{p["id"]} | {p["name"]} | {p["stage"]} | {p["depth"]}\n  summary: {p["summary"][:260]}\n  steps: ' + "; ".join(s["label"] for s in p["steps"])
elif kind == "policies":
    items = D("pol-a.json")["policies"] + D("pol-b.json")["policies"]
    get = lambda p, j: p["countryAddenda"].get(j, "")
    head = lambda p: f'{p["id"]} | {p["name"]} | {p["category"]} | tier={p["tier"]}\n  purpose: {p["purpose"][:260]}'
else:
    items = [D("exit-survey.json")] + D("templates.json")["templates"]
    get = lambda p, j: p.get("countryNotes", {}).get(j, "")
    head = lambda p: f'{p["id"]} | {p["name"]} | {p["format"]}\n  purpose: {p["purpose"][:260]}'
on = fr is None
for p in items:
    if p["id"] == fr: on = True
    if not on: continue
    print(head(p))
    for j in refs: print(f"  [{j}] {get(p, j)}")
    print()
    if p["id"] == to: break
