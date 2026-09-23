# Templates & compliance register — authoring spec

Context: internal HR Policy & Process Library for a global, US-listed (Nasdaq) fabless semiconductor company
(~1,500-5,000 employees; HQ California). Jurisdictions (ids): US Federal (us), California (us-ca), Colorado (us-co),
North Carolina (us-nc), Texas (us-tx), Washington (us-wa), Canada — Toronto/Ontario and Vancouver/BC (ca), Germany (de),
Israel (il), India (in), Taiwan (tw), China (cn), Vietnam (vn). HRIS Darwinbox, ATS Greenhouse.
For legal specifics rely on data/country-<id>.json and data/global.json (grep/python to extract; don't read whole files);
mark anything unconfirmed "(verify)". Process & policy ids: see the catalog in docs/PROCESS_SCHEMA.md.

## A) Templates  →  {"templates": [TEMPLATE, ...]}
TEMPLATE = {
  "id": "T-...", "name": "...",
  "category": "Recruit|Onboard|Perform|Reward|Move|Leave|Safety|Relations|Data|Governance|Offboard",
  "format": "guide|checklist|form|script|matrix|document|survey|letter",
  "purpose": "2 sentences", "audience": "who uses it", "when": "timing / trigger", "owner": "function",
  "sections": [ {"title": "...", "intro": "optional 1-2 sentences",
                 "items": [ {"id":"i1", "type":"check|prompt|field|say|note|question|para",
                             "text":"the actual content — a checklist line, an interview prompt, a form field label,
                                     a script line to say, a paragraph of letter/document text, etc.",
                             "detail":"optional guidance / follow-ups / why", "owner":"optional lane", "when":"optional"} ] } ],
  "notes": ["4-8 design considerations / how to use / pitfalls"],
  "countryNotes": { all 13 jurisdiction ids -> 1-2 sentences each: what to adapt locally (statute, form, deadline) },
  "processes": ["process ids"], "policies": ["POL ids"]
}
Item types: check = checklist line; field = form field label (detail = helper text / allowed values); question = a question
to ask or answer; prompt = interviewer/facilitator prompt with probes in detail; say = a script line to say verbatim;
para = a paragraph of letter or document text, with [Placeholders] in square brackets; note = guidance callout.
Each template: 3-8 sections, 25-70 items total, unique item ids within the template. Real, usable content — the actual
questions, script lines, fields, checklist lines and letter paragraphs — not descriptions of them.
Validate with: python3 tools/validate_templates.py <file>

## B) register.json  →  {"items": [ITEM, ...]}
A compliance obligations register: programs, notices/postings, filings/reports, trainings, controls, committees that
must exist — the things that are NOT themselves a policy or a process in the catalog.
ITEM = {"id":"R-001", "name":"...", "type":"Program|Notice|Filing|Training|Control|Committee|Record",
        "domain":"Recruit|Onboard|Pay|Reward|Equity|Benefits|Leave|Grow|Relations|Safety|Data|Governance|Offboard",
        "tier":"legal|public|semi|best", "scope":"Global|US|California|Canada|Ontario|BC|India|Taiwan|China|Multi-country",
        "countries":["us","us-ca","ca","in","tw","cn"] (subset that applies),
        "requirement":"1-2 sentences: what, threshold, deadline", "owner":"function", "cadence":"...",
        "cite":"law/rule name", "processes":["related process ids"]}
Target 110-150 items covering all six jurisdictions + public-company + semiconductor items. Examples: CA WVPP annual
review; CA harassment training biennial; CA pay data report (May); SB 294 notice Feb 1; EEO-1 (note proposed rescission);
OSHA 300A posting; I-9 audit; ACA 1094/1095-C; Form 5500; ON disconnecting-from-work written policy; ON electronic
monitoring policy; ON OHSA harassment program annual review; AODA; BC pay transparency report Nov 1; ROE within 5 days;
T4; India POSH IC constitution + annual report; India grievance redressal committee; EPF/ESI monthly; Form 16 (now 130);
Taiwan work rules filing (30+); labor-management meetings quarterly; Taiwan sexual-harassment & 2026 bullying measures;
China rules via democratic procedure; union fee; social insurance base adjustment; SAFE registration for equity;
10-K human capital; proxy CD&A; Form 4 within 2 business days; clawback policy Exhibit 97; insider trading policy
Exhibit 19; SOX ICFR payroll/equity controls; hotline (SOX 301); Rule 21F-17 agreement review; deemed-export license
determination; I-129 Part 6; Technology Control Plan; DOJ Data Security Program diligence; RBA self-assessment; etc.
