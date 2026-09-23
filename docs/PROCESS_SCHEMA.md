# Process library — authoring spec

You are writing HR process definitions for an internal HR Policy & Process Library at a global, US-listed (Nasdaq),
fabless semiconductor company (~1,500-5,000 employees, engineering-heavy; HQ California; offices in Ontario & British
Columbia (Canada), Bengaluru (India), Taipei/Hsinchu (Taiwan), Shanghai/Shenzhen (China)). HRIS = Darwinbox,
ATS = Greenhouse. Today is 2026-09-22.

Web search is NOT available (session budget exhausted). For legal specifics, rely on the verified research files:
  data/country-us.json, country-us-ca.json, country-ca.json, country-in.json, country-tw.json,
  country-cn.json, global.json
Use `python3 -c` / `grep` to pull the relevant parts (e.g. terminationDeepDive, stages.exit, keyFacts) rather than
reading whole files. Do not contradict them. If something isn't in them and you're not sure, write "(verify)".

## Output
Write ONE JSON file at the path you're given: {"processes": [ PROCESS, ... ]} in the order given.
Then run:  python3 tools/validate.py processes <your file>
and fix every error until it prints OK. Warnings about counts should also be fixed.

## PROCESS object
{
  "id": "OF-02",                      // exactly as assigned
  "name": "Involuntary termination",  // exactly as assigned
  "stage": "Offboard",                // exactly as assigned
  "depth": "deep" | "standard",       // exactly as assigned
  "summary": "2-3 sentences: purpose + scope + what good looks like.",
  "owner": "accountable function (e.g. 'HRBP (process), Employee Relations (quality)')",
  "trigger": "what starts it",
  "outputs": ["3-6 concrete outputs/records"],
  "systems": ["from the systems vocabulary below"],
  "sla": "overall cycle-time target, e.g. '10 business days req-to-approval'",
  "lanes": ["3-7 lane names from the lane vocabulary, top-to-bottom order"],
  "steps": [ STEP, ... ],
  "raci": [ {"activity":"...", "R":"lane/role", "A":"...", "C":"...", "I":"..."} ],
  "controls": [ {"id":"C1","control":"what is checked","type":"preventive|detective","evidence":"artifact retained"} ],
  "kpis": [ {"name":"...","target":"...","why":"..."} ],
  "considerations": ["design choices, pitfalls, judgement calls — practical and specific"],
  "variations": [ {"when":"scenario", "how":"what changes"} ],
  "countries": { "us": "...", "us-ca": "...", "ca": "...", "in": "...", "tw": "...", "cn": "..." },
  "templates": ["template ids from the list below, only if relevant"],
  "policies": ["policy ids from the list below that govern this process"],
  "related": ["other process ids"]
}

STEP = {
  "id": "s1",                         // s1..sN unique within process
  "lane": "must be one of this process's lanes",
  "type": "start|task|decision|end",  // first step must be 'start', at least one 'end'
  "label": "short verb phrase, <= 42 chars",
  "detail": "1-3 sentences: what exactly happens, how, tips, required content",
  "sla": "optional, e.g. '1 bd' / 'Day -10'",
  "control": "optional: compliance/SOX control embedded in the step",
  "next": ["s2"],                     // for start/task: exactly 1 id (the following step, usually next in array)
  "branches": [ {"to":"s5","label":"Yes"}, {"to":"s3","label":"No"} ]   // decision only: 2-3 branches, no 'next'
}
Order steps in the array in the main happy-path order; flowcharts lay steps left-to-right in array order and
draw lanes as rows. 'end' steps have no next/branches. Branch targets may point backwards (loops) or forwards.

## Size targets
deep:     steps 11-16, raci 6-10, controls 4-8, kpis 4-6, considerations 6-10, variations 5-8,
          countries: all six keys, 2-4 specific sentences each (statutes, thresholds, deadlines, documents).
standard: steps 6-10, raci 3-5, controls 2-4, kpis 2-4, considerations 3-6, variations 2-4,
          countries: all six keys, 1-2 specific sentences each (say "No material variation from global standard" only if true).

## Vocabularies (use these exact strings)
Lanes: Employee, Candidate, Manager, Dept Head, HRBP, Recruiter, TA Coordinator, People Ops, Payroll, Total Rewards,
  Stock Admin, Benefits, Employee Relations, Legal, Immigration, Trade Compliance, Ethics & Compliance, IT, Security,
  Facilities, EHS, Finance, FP&A, CHRO, CEO, Comp Committee, Board, Vendor, Mobility, L&D, HR Analytics, Works Council/Union
