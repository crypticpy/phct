---
layout: entry
render_with_liquid: false
title: "Permit application intake triage"
slug: permit-intake-triage
summary: "Reads incoming building and trade permit applications, checks them against the submittal requirements for that permit type, and routes complete ones straight to a plan reviewer."
published: 2026-02-24
updated: 2026-06-30
verified: 2026-07-28
featured: true
sample: true
impact: "Applications returned for a missing document fell from 46% to 12% of intake"
organization: "Mid-sized city — Development Services"
review_status: "Reviewed & approved"
solution_type: "Source code"
use_case_category: "Administrative & task automation"
area:
  - "IT & operations"
  - "Data & informatics"
  - "Policy & planning"
stage: "In production"
ai_role: "Both"
ai_types:
  - "Classification & NLP"
  - "Document Q&A (RAG)"
  - "Computer vision"
ai_tools:
  - "Azure OpenAI Service"
  - "Azure AI Document Intelligence"
  - "Python"
  - "Terraform"
platform:
  - "Microsoft Azure"
expertise: "Developer"
readiness:
  - "Needs customization"
  - "Human review built in"
repo_url: "https://github.com/example-org/permit-intake-triage"
docs_url: "https://docs.example.gov/permit-intake-triage/architecture"
resources:
  - label: "Submittal checklist rubric (shared doc)"
    url: "https://docs.example.org/document/d/7h2k9p4m/edit"
  - label: "Shadow-period evaluation (PDF)"
    url: "https://docs.example.gov/permit-intake-triage/shadow-evaluation.pdf"
screenshots:
  - src: /catalog/permit-intake-triage/screenshots/01.png
    alt: "Intake queue showing permit applications with type, completeness check, missing documents and routing status."
license: "MIT"
portability: "Partially — with rework"
portability_notes: "The rubric, the prompts and the queue logic are plain Python and travel anywhere. Document parsing uses Azure AI Document Intelligence; a team on another cloud would swap that for its own OCR service and re-tune the field extraction, which is about two weeks of work."
cost_band: "$25k–$100k"
run_cost: "Under $10k/yr"
procurement:
  - "Existing enterprise licence"
  - "No procurement needed"
approvals:
  - "Privacy review"
  - "Security review or authority to operate"
  - "Records retention review"
equity_note: "Everyone who applies for a permit is affected, and the group most helped is the one least likely to have a permit expediter: homeowners and small contractors filing on their own, who accounted for most of the returned-for-corrections queue. We compare the return rate for self-filed and agent-filed applications every month. Completeness is the only thing the model judges — it never scores an applicant, and no approval decision is made from its output."
no_pii_attestation: true
data_sensitivity:
  - "Personal information (PII)"
  - "Internal, non-public data"
data_sources:
  - "Permitting system application records"
  - "Uploaded submittal documents (PDF, DWG cover sheets)"
  - "Submittal requirement tables by permit type"
audience: "Internal staff"
data_governance_notes: "Applications carry applicant names, addresses and contact details. Everything stays inside the city's own Azure subscription, nothing is used to train a model, and extracted text is deleted after 30 days while the permit record itself follows the existing retention schedule. No real application data appears in this entry or its screenshot."
security_review: "Automated checks only"
contact_name: "Permitting systems lead"
contact_title: "Development Services Department"
contact_email: "permit-systems@example.org"
---

## Problem

Roughly 9,000 permit applications a year arrive through the online portal, and close to half of them were returned to the applicant for something missing — an unsigned form, no site plan, an expired contractor licence. A permit technician found that out by opening every attachment and comparing it against a submittal checklist that lives in a different document for each of 34 permit types. The check took eight to ten minutes per application, and the queue ran three to five days behind for most of the year.

The cost of that delay was not evenly spread. An applicant with a permit expediter on retainer got their corrections back the same afternoon. A homeowner filing their own deck permit waited a week to find out they had forgotten one form.

## What we built

A service that sits between the portal and the permitting system. When an application lands, it reads the attached documents, extracts the fields that the submittal checklist for that permit type asks for, and produces one of three outcomes: complete and routed to a plan reviewer, incomplete with a specific list of what is missing, or unclear and sent to a technician to look at.

The checklists were the real work. They existed as 34 separate documents written over about fifteen years, and turning them into one machine-readable rubric took longer than building the service. That rubric is in the repository and is probably the most reusable thing here.

## How it works

Uploaded documents go through Azure AI Document Intelligence for text and layout. A model then answers a fixed set of questions per permit type — is there a site plan, is the contractor licence number present and unexpired, is the valuation stated — using only the extracted text, and it must cite the page it took each answer from. The citation requirement is what makes the output checkable; a technician clicks through to the page rather than taking the answer on trust.

Nothing is rejected automatically. "Incomplete" means the applicant gets a message listing what is missing, which is what a technician would have sent anyway. "Unclear" always goes to a person. Complete applications route to a reviewer and a technician spot-checks 10% of them each week.

Everything is deployed with Terraform into the city's own subscription.

## Results

Over the first four months in production, applications returned for a missing document dropped from 46% of intake to 12%, because most of what used to be caught after a three-day wait is now caught at submission while the applicant still has the file open. Median time from submission to first response went from 3.4 days to under an hour.

The 10% spot check has found the model wrong 27 times in four months, almost all of them in the same direction: calling something complete when a required drawing was a placeholder page. We now check drawing sets separately and more strictly, which is the change the spot check paid for.

## Lessons learned

Write the rubric with the technicians who currently apply it, in a room, before you write any code. Half of our checklist items turned out to be applied differently by different technicians, and the model made the disagreement visible rather than causing it.

Do not let the model reject anything. Every design conversation where someone proposed auto-rejection ended with a case where a person would have made the call differently, and the value was never in rejection anyway — it was in telling the applicant sooner.

Budget for the drawing files. Text-heavy PDFs are easy; a 40 MB drawing set with a scanned cover sheet is where the extraction gets expensive and slow.

## How to reuse

Clone the repository, replace the rubric with your own checklists, and expect the rubric work to be most of the project. We used an AI coding assistant heavily for the parsing and infrastructure code, which is why `ai_role` says both. A developer with cloud access can have the shadow-mode deployment running in a week; getting the checklists agreed took us eleven.
