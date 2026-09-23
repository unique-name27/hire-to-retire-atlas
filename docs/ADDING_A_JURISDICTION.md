# Adding a jurisdiction to the HR Policy & Process Library — two deliverables

Context: internal HR library ("Hire-to-Retire Atlas") for a US-listed (Nasdaq) fabless semiconductor company,
~1,500-5,000 employees, HQ California. Existing jurisdictions: US Federal (us), California (us-ca), Colorado (us-co), North Carolina (us-nc), Texas (us-tx),
Washington (us-wa), Canada (ca: Toronto/Ontario + Vancouver/BC), Germany (de), Israel (il), India (in), Taiwan (tw),
China (cn), Vietnam (vn). You are adding ONE new jurisdiction.

After both files validate, add the id to JURS in build.py and to JUR in src/core.js (with its region), then rebuild.

## Deliverable 1 — country research file
Follow docs/COUNTRY_SCHEMA.md exactly (same schema as the existing country files). Write
data/country-<id>.json and validate it with the command in docs/COUNTRY_SCHEMA.md.
Look at data/country-us-ca.json (for a US state) or country-in.json (for a country) as a model of
the depth and tone expected. Verify 2024-2026 changes with WebSearch / WebFetch (official sources first, then major law
firms). If WebSearch stops working, keep going with WebFetch on official URLs you know, and mark unconfirmed figures
"(verify)". Never invent statute numbers or figures.

## Deliverable 2 — notes file for every process, policy and template
Every process, policy and template in the library has a note per jurisdiction. Write
data/notes-<id>.json :
{
  "jurisdiction": "<id>",
  "processes": { "PL-01": "note", ... every process id ... },     // 97 entries
  "policies":  { "POL-01": "addendum", ... every policy id ... }, // 57 entries
  "templates": { "T-EXIT-SURVEY": "note", ... every template id ... }, // 16 entries
  "register":  [ REGISTER_ITEM, ... ]                              // 8-20 entries
}
- See the items and the existing notes for comparison with:
    python3 tools/show.py processes <ref jurisdictions...> [--from ID --to ID]
    python3 tools/show.py policies <refs...>
    python3 tools/show.py templates <refs...>
  (For a US state use refs `us us-ca`; for a country use refs `us in` or `us ca`.) Work through them in batches of ~15-20.
- Each note: 1-3 sentences (deep processes and core policies up to 4), specific to THIS jurisdiction and THIS item:
  statute, threshold, deadline, document, consultation body, form name, penalty. Same register as existing notes.
  For a policy, say what the local addendum must add or change. For a template, say what to adapt locally.
- US states: the US Federal note already applies, so write only what the state adds or changes. Where the state truly adds
  nothing, write e.g. "No Texas-specific rule; follow the US Federal note." — but check first (final pay, leave, pay
  transparency, non-competes, privacy, AI, WARN, E-Verify, posters, unemployment, workers' comp, taxes, local ordinances).
- Build the file incrementally (e.g. a python script that loads/updates the JSON per batch) rather than one giant write.
- REGISTER_ITEM = {"id":"R-<ID>-01" (uppercase id without dash, e.g. R-DE-01, R-USTX-01), "name":"...",
    "type":"Program|Notice|Filing|Training|Control|Committee|Record",
    "domain":"Recruit|Onboard|Pay|Reward|Equity|Benefits|Leave|Grow|Relations|Safety|Data|Governance|Offboard",
    "tier":"legal|public|semi|best", "scope":"<jurisdiction display name>", "countries":["<id>"],
    "requirement":"1-2 sentences: what, threshold, deadline", "owner":"function", "cadence":"...",
    "cite":"law name + section", "processes":["related process ids"]}
  These are the jurisdiction's mandatory programs, notices/postings, filings, trainings, controls, committees and records
  (e.g. Germany: works council information duties, HinSchG reporting channel, disabled-employee levy filing; Israel:
  sexual-harassment commissioner and bylaw; Vietnam: internal labour regulations registration; Texas: Payday Law notices).
- Validate: python3 tools/validate_notes.py data/notes-<id>.json  → fix until OK.

## Reply
When both files validate, reply with only: both file paths + byte sizes, the validator's final line for each, and 5 bullets
of the most important 2025-26 developments you verified (with source URLs).