Systems: "Darwinbox (HRIS)", "Greenhouse (ATS)", "Payroll provider", "Equity platform", "Benefits admin platform",
  "ITSM / identity (e.g. ServiceNow, Okta)", "Background-check vendor", "E-Verify", "Case management / hotline",
  "LMS", "Survey platform", "E-signature", "Document management", "Travel/mobility vendor", "Export-control screening tool",
  "Immigration case system", "Comp planning tool", "Performance module (Darwinbox)", "Timekeeping", "BI / people analytics"

Template ids: T-EXIT-SURVEY, T-EXIT-INTERVIEW, T-OFFBOARD-CHECKLIST, T-TERM-SCRIPT, T-RIF-SELECTION, T-SEP-TERMS,
  T-INVESTIGATION, T-PIP, T-ONBOARD-PLAN, T-ONBOARD-PULSE, T-SCORECARD, T-OFFER-APPROVAL, T-POLICY, T-STAY-INTERVIEW,
  T-ACCOMMODATION, T-REQ

Policy ids (name): POL-01 Code of Business Conduct & Ethics; POL-02 Speak Up & Non-Retaliation; POL-03 Conflicts of
  Interest & Outside Activities; POL-04 Anti-Bribery & Anti-Corruption (HR aspects); POL-05 Insider Trading;
  POL-06 Compensation Recovery (Clawback); POL-07 Workplace Relationships & Employment of Relatives;
  POL-08 Equal Employment Opportunity; POL-09 Anti-Harassment; POL-10 Respectful Workplace & Anti-Bullying;
  POL-11 Workplace Violence Prevention; POL-12 Drug, Alcohol & Substance Use; POL-13 Standards of Conduct &
  Corrective Action; POL-14 Social Media & External Communications; POL-15 Human Rights & Labor Standards;
  POL-16 Recruitment & Selection; POL-17 Background Screening; POL-18 Export Control & Deemed Exports (Employees);
  POL-19 Immigration Sponsorship; POL-20 Contingent Workforce & Worker Classification; POL-21 Probation & Confirmation;
  POL-22 Early Careers & Internships; POL-23 Compensation Philosophy & Pay Administration; POL-24 Pay Equity & Pay
  Transparency; POL-25 Variable Pay & Bonus; POL-26 Sales Compensation Governance; POL-27 Equity Grant Policy;
  POL-28 Payroll & Wage Payment; POL-29 Hours of Work, Overtime & Timekeeping; POL-30 Expense Reimbursement &
  Remote-Work Stipends; POL-31 Sign-on, Relocation & Repayment Agreements; POL-32 Employee Referral Program;
  POL-33 Paid Time Off & Holidays; POL-34 Sick Leave; POL-35 Leaves of Absence; POL-36 Reasonable Accommodation;
  POL-37 Benefits Eligibility; POL-38 Hybrid & Remote Work; POL-39 Right to Disconnect; POL-40 Global Mobility;
  POL-41 Travel Safety & Restricted Travel; POL-42 Performance Management; POL-43 Promotion & Internal Mobility;
  POL-44 Learning & Tuition Assistance; POL-45 Mandatory Training & Policy Acknowledgment; POL-46 Employee Privacy &
  HR Data Protection; POL-47 Electronic Monitoring & Acceptable Use; POL-48 Confidential Information, IP & Inventions;
  POL-49 HR Records Retention; POL-50 AI in Employment Decisions; POL-51 Health & Safety; POL-52 Resignation, Notice &
  Garden Leave; POL-53 Termination of Employment; POL-54 Severance & Reduction in Force; POL-55 Return of Property &
  Post-Employment Obligations; POL-56 References & Employment Verification; POL-57 Accessibility & Inclusion

## Full process catalog (for "related" ids)
PLAN: PL-01 Annual workforce & headcount plan; PL-02 Requisition & position approval; PL-03 Job architecture & leveling;
  PL-04 Organization design change; PL-05 Contingent workforce engagement
RECRUIT: TA-01 Job posting & pay-range compliance; TA-02 Sourcing, agencies & referrals; TA-03 Structured interview &
  selection; TA-04 Offer approval & extension; TA-05 Background & reference checks; TA-06 Export-control screening for
  new hires; TA-07 Immigration sponsorship for new hires; TA-08 University & intern hiring; TA-09 Executive hiring;
  TA-10 Rehire, relatives & conflict screening; TA-11 Candidate privacy & data retention
