---
layout: entry
render_with_liquid: false
title: "Theme analysis of public comment"
slug: public-comment-themes
summary: "An open-source notebook that groups the comments received on a plan or rule into themes, counts them, and links every theme back to the comments it came from so a reader can check it."
published: 2026-07-21
updated: 2026-08-12
featured: false
sample: true
impact: "4,100 comments on a draft zoning update summarized in two days instead of six weeks"
organization: "Mid-sized city — Planning department"
review_status: "Reviewed & approved"
solution_type: "Source code"
use_case_category: "Coding & brainstorming"
area:
  - "Policy & planning"
  - "Data & informatics"
  - "Communications & outreach"
stage: "Pilot"
ai_role: "Both"
ai_types:
  - "Classification & NLP"
  - "Generative text (LLM)"
ai_tools:
  - "Python"
  - "sentence-transformers"
  - "Jupyter"
  - "Claude"
platform:
  - "Desktop or local"
expertise: "Analyst or data scientist"
readiness:
  - "Guided setup"
  - "Needs customization"
  - "Human review built in"
repo_url: "https://github.com/example-org/public-comment-themes"
docs_url: "https://docs.example.gov/comment-themes/method-note"
resources:
  - label: "Method note and limitations (PDF)"
    url: "https://docs.example.gov/comment-themes/method-note.pdf"
  - label: "Worked example on a published comment set (notebook)"
    url: "https://github.com/example-org/public-comment-themes/blob/main/examples/zoning.ipynb"
screenshots:
  - src: /catalog/public-comment-themes/screenshots/01.png
    alt: "Theme report listing comment themes with counts, share of total, a representative quotation and a link to every comment assigned to that theme."
license: "Other open license"
access_terms: "Released under the European Union Public Licence 1.2, which is compatible with reuse by other public bodies and is what our legal office was comfortable with. The repository is public; no request needed."
portability: "Yes — platform-agnostic"
portability_notes: "A notebook and a small Python package. Embeddings run locally on a laptop; the summarisation step is one function you can point at any model provider, or replace with a human writing the theme labels by hand — the counts do not depend on it."
reused_from:
  - "council-meeting-summaries"
cost_band: "No new spend"
run_cost: "No ongoing cost"
procurement:
  - "No procurement needed"
approvals:
  - "Community or advisory review"
  - "Equity impact assessment"
  - "Records retention review"
equity_note: "Public comment is one of the places where volume quietly beats substance: an organized campaign submitting 900 identical letters used to dominate a staff summary simply by being unmissable. Counting themes rather than letters cuts both ways, so the report always shows theme counts, distinct-submitter counts and form-letter counts side by side, and never collapses them into one number. A comment that appears once is still in the report, with its text, because in a land use process the single most useful comment is often the one nobody else made."
no_pii_attestation: true
data_sensitivity:
  - "Public data only"
data_sources:
  - "Comments submitted to a published consultation"
  - "Comment intake form metadata (channel, date)"
audience: "Public-facing"
data_governance_notes: "Comments submitted to a formal consultation are public records, and the theme report is published as part of the record. Submitter names and addresses are stripped before any text reaches a model and are never shown in the report, even though they are technically public — the report is a summary of what was said, not a directory of who said it. Comments are retained under the consultation's own schedule; the tool keeps no copy."
security_review: "Not reviewed"
contact_name: "Long range planning analyst"
contact_title: "Planning Department"
contact_email: "planning-analysis@example.org"
---

## Problem

A draft zoning update drew 4,100 comments across a web form, email and three open houses. Two planners read all of them and wrote a summary, which took about six weeks and arrived after the council had already held its first discussion.

The deeper problem was that nobody, including the planners, could check the summary. It said things like "many commenters raised concerns about parking." Many is not a number, and there was no way to get from that sentence back to the comments it came from.

## What we built

A notebook that produces a theme report. It embeds every comment, clusters them, proposes a label for each cluster, and writes out a table: theme, number of comments, number of distinct submitters, number of form letters, a representative quotation, and a link to the full list of comments in that theme.

A planner reviews and edits every theme label before publication, merges clusters that are the same argument, and splits ones that are not. That review is where the judgement lives, and it takes about a day.

## How it works

Embeddings and clustering run locally on a laptop with open-source models — no comment text needs to leave the building for the part that produces the counts. The only step that calls a hosted model is the first-draft theme label, and that step is optional; the labels can be written by hand and the report is identical in every other respect.

The design rule we kept coming back to: every number in the report must be clickable. If the report says 312 comments raised setbacks, a reader can open all 312. That constraint killed several fancier ideas and is the reason we would defend the tool in a hearing.

## Results

The zoning comment set was summarized in two days instead of six weeks, and the report went to the council with the staff recommendation instead of after it.

The published themes surfaced two arguments the manual summary from a comparable earlier process had missed entirely, both of them from a small number of comments — six and eleven — that got lost in the volume the first time round. One of them changed a provision in the final draft.

Clustering is genuinely bad at short comments. Anything under about fifteen words lands in a low-confidence bucket that a planner reads individually; that bucket was 9% of the comment set and there is no clever fix for it in the tool.

## Lessons learned

Publish the method note alongside the report. Ours states what the tool does, what it cannot do, and that a human edited every theme label. The first question at the public meeting was "did a computer decide what we said," and the answer needed to already be written down.

Never report themes without also reporting distinct submitters and form letters. A single number is a summary someone can game, and we would rather hand a reader three honest numbers than one clean one.

Keep the counting step local and deterministic. It made the privacy conversation trivial and it means the report can be regenerated by anyone with the comment file, which is the definition of checkable.

## How to reuse

The repository has a worked example over a published comment set, so you can run it end to end before pointing it at your own. We took the transcript-splitting approach and the "every claim links to its source" rule from the clerk's meeting summary entry in this catalog; that rule is the one thing we would insist on carrying over. An analyst comfortable with Python has this running in an afternoon.
