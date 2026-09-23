# Output schema for country research files

Write ONE JSON file (valid JSON, UTF-8, no comments) at the path you are given. Validate it with:
  python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print('ok', len(json.dumps(d)))" <path>

Audience: HR leaders at a global, US-listed (Nasdaq) fabless/semiconductor company (~1,500-5,000 employees, engineers-heavy,
HQ in California). Content goes into an internal HR policy & process library. Write practical, specific, correct content.
Today is 2026-09-22. Verify anything that may have changed in 2024-2026 with WebSearch/WebFetch (prefer official government
sources, then major law firms: Littler, Ogletree, Fisher Phillips, Baker McKenzie, Mayer Brown, Khaitan, Cyril Amarchand,
Lee and Li, King & Wood Mallesons, Osler, McCarthy Tetrault, etc.). If you cannot confirm a figure, say "verify current figure"
rather than guessing. Do not invent statute numbers. Keep each string concise but information-dense (1-3 sentences).

```json
{
  "id": "<given id>",
  "name": "<given display name>",
  "shortName": "<short label, e.g. 'India'>",
  "region": "Americas | APAC",
  "parent": null,
  "lastVerified": "2026-09",
  "summary": "3-5 sentences: legal environment, what's distinctive, what a US-HQ semiconductor employer most often gets wrong.",
  "ratings": {
    "termination": 1, "representation": 1, "privacy": 1, "payTransparency": 1,
    "workingTime": 1, "leave": 1, "immigration": 1, "changeVelocity": 1
  },
  "ratingNotes": { "termination": "one line why", "...": "one line per rating key" },
  "keyFacts": [
    {"label": "Employment model", "value": "..."},
    {"label": "Contracts & offer letters", "value": "..."},
    {"label": "Probation", "value": "..."},
    {"label": "Notice (employer)", "value": "..."},
    {"label": "Notice (employee)", "value": "..."},
    {"label": "Statutory severance", "value": "..."},
    {"label": "Working hours & overtime", "value": "..."},
    {"label": "Minimum wage", "value": "..."},
    {"label": "Annual leave", "value": "..."},
    {"label": "Public holidays", "value": "..."},
    {"label": "Sick leave", "value": "..."},
    {"label": "Parental leave", "value": "..."},
    {"label": "Social insurance / mandatory benefits", "value": "..."},
    {"label": "Payroll frequency & final pay", "value": "..."},
    {"label": "Employee representation", "value": "..."},
    {"label": "Data privacy law", "value": "..."},
    {"label": "Record retention", "value": "..."},
    {"label": "Non-competes & IP", "value": "..."},
    {"label": "Language requirements", "value": "..."},
    {"label": "Regulator(s)", "value": "..."}
  ],
  "mandatoryPolicies": [
    {"name": "...", "requirement": "what the law requires and threshold (headcount etc.)", "source": "law / regulation name + section if sure", "level": "required | expected"}
  ],
  "stages": {
    "hiring":               [{"req": "requirement", "detail": "how to operationalize", "cite": "law"}],
    "onboarding":           [],
    "payAndPayroll":        [],
    "timeAndLeave":         [],
    "benefits":             [],
    "performanceAndConduct":[],
    "termination":          [],
    "exit":                 [],
    "recordsAndPrivacy":    [],
    "healthSafety":         []
  },
  "terminationDeepDive": {
    "voluntary": "resignation mechanics, notice, acceptance, garden leave, buyout of notice",
    "involuntary": "grounds, process, documentation, risk",
    "redundancy": "individual redundancy / collective layoff thresholds, notices, consultation, government filings",
    "finalPayTiming": "exact deadlines + penalties",
    "requiredDocuments": ["documents that must be issued at exit"],
    "releaseAgreements": "enforceability of waivers/releases/settlement, required terms/review periods",
    "typicalPackage": "market practice severance for a tech/semiconductor employer (label as market practice)"
  },
  "recentChanges": [ {"date": "YYYY-MM", "title": "...", "detail": "...", "impact": "high|medium|low"} ],
  "watchlist":     [ {"title": "...", "detail": "...", "expected": "when"} ],
  "calendar":      [ {"month": 1, "title": "...", "detail": "deadline / filing / renewal"} ],
  "gotchas":       [ "common mistakes by US-HQ multinationals here" ],
  "semiconductorNotes": [ "items specific to chip/tech employers here: trade secrets, export control, security, talent, shift work, etc." ],
  "sources": [ {"title": "...", "url": "https://..."} ]
}
```

Targets: ratings 1-5 (5 = most demanding/complex for employer). keyFacts: all 20 labels, in that order.
mandatoryPolicies: 10-25. Each stage: 5-10 items. recentChanges: 6-15 (2024-2026 only, newest first).
watchlist: 3-8. calendar: 6-15. gotchas: 6-10. semiconductorNotes: 3-8. sources: 10-25 real URLs you actually visited or saw in search results.