ONBOARD: ON-01 Preboarding (accept to Day 1); ON-02 Right-to-work verification; ON-03 Hire transaction & HRIS setup;
  ON-04 Day 1 to Day 90 onboarding & probation; ON-05 Relocation
PAY: PY-01 Payroll cycle: change control & close; PY-02 Off-cycle & manual payments; PY-03 Time, attendance & overtime;
  PY-04 Year-end & statutory payroll filings; PY-05 Payroll error correction & overpayment recovery
REWARD: CO-01 Salary structures & market pricing; CO-02 Annual compensation review; CO-03 Annual bonus / variable pay;
  CO-04 Sales incentive compensation; CO-05 Off-cycle adjustments & counteroffers; CO-06 Pay equity audit & remediation;
  CO-07 Executive compensation cycle
EQUITY: EQ-01 Equity grant administration; EQ-02 Vesting, release & tax withholding; EQ-03 ESPP enrollment & purchase;
  EQ-04 Insider trading pre-clearance & blackouts; EQ-05 Section 16 reporting; EQ-06 Clawback administration
BENEFITS: BN-01 New-hire benefits enrollment; BN-02 Annual open enrollment; BN-03 Qualifying life events;
  BN-04 Retirement plan governance; BN-05 Global benefits renewal & vendor management; BN-06 Benefits continuation (COBRA)
LEAVE: LV-01 Leave of absence; LV-02 Workplace accommodation; LV-03 Return to work; LV-04 Occupational injury &
  workers' comp claims; LV-05 PTO & holiday administration
GROW: PD-01 Goal setting & check-ins; PD-02 Performance review & calibration; PD-03 Performance improvement plan;
  PD-04 Promotion; PD-05 Talent review & succession; PD-06 Compliance training & policy attestation;
  PD-07 Learning programs & tuition assistance
MOVE: MV-01 Internal transfer & job change; MV-02 International assignment; MV-03 Permanent cross-border transfer;
  MV-04 Remote work & work-location change; MV-05 Status & classification change; MV-06 Immigration maintenance & green cards
RELATIONS: ER-01 Speak-up intake & triage; ER-02 Workplace investigation; ER-03 Harassment complaints (statutory committees);
  ER-04 Corrective action & discipline; ER-05 Whistleblower & hotline case management; ER-06 Conflict-of-interest
  disclosure; ER-07 Threat assessment & workplace violence; ER-08 Labor relations & employee consultation;
  ER-09 Legal hold & litigation support; ER-10 Trade-secret protection for departing employees
SAFETY: HS-01 Incident & injury reporting; HS-02 Crisis response & duty of care; HS-03 Lab & EHS safety program
DATA: DS-01 Employee data changes & data quality; DS-02 HR data subject requests; DS-03 Records retention & destruction;
  DS-04 HRIS access & segregation of duties; DS-05 Human capital reporting & disclosure; DS-06 HR vendor & AI tool
  onboarding; DS-07 Employment verification requests; DS-08 Policy lifecycle governance
ENGAGE: EN-01 Engagement survey & action planning; EN-02 Recognition & service awards; EN-03 Stay interviews & listening
OFFBOARD: OF-01 Voluntary resignation & offboarding; OF-02 Involuntary termination; OF-03 Reduction in force;
  OF-04 Separation agreements & releases; OF-05 Final pay, benefits & equity at exit; OF-06 Access removal & asset
  recovery; OF-07 Exit survey & interview program; OF-08 Retirement; OF-09 Death of an employee;
  OF-10 Alumni, references & rehire eligibility

## Quality bar
Write like a seasoned global HR operations leader: concrete (who, what system, what document, what deadline),
opinionated where helpful, no fluff, no generic filler. Country notes must be specific to that process (e.g. for
OF-01: CA final pay within 72h if no notice / on last day if notice given; China termination certificate + social
insurance transfer within 15 days; India F&F within 2 working days under Code on Wages + relieving letter; Taiwan
service certificate LSA Art.19; BC 6 days after quitting; ON later of 7 days or next pay day).
Semiconductor angle where real: export-control access, trade secrets, lab safety, equity-heavy pay, insider windows.
Use plain ASCII punctuation or UTF-8; JSON must be valid.
