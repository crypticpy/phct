---
layout: entry
render_with_liquid: false
title: "311 service request routing"
slug: service-request-routing
summary: "Translates and classifies resident service requests arriving by phone, web form and app, assigns a category and urgency tier, and opens the work order in the right department's queue."
published: 2026-06-15
updated: 2026-08-06
verified: 2026-08-06
featured: true
sample: true
impact: "Median time from request to routed work order fell from two days to four minutes"
organization: "Large city — 311 customer service center"
review_status: "Reviewed & approved"
solution_type: "Cloud deployment"
use_case_category: "Operations & logistics"
area:
  - "IT & operations"
  - "Communications & outreach"
  - "Staff & partner coordination"
stage: "In production"
ai_role: "AI is part of the solution"
ai_types:
  - "Classification & NLP"
  - "Translation"
  - "Speech & transcription"
ai_tools:
  - "Amazon Bedrock"
  - "Amazon Transcribe"
  - "Amazon Translate"
  - "AWS Lambda"
  - "Terraform"
platform:
  - "AWS"
expertise: "Contractor or vendor"
readiness:
  - "Needs customization"
  - "Needs a contractor"
  - "Human review built in"
docs_url: "https://docs.example.gov/311-routing/architecture"
resources:
  - label: "Architecture and access boundary diagram (PDF)"
    url: "https://docs.example.gov/311-routing/architecture.pdf"
  - label: "Shadow-period agreement study (shared doc)"
    url: "https://docs.example.org/document/d/9f8e7d6c/edit"
  - label: "Category rubric and urgency tiers (shared doc)"
    url: "https://docs.example.org/document/d/5r7y3u1i/edit"
also_deployed_by:
  - label: "Riverbend County Health District"
    url: "https://health.example.gov/service-routing"
    email: "digital-services@health.example.gov"
    note: "Kept the routing rules, swapped the classifier for the one their vendor already licensed."
  - label: "Northgate Township"
    url: "https://www.example.org/northgate/311"
screenshots:
  - src: /catalog/service-request-routing/screenshots/01.png
    alt: "Routing queue showing incoming service requests with the source language, translated text, assigned category, urgency tier and routing status."
  - src: /catalog/service-request-routing/screenshots/02.png
    alt: "Routing accuracy panel showing agreement with staff categories by source language, with the two lowest-scoring languages marked as reviewed on every request."
license: "Not open source — available on request"
access_terms: "The Terraform modules and the prompt set are shared with other public agencies on request; the code is entangled with our work order schema, so we walk through it rather than publishing it. Email the contact below."
portability: "Partially — with rework"
portability_notes: "The routing logic, the rubric and the prompts are plain Python and travel. Transcription and translation use managed AWS services; another cloud has equivalents, and the swap is a fortnight of work plus a re-run of the accuracy comparison, which is the part people forget to budget."
cost_band: "$100k–$500k"
run_cost: "$10k–$50k/yr"
procurement:
  - "Competitive solicitation"
  - "Grant funded"
approvals:
  - "Privacy review"
  - "Security review or authority to operate"
  - "Labor or workforce consultation"
  - "Equity impact assessment"
equity_note: "Roughly a third of requests arrive in a language other than English, and before this those requests waited longest — a non-English submission sat until a bilingual agent could read it. That gap is the reason the project existed. We sample 40 translated requests a month against a bilingual reviewer and report routing accuracy by source language; two languages currently run below the rest and every request in them stays on the review-everything list until they close the gap. Tier 1, the urgency level that dispatches a crew the same day, is always confirmed by a person."
no_pii_attestation: true
data_sensitivity:
  - "Personal information (PII)"
  - "Internal, non-public data"
data_sources:
  - "311 call recordings and agent notes"
  - "Web and mobile app request forms"
  - "Work order management system"
audience: "Public-facing"
data_governance_notes: "Request text carries caller names, phone numbers and addresses. Nothing leaves the city's own AWS account, no data is used for training, and raw request text is deleted after 30 days while the categorised work order follows the existing records schedule. Nothing in this entry or its screenshots is real resident data."
contact_name: "311 systems manager"
contact_title: "Customer Service Center"
contact_email: "311-systems@example.org"
---

## Problem

Requests reach us in more than twenty languages across three channels. Before this project a non-English submission sat in a queue until a bilingual agent could read it, and the category it eventually received depended on which agent read it. Two residents could report the same problem at the same intersection and end up with different categories, different departments and different urgency.

The routing errors were the expensive part. A misrouted request does not just wait — it waits in the wrong department's queue until someone notices, which for us averaged nine days.

## What we built

A deployment that sits between the intake channels and the work order system. A request arrives by phone, web form or app. Phone requests are transcribed; anything not in English is translated, with the original wording kept on the record. A model then assigns one of fourteen categories and an urgency tier using a written rubric, and the result is opened as a work order in the responsible department's queue.

Tier 1 — the urgency level that dispatches a crew the same day — is always confirmed by a person before the work order is released. Tiers 2 and 3 route automatically.

## How it works

Everything is defined in Terraform: the API gateway, two Lambda functions, the transcription, translation and model calls, and the queue that writes to the work order system. Raw request text is retained for 30 days and then deleted; the categorised work order follows the normal records schedule.

There is no public repository — the code is entangled with our work order schema — but the architecture document walks through the access boundaries, the retention policy and the rubric, and the rubric is the part worth copying.

## Results

Median time from request to routed work order dropped from about two days to four minutes. Category agreement between the model and agents, measured during a two-month shadow period, was 91% and has held there.

The categories that disagreed most often — illegal dumping versus bulk item pickup — were merged, because the disagreement turned out to be a definition problem the department had lived with for years rather than a model problem.

Residents also see faster acknowledgements, and requests in less common languages no longer wait longer than requests in English. That was the outcome we set out to get.

## Lessons learned

Run a shadow period. Ours was two months of the model categorising alongside agents with no effect on routing, and it changed the category list before anyone depended on it. It also produced the accuracy baseline we now measure drift against, which we would not otherwise have.

Keep the original wording next to the translation. Agents check it more often than we expected, and it is the only way to catch a translation that dropped a detail — "the second floor" and "the second building" are one word apart in a couple of the languages we handle.

Talk to the agents' union before, not after. Our labor consultation produced the rule that no agent's performance is measured against the model's categories, and having that written down removed most of the resistance to the rollout.

## How to reuse

The architecture is generic; the rubric is not. Expect to write your own category definitions with the departments that will act on them, then run a shadow period against real requests before anything routes. A contractor stood ours up in about six weeks, most of which was integration with the work order system rather than anything to do with AI.
