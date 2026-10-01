# Tutorial video script schema

Five short animated tutorials for the people running Project Atlas (see `docs/PROJECT_SCHEMA.md` and `data/project-core.json`). Each video is a two-host explainer:

- **Ava** (warm, clear, the expert who knows the process) and **Leo** (friendly, curious, a bit funny, asks what the viewer is thinking). They trade lines like a good podcast: short turns, natural contractions, light humor that never mocks HR or the viewer, and real, specific instructions.
- **Chip** is the show's mascot: a small, silent silicon chip character with eyes who reacts on screen. Chip never speaks; hosts may mention Chip occasionally.
- Every video is 75 to 95 seconds: 210 to 250 spoken words in total, 6 to 9 scenes, every line 6 to 26 words. Lines are spoken by a text-to-speech voice, so write for the ear: no parentheses, no slashes, no "e.g.", numbers that read well aloud.

## File: data/videos.json

```json
{ "videos": [
  { "id": "V1", "title": "Project Atlas in 90 seconds", "episode": "Episode 1", "summary": "one sentence",
    "scenes": [ { "id": "s1", "type": "title", "chip": "wave", "params": { ... }, "lines": [ { "who": "ava", "text": "...", "say": "optional", "show": 1, "ops": [] } ] } ] }
] }
```

- `text` is exactly what appears in the subtitles. `say` is optional: the same sentence spelled for the speech engine when pronunciation would go wrong (for example "SOX" → "socks", "HRBP" → "H R B P", "RACI" → "racy", "I-9" → "I nine", "W1" → "wave one"). Keep `say` identical in meaning.
- `show` (optional integer) is the number of the scene's items that should be visible once this line starts (for scene types with a list of items). If omitted, items reveal evenly across the scene.
- `ops` (optional, `appTable` scenes only) are UI actions played at the start of the line, in order.
- `chip` (optional on any scene): Chip's pose for that scene: `wave`, `think`, `thumbs`, `alarm`, `celebrate`, `point`. Use it in about half the scenes.

## Scene types and params

| type | params | what the viewer sees |
|---|---|---|
| `title` | `kicker`, `title`, `subtitle` | Episode open: big title with playful shapes. Always scene 1. |
| `bigNumbers` | `title`, `items: [{ "value": 97, "label": "processes" }]` (2-4) | Numbers count up one by one. |
| `steps` | `title`, `steps: [{ "title": "", "detail": "" }]` (3-6) | Numbered cards reveal one by one. |
| `timeline` | `title`, `bars: [{ "label": "", "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" }]` (3-6), `markers: [{ "date": "YYYY-MM-DD", "label": "" }]` (0-4) | Gantt bars grow left to right; markers drop in. |
| `appTable` | `title`, `columns: [""]` (3-5), `rows: [[""]]` (3-6 rows, cell text short), `filters: [""]` (0-3 filter chips) | A mock of the Atlas tracker. Ops animate a cursor and changes. |
| `swimlane` | `title`, `lanes: [""]` (2-4), `nodes: [{ "lane": 0, "label": "", "kind": "start|task|decision|end" }]` (4-8, in flow order) | A flowchart builds node by node. |
| `chain` | `title`, `steps: [{ "label": "", "who": "" }]` (3-6), `reject`: optional step index (0-based) that rejects once before approving | Approval chain nodes light up green in turn; a rejected step flashes red and loops back. |
| `map` | `title`, `groups: [{ "label": "", "codes": ["de", "cn"] }]` (1-3), `note`: "" | All 13 jurisdictions as badges (US, CA, CO, NC, TX, WA, Canada, DE, IL, IN, TW, CN, VN); groups highlight in turn with their label. |
| `checklist` | `title`, `items: [""]` (3-6) | Items tick off one by one. |
| `versus` | `left: { "title": "", "items": [""] }`, `right: { "title": "", "items": [""] }` (2-4 items each) | Two columns: don't vs do, or before vs after. |
| `callout` | `text` (up to 18 words), `label` (e.g. "Pro tip", "Watch out") | One big tip card; Chip holds it. |
| `outro` | `title`, `next`, `where` | Closing card: recap line, next episode, where to find things in the Atlas. Always the last scene. |

### appTable ops

Each op is an object; the cursor animates to the target first.

- `{ "op": "filter", "value": "Wave 1" }` adds or highlights a filter chip.
- `{ "op": "highlight", "row": 1 }` highlights a row (0-based).
- `{ "op": "set", "row": 1, "col": 2, "value": "In review" }` changes a cell (status words get colors: Not started, Drafting, In review, Approved, Live, Overdue).
- `{ "op": "toast", "value": "Saved for everyone" }` shows a confirmation toast.

## Content guide for the five videos

- **V1 Project Atlas in 90 seconds**: why the project exists (438 items, 13 jurisdictions, audit and legal exposure), the 4 waves plus Mobilize across 12 months, the 6 workstreams and country leads, the five stages every item moves through (Discover, Draft, Review, Approve, Go live), where to find things in the Atlas.
- **V2 Find and update your items**: open the Master checklist, filter by wave and owner, open an item, set yourself as assignee, update status and target date, add a note, why updating weekly matters (status report is generated from it), what "overdue" means.
- **V3 Document a process in five steps**: run a 90-minute discovery workshop, map the swimlane (start, tasks, decisions, end), add controls and evidence, add country notes, submit for approval. Include one "watch out" (documenting the ideal instead of reality) and one pro tip.
- **V4 Set up and run an approval chain**: what a chain is, the default chains (global policy, process, legal obligation, public company, project), editors assign named approvers to each step, submit an item, approvers see "Waiting on you", approve or send back with a reason, the audit trail is the evidence, optional steps like works council consultation.
- **V5 Take a policy live in 13 countries**: global policy plus country addenda, the countries with extra gates (Germany works council co-determination, China democratic consultation, Vietnam internal labor regulations registration, Taiwan work rules filing, local language versions), plan lead time, publish, communicate, collect acknowledgments, file evidence.

Facts to stay consistent with: Mobilize Oct 12 to Nov 6, 2026; Wave 1 Nov 9, 2026 to Feb 12, 2027; Wave 2 Feb 15 to May 14, 2027; Wave 3 May 17 to Aug 13, 2027; Wave 4 Aug 16 to Oct 8, 2027. 57 policies, 97 processes, 284 legal obligations. Atlas pages: Project HQ, Plan, Approvals, RAID log, Master checklist, Policy guide, Processes, Templates, Countries.
