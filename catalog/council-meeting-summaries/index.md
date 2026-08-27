---
layout: entry
render_with_liquid: false
title: "Council meeting summaries from the recording"
slug: council-meeting-summaries
summary: "Turns the recording of a public council or board meeting into a plain-language summary of what was discussed and decided, published alongside the official minutes."
published: 2026-03-31
updated: 2026-07-14
featured: true
sample: true
impact: "Summary published the morning after the meeting instead of three weeks later"
organization: "Small city — City Clerk's office"
review_status: "Reviewed & approved"
solution_type: "Cloud deployment"
use_case_category: "Communications, media & writing"
area:
  - "Communications & outreach"
  - "Leadership & administration"
  - "Legal & compliance"
stage: "In production"
ai_role: "AI is part of the solution"
ai_types:
  - "Speech & transcription"
  - "Generative text (LLM)"
ai_tools:
  - "Whisper (self-hosted)"
  - "Vertex AI"
  - "Python"
platform:
  - "Google Cloud"
expertise: "Analyst or data scientist"
readiness:
  - "Needs customization"
  - "Human review built in"
repo_url: "https://github.com/example-org/meeting-summary-pipeline"
docs_url: "https://docs.example.gov/meeting-summaries/how-it-works"
resources:
  - label: "Summary style guide and prompt (shared doc)"
    url: "https://docs.example.org/document/d/3d8f1c5b/edit"
  - label: "Clerk review checklist (PDF)"
    url: "https://docs.example.gov/meeting-summaries/review-checklist.pdf"
screenshots:
  - src: /catalog/council-meeting-summaries/screenshots/01.png
    alt: "Published meeting summary page listing agenda items with a short plain-language description, the vote outcome and a link to the timestamp in the recording."
license: "Apache 2.0"
portability: "Yes — platform-agnostic"
portability_notes: "Transcription is self-hosted Whisper and runs on any machine with a GPU or, slowly, without one. The summarisation step is one API call behind a thin interface, so swapping the model provider is a configuration change. Nothing else is cloud-specific."
cost_band: "Under $25k"
run_cost: "Under $10k/yr"
procurement:
  - "No procurement needed"
approvals:
  - "Legal or contracts review"
  - "Records retention review"
  - "Community or advisory review"
equity_note: "The audience is residents who cannot sit through a four-hour Tuesday night meeting, which is most of them. Summaries are written at roughly a seventh-grade reading level and published in the same languages as the agenda. The summary is explicitly not the record — every page says so and links to the minutes and the recording — because a summary that people mistake for the official record is worse than no summary at all."
no_pii_attestation: true
data_sensitivity:
  - "Public data only"
data_sources:
  - "Published meeting recordings"
  - "Posted agendas and item packets"
  - "Roll call vote records"
audience: "Public-facing"
data_governance_notes: "Only material that is already public goes in: the recording, the agenda and the vote record. Public comment speakers are described by role, never by name, even though the recording is public — a searchable name attached to a summary is a different thing from a name in a four-hour video. Closed-session portions are never processed."
security_review: "Coalition security-reviewed"
contact_name: "Deputy clerk, records and transparency"
contact_title: "City Clerk's office"
contact_email: "clerk-records@example.org"
---

## Problem

Full minutes take our office about three weeks to produce and approve, and they are written for a legal purpose: they record motions, movers, seconders and outcomes. They are not written to tell a resident what happened. Someone who wanted to know whether the council approved the sidewalk project had to either watch four hours of video or wait three weeks and then read a document that says "Item 14.b, motion carried 5-2."

We were also fielding a steady stream of phone calls asking exactly that question, which is a fair use of a clerk's time exactly once and a waste of it the fortieth time.

## What we built

A pipeline that runs the morning after each meeting. It transcribes the published recording, splits the transcript by agenda item using the timestamps the clerk already records for the video index, and writes a three-to-five sentence summary of each item: what was proposed, what the main points of discussion were, and what was decided.

The clerk reviews every summary before it publishes. In practice that is about twenty minutes, mostly spent on the two or three items where the discussion wandered.

## How it works

Transcription is Whisper running on a small GPU instance we already had. Summarisation is a single model call per agenda item with a prompt that carries the style guide: no adjectives, no characterisation of anyone's motives, name the outcome, and say "no decision was made" when none was. The summary of an item may only use the transcript of that item, which is a boring constraint that prevents most of the ways this could go wrong.

The published page shows each item's summary, the vote if there was one, and a link that jumps to that moment in the recording. That link matters more than the summary — it is what lets a reader check us.

## Results

Summaries publish the morning after the meeting instead of three weeks later. Traffic to the meeting pages roughly tripled, and the media's coverage now consistently gets the vote counts right, which was not previously true.

The clerk's edit rate has settled at about one summary in six needing a change. The most common correction is a summary treating a continued item as though it had been decided.

## Lessons learned

Agenda-item boundaries are the whole game. Our first version summarised the meeting as one document and produced something that read well and was useless — it flattened nine hours of separate decisions into five hundred words of vibe. Splitting by item made the summaries checkable and made the review fast.

Say what the summary is not. We put "This summary is not the official record" at the top of every page after the first month, following a call from a resident who had relied on one. The link to the minutes is right next to it.

Do not summarise public comment. We tried, and every version we produced either flattened what people said or characterised it. Public comment is listed by topic and count, with the recording linked, and the speakers speak for themselves.

## How to reuse

The repository runs against any recording plus a timestamped agenda; the timestamps are the input most clerks' offices already have and do not realise is valuable. Start by running it over three past meetings and having the clerk mark up the output — that produced our style guide, and the style guide is what makes this usable.
