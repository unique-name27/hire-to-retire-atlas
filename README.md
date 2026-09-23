# Hire-to-Retire Atlas

An interactive HR policy and process library for a US-listed semiconductor company, covering the employee lifecycle from requisition to offboarding across 13 jurisdictions.

The published version is a Claude artifact: <https://claude.ai/artifact/JVU8J4nKU6Sjj35K9TA7Cn>. It's private until the owner shares it.

> Working draft for HR, Legal and People Operations, based on research completed in September 2026. Items marked "verify" were not confirmed against a primary source. This is not legal advice, so confirm country specifics with employment counsel before adopting a policy.

## What's in it

| Area | Count | Detail |
|---|---|---|
| Processes | 97 | Swimlane flowchart, steps with timings and embedded controls, KPIs, variations and a note for each jurisdiction. The 22 deep dives also have a full RACI. |
| Policies | 57 | Purpose, key provisions, draft wording, roles, country addenda, decisions to make and common mistakes. |
| Legal obligations | 284 | Programs, notices, filings, trainings, controls, committees and records. |
| Templates | 48 | Forms, letters, scripts, guides and checklists from the job description to the exit certificate, each with notes for all 13 jurisdictions. Includes the full exit survey (36 questions with follow-up logic), offer letter with country clauses, written warning, FCRA notices, RIF communications and more. |
| Jurisdictions | 13 | US federal; California, Colorado, North Carolina, Texas and Washington; Canada (Toronto and Vancouver); Germany (with the EU layer); Israel; India; Taiwan; China; Vietnam. |

The master checklist combines all 438 policies, processes and obligations so a team can track status, owner, assignee and target date for each one.

**What's changed** has two tabs. *Library changes* lists release notes for every change to the library (`data/changelog.json`) plus a live list of accepted and implemented proposals. *Legal changes* is the 2024–2026 legal-change timeline from the research. Each process, policy and template page also has its own Change history.

## How the page works

- **Single self-contained page.** `build.py` inlines the CSS, JavaScript and all JSON data into `dist/atlas.html`. There's no framework and no runtime dependency other than Google Fonts.
- **Routing** uses plain hash tokens (`#process.OF-01`, `#policy.POL-09`, `#country.de`), because an artifact link only carries a plain `#anchor`.
- **Shared data.** Checklist status, proposals, votes, discussion and policy decision logs are stored with the artifact `db` capability, so everyone with access sees the same state:

  | Collection | Contents | Who can write |
  |---|---|---|
  | `proposals` | Proposed changes, each targeting a process, policy, template, country rule or checklist item | Anyone who can interact |
  | `reviews` | Accept, decline or implemented decisions on proposals | Editors only |
  | `votes/{user}` | Each viewer's support votes | That viewer only |
  | `discussion` | Comments on proposals | Anyone who can interact |
  | `status` | Checklist status, owner, assignee, target date and notes | Anyone who can interact |
  | `decisions` | The team's recorded choice for each policy design decision | Anyone who can interact |

- **Other capabilities used:**
  - `user` (profile scope) shows names and avatars.
  - `comments` provides the in-page Comment button and "Send to Claude".
  - `downloads` provides the Markdown and CSV exports.
- **Display settings.** Each viewer can pick a style (Clean, Document, Compact or High contrast), an accent colour, light or dark mode, and the home layout (Overview, Process map or Workspace). These are saved in that viewer's browser only.

## Repository layout

```
build.py                 Assemble dist/atlas.html from src/ and data/
src/
  shell.html             Page skeleton (top bar, nav, placeholders for CSS, data and JS)
  styles.css             Design tokens, the four display styles, light/dark, components
  core.js                Data indexes, display settings, collaboration layer, propose-change modal
  viz.js                 Swimlane flowcharts, coverage map, lifecycle map, charts
  views1.js              Home layouts, checklist, process catalog and process pages
  views2.js              Policy guide, templates, interactive exit survey
  views3.js              Jurisdictions, compare, public-company rules, calendar, change log, proposals, search, router
data/
  proc-a..g.json         97 processes
  pol-a.json, pol-b.json 57 policies
  templates.json         15 original templates (exit survey is separate)
  templates-a..e.json    32 templates added in v8, grouped by lifecycle stage
  changelog.json         Library release notes shown under What's changed
  exit-survey.json       The exit survey
  register.json          Legal obligations for the original six jurisdictions
  country-<id>.json      One research file per jurisdiction
  notes-<id>.json        Process, policy and template notes, plus obligations, for jurisdictions added later
  global.json            Public-company (SEC, Nasdaq, SOX), semiconductor (export control, national security) and global frameworks
docs/                    Authoring specs used to generate and extend the content
tools/
  validate.py            Validate process or policy files: python3 tools/validate.py processes data/proc-a.json
  validate_notes.py      Validate a jurisdiction notes file
  validate_templates.py  Validate template files against docs/TEMPLATE_SCHEMA.md
  show.py                Print items with existing notes, for writing a new jurisdiction's notes
tests/
  test_links.py          Headless-browser test of every page, link and "On this page" entry
dist/atlas.html          Built page (what gets published)
```

## Build, test and publish

```bash
python3 build.py                     # writes dist/atlas.html and dist/preview.html
pip install playwright && playwright install chromium
python3 tests/test_links.py          # renders about 530 pages, checks all internal links and 4,100 on-page navigation clicks
python3 -m http.server -d dist 8000  # open http://localhost:8000/preview.html
```

To publish, republish `dist/atlas.html` to the artifact URL above with the Artifact tool. Stored capabilities carry forward, so they don't need to be passed again.

Shared features (proposals, checklist status, votes) only work on the published artifact. The local preview is read-only.

## Extending

- **Add a jurisdiction:** follow `docs/ADDING_A_JURISDICTION.md`, which covers the research file and the notes file with its validator. Then add the id to `JURS` in `build.py` and to `JUR` in `src/core.js`.
- **Change content:** edit the JSON in `data/` directly, or use the Proposed changes workflow in the page and apply accepted proposals here. Add an entry to `data/changelog.json` for each change (with `proposal` set to the proposal id when one was applied) so it shows under What's changed and on the page's Change history.
- **Schemas:**
  - Countries: `docs/COUNTRY_SCHEMA.md`
  - Processes: `docs/PROCESS_SCHEMA.md` (also lists the full process and policy catalog)
  - Policies: `docs/POLICY_SCHEMA.md`
  - Templates and obligations: `docs/TEMPLATE_SCHEMA.md`

## Link check (September 2026)

- **Internal links:** all 530 link targets resolve, and all 2,052 "On this page" entries (processes, policies, templates and jurisdictions) pass at 1440×900 and 1024×800.
- **External source links:** of 384, 374 load, 1 broken link was fixed (an eCFR short URL replaced with its full path), and 9 couldn't be checked because the site blocked automated requests or timed out.
