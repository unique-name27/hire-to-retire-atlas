# Policy guide — authoring spec

You are writing the Policy Guide for an internal HR Policy & Process Library at a global, US-listed (Nasdaq), fabless
semiconductor company (~1,500-5,000 employees, engineering-heavy; HQ California; offices in Ontario & British Columbia
(Canada), Bengaluru (India), Taipei/Hsinchu (Taiwan), Shanghai/Shenzhen (China)). Today is 2026-09-22.

Web search is NOT available. For legal specifics rely on the verified research files:
  data/country-us.json, country-us-ca.json, country-ca.json, country-in.json, country-tw.json,
  country-cn.json, global.json   (look especially at "mandatoryPolicies", "stages", "keyFacts", "recentChanges")
Pull what you need with grep / python3 rather than reading whole files. Don't contradict them; mark unsure items "(verify)".

## Output
Write ONE JSON file at the given path: {"policies": [ POLICY, ... ]} in the order given. Then run
  python3 tools/validate.py policies <your file>
and fix every error and warning until it prints OK.

## POLICY object
{
  "id": "POL-09",                        // as assigned
  "name": "Anti-Harassment",             // as assigned
  "category": "as assigned",
  "tier": "legal | public | semi | best",  // legal = required by law in at least one in-scope country;
                                           // public = required/expected because US-listed; semi = driven by chip-industry
                                           // rules (export control, trade secrets, RBA); best = best practice
  "structure": "Global policy | Global policy + country addenda | Country-only policies",
  "owner": "policy owner function",
  "approver": "who approves (e.g. 'CHRO + General Counsel'; Board committee where applicable)",
  "review": "review cycle, e.g. 'Annual' or 'Every 2 years + on law change'",
  "audience": "who it applies to",
  "purpose": "2-3 sentences",
  "keyProvisions": ["8-14 bullet provisions written as policy statements ('The Company...', 'Employees must...'),
                     specific: thresholds, timelines, approvals, definitions"],
  "sampleLanguage": "A drafted excerpt of actual policy text, 120-250 words, ready to adapt, using [Company] placeholder.",
  "roles": [ {"role":"Employees|Managers|HR|Legal|...","duties":"1-2 sentences"} ],   // 3-6
  "countryAddenda": { "us": "...", "us-ca": "...", "ca": "...", "in": "...", "tw": "...", "cn": "..." },
        // each 1-4 sentences: what the local addendum must add/change, with statute + threshold + deadline.
        // Write "No addendum needed; global policy suffices." only when true.
  "decisions": ["4-8 design choices the company must make, phrased as a question with the common options,
                 e.g. 'Accrual vs. flexible PTO in the US? (Flexible avoids CA payout liability but needs tracking...)'"],
  "pitfalls": ["3-6 common mistakes"],
  "processes": ["process ids this policy governs, from the catalog in docs/PROCESS_SCHEMA.md"],
  "training": "required training / acknowledgment and cadence, or 'Acknowledgment at hire and on material change'",
  "related": ["other POL ids"],
  "sources": [ {"title":"...","url":"https://..."} ]   // 0-4, ONLY URLs that appear in the research files' "sources"
}

Process catalog & template ids are listed in docs/PROCESS_SCHEMA.md — read that file's catalog section.

## Quality bar
Write like a seasoned global employment counsel + HR policy lead. Specific, practical, correct, no filler.
Semiconductor angle where real (export control, trade secrets, insider trading windows, equity-heavy pay, RBA).
