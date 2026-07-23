---
name: build-lark-work-manual
description: Collect and reconcile a person's or role's work information from Feishu/Lark Wiki, Docs, Sheets, Base, IM, Calendar, VC, Tasks, OKRs, Drive, and contacts; write a comprehensive, evidence-aware work manual in Markdown; convert it into a polished responsive single-file HTML site; publish it through Miaoda/Spark; and configure its sharing scope. Use when the user asks to create, update, standardize, hand over, visualize, publish, or share a personal work manual, role handbook, job operating guide, SOP collection, role profile, or HTML work guide based on Feishu/Lark information.
---

# Build Lark Work Manual

Turn scattered Feishu evidence into a maintainable work operating manual and, when requested, a shareable HTML site. Preserve the boundary between observed facts, reasonable synthesis, and proposed operating standards.

## Select the Delivery Scope

Determine the requested stopping point:

1. **Manual only**: collect evidence and deliver Markdown or a Feishu document.
2. **Manual plus HTML**: also build and visually verify a local single-file site.
3. **Published site**: also publish through Miaoda/Spark and configure access.
4. **Update**: reuse the existing manual, config, app ID, and source links; refresh only changed evidence and republish in place.

Do not publish or change sharing permissions unless the user requested that outcome. If the user supplied a Feishu URL and asked to use their Feishu information, treat that as authorization to read relevant information visible to their identity, but avoid unrelated personal or confidential data.

## Load Required Skills

Read each applicable skill completely before using it:

- Use `lark-shared` to verify the authenticated user identity and authorization state.
- Use `lark-wiki` to resolve Wiki nodes and traverse relevant knowledge-space structure.
- Use `lark-doc`, `lark-sheets`, or `lark-base` according to the resolved resource type.
- Use `lark-im` for role-related messages, decisions, recurring coordination, and vocabulary.
- Use `lark-calendar`, `lark-vc`, `lark-task`, `lark-okr`, `lark-drive`, and `lark-contact` only when those sources materially improve the manual.
- Use `lark-apps` for HTML publication, republishing, deployment metadata, and access scope.
- Use `browser:control-in-app-browser` for final desktop and mobile visual verification.

Prefer purpose-built Feishu tools over browser scraping. Preserve source URLs or tokens in a source register so later updates can be incremental.

## Execute the Workflow

### 1. Establish Identity and Boundaries

Resolve the current user, target person or role, source document, intended audience, information baseline date, and requested output. Infer the target person from authenticated identity only when the request clearly refers to “我的信息” or equivalent.

Record exclusions such as compensation, private conversations, credentials, customer secrets, or unrelated HR data. Ask only when an unresolved choice would materially alter the result.

### 2. Build a Source Map

Start with the user-provided source and follow explicit references from it. Search Feishu narrowly using role names, product names, recurring meeting names, process terms, metrics, systems, and the target person's name.

Collect evidence in this order:

1. Structured role tables, responsibility sheets, SOPs, and official project documents.
2. Recurring meeting records, approved decisions, tasks, OKRs, and operating reports.
3. Relevant IM messages that clarify ownership, exceptions, handoffs, or actual practice.
4. Inferences used only to connect confirmed facts.

For every important claim, retain the source, date or freshness signal, evidence class, and any conflict. Resolve contradictions by preferring newer authoritative sources and explicitly flagging unresolved differences.

### 3. Synthesize Without Inventing

Classify material as:

- **Confirmed fact**: directly supported by a source.
- **Synthesized practice**: a conservative summary supported by several observations.
- **Recommended standard**: a proposed cadence, threshold, template, KPI, SLA, or control point not yet confirmed as current practice.

Never present recommendations as existing policy. Do not fabricate KPI targets, reporting lines, system permissions, meeting cadence, approval authority, or named owners.

Read [references/manual-standard.md](references/manual-standard.md) before drafting. Use its outline as a coverage checklist, not as a reason to add empty sections.

### 4. Draft the Manual

Write the canonical source as Markdown. Optimize for repeated work, onboarding, handover, and auditability rather than biography.

At minimum, make these questions answerable:

- Why does the role exist, and what business outcomes does it own?
- What are its responsibility boundaries, inputs, outputs, and decision rights?
- What happens daily, weekly, monthly, quarterly, and during exceptions?
- Which systems, tables, reports, metrics, meetings, and collaborators are involved?
- How does each core workflow start, proceed, close, and escalate?
- What are the common risks, controls, and handover requirements?
- Which statements are confirmed and which are recommended?

Use compact tables for repeated mappings. Add source links near the relevant section or in a source register. Include a version, baseline date, maintainer, and update cadence.

### 5. Review for Completeness and Safety

Check the draft against [references/manual-standard.md](references/manual-standard.md). Remove duplicate narrative, unsupported certainty, obsolete information, sensitive data, and generic filler. Verify names, dates, units, metric definitions, and links.

When the source is incomplete, include a short “待确认事项” section rather than silently filling gaps.

### 6. Build the HTML Site

When HTML is requested, create a small site folder next to the Markdown source and use the bundled builder:

```bash
node scripts/build_manual_site.cjs \
  --source /absolute/path/manual.md \
  --output /absolute/path/site/index.html \
  --config /absolute/path/site/manual-site.json
```

The script requires the `marked` and `lucide` Node packages at build time; the output itself has no runtime dependencies. Use the workspace dependency loader first, and set `NODE_PATH` to its bundled Node modules when needed.

Create `manual-site.json` with only the fields useful for the role:

```json
{
  "title": "姓名或岗位 工作说明书",
  "owner": "姓名或岗位",
  "subtitle": "团队或业务域",
  "lead": "一句话说明工作闭环和核心价值。",
  "version": "V1.0",
  "date": "2026-07-23",
  "roles": [
    {"icon": "BarChart3", "title": "职责模块", "detail": "核心输出"}
  ],
  "flow": {
    "inputs": ["业务输入"],
    "center": "运营控制塔",
    "outputs": ["可验证输出"]
  }
}
```

Keep the Markdown as the source of truth; rebuild HTML after every content change. Do not manually edit generated HTML unless fixing the builder.

### 7. Verify the Site

Read [references/publishing-checklist.md](references/publishing-checklist.md). Start a local server when browser security or navigation requires it, then use the in-app browser to verify desktop and mobile viewports.

Test navigation, search, collapse, theme, print entry point, source links, long tables, long Chinese text, drawer behavior, scroll progress, and zero horizontal overflow. Inspect screenshots, not only DOM state. Stop temporary servers and finalize browser tabs after testing.

### 8. Publish and Set Access

Use `lark-apps` to publish the final single-file HTML. Reuse the existing Miaoda app ID for updates; create a new app only for a distinct manual.

After publication, inspect the runtime access scope. Before changing it, obtain the user's explicit choice among:

- creator or selected people only;
- tenant-visible;
- public with login required;
- public without login.

Do not equate runtime access scope with editor or collaborator permissions. Verify the published URL after the scope change. If the browser session reaches Feishu login, report that as authentication behavior rather than a rendering failure.

### 9. Hand Off the Result

Return the published URL when available, the management URL, the canonical Markdown path, the local HTML path, the current access scope, the baseline date, and a concise verification summary. Preserve deployment metadata containing the app ID and URLs beside the site so future updates can republish in place.

## Update Existing Manuals

For refresh requests, compare new evidence with the prior source register and baseline date. Update affected sections, version, date, and pending questions; rebuild and test; then republish to the recorded app ID. Avoid re-reading unrelated historical data unless a changed responsibility creates a dependency.
