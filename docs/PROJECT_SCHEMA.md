# Project content schema

Project Atlas is the 12-month program that documents, approves and launches every item in the library (57 policies, 97 processes, 284 legal obligations = 438 items) in 13 jurisdictions. `data/project-core.json` holds the fixed skeleton: dates, waves, workstreams, cross-cutting teams, stages, milestones and approval chains. Read it before writing anything below, and keep every date, wave id (W0 to W4), workstream id (WS1 to WS6), milestone id (M01 to M18) and chain id consistent with it.

Writing rules for all content: plain, direct English for HR, Legal and People Operations readers; sentence case; no marketing language; no em dashes; roles not names (the company has no named people in this library); concrete numbers and dates where they help. The company is a US-listed (Nasdaq) fabless semiconductor company with sites in the US (CA, CO, NC, TX, WA), Canada (Toronto, Vancouver), Germany, Israel, India, Taiwan, China and Vietnam. Where a statement depends on local law, ground it in the library's research (`data/country-*.json`, `data/notes-*.json`, `data/register.json`) and add "(verify)" if you could not confirm it there.

## data/project-charter.json

```json
{
  "charter": {
    "purpose": "1 paragraph",
    "problem": "1 paragraph: why now, what goes wrong without it",
    "objectives": [{ "id": "O1", "text": "", "measure": "", "target": "" }],          // 5 or 6
    "inScope": [""], "outOfScope": [""],                                                 // 6-10 each
    "deliverables": [{ "name": "", "detail": "" }],                                     // 8-12
    "successMeasures": [{ "kpi": "", "baseline": "", "target": "", "when": "" }],        // 6-8
    "approach": [""],                                                                    // 5-8 short paragraphs
    "assumptions": [""], "constraints": [""],                                            // 6-10 each
    "resourcing": [{ "role": "", "fte": "e.g. 1.0 or 0.2", "source": "", "notes": "" }], // 12-18 rows
    "budget": [{ "line": "", "estimate": "USD range", "notes": "" }],                    // 6-10 rows, realistic
    "stakeholders": [{ "group": "", "interest": "", "influence": "High|Medium|Low", "engagement": "" }] // 10-14
  },
  "governance": {
    "bodies": [{ "name": "", "members": "", "cadence": "", "purpose": "", "decisions": [""], "inputs": [""] }],  // 4-5
    "roles": [{ "role": "", "who": "", "responsibilities": [""], "timeCommitment": "" }],                       // 10-14
    "raci": { "roles": ["short role labels, 7-9"], "rows": [{ "activity": "", "cells": { "<role label>": "R|A|C|I|R/A" } }] }, // 14-20 rows; exactly one A per row
    "cadence": [{ "meeting": "", "when": "", "length": "", "attendees": "", "agenda": [""], "outputs": [""] }],  // 6-8
    "decisionRights": [{ "decision": "", "owner": "", "consulted": "", "escalateTo": "" }],                      // 10-14
    "escalation": [{ "level": 1, "who": "", "when": "", "sla": "" }],                                            // 4
    "definitionOfDone": [{ "stage": "Discover|Draft|Review|Approve|Go live", "criteria": [""], "evidence": "" }], // the 5 stages
    "docStandards": [{ "topic": "", "standard": "" }]                                                             // 10-14
  }
}
```

## data/project-raid.json

```json
{
  "raid": {
    "risks": [{ "id": "R01", "title": "", "detail": "", "likelihood": "High|Medium|Low", "impact": "High|Medium|Low", "owner": "", "mitigation": "", "trigger": "", "status": "Open" }],   // 18-24
    "assumptions": [{ "id": "A01", "text": "", "owner": "", "validateBy": "YYYY-MM-DD" }],          // 8-12
    "issues": [{ "id": "I01", "title": "", "detail": "", "owner": "", "action": "", "due": "YYYY-MM-DD", "priority": "High|Medium|Low", "status": "Open" }], // 3-5 realistic Mobilize issues
    "decisions": [{ "id": "D01", "title": "", "detail": "", "owner": "", "status": "Proposed|Agreed", "due": "YYYY-MM-DD" }]  // 10-14
  },
  "comms": [{ "id": "C01", "date": "YYYY-MM-DD", "wave": "W0..W4", "audience": "", "message": "", "channel": "", "owner": "", "type": "Announce|Engage|Train|Remind|Celebrate" }], // 26-34 across the 12 months
  "training": {
    "audiences": [{ "audience": "", "need": "", "modules": ["TR1"], "format": "", "when": "" }],   // 6-8
    "modules": [{ "id": "TR1", "title": "", "audience": "", "length": "", "format": "", "objectives": [""], "video": "V1|V2|V3|V4|V5|null" }] // 8-12
  },
  "countryGates": [{ "jur": "us|us-ca|us-co|us-nc|us-tx|us-wa|ca|de|il|in|tw|cn|vn", "consultation": "", "filing": "", "language": "", "leadTime": "", "notes": "", "verify": true }]  // exactly 13
}
```

The five tutorial videos are V1 "Project Atlas in 90 seconds", V2 "Find and update your items", V3 "Document a process in five steps", V4 "Set up and run an approval chain", V5 "Take a policy live in 13 countries". Training modules should point at them where relevant.

`countryGates` is what each jurisdiction needs before a policy can take effect there: employee-representative consultation or co-determination (for example Germany's works council, China's democratic procedure, Vietnam's consultation with the employee representative organization), filings or registrations with authorities (for example Taiwan work rules, Vietnam internal labor regulations), language requirements and realistic lead times. Set `verify` to true when the library's research does not confirm the point.
