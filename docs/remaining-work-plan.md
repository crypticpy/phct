# Remaining work plan — PHCT release and BCHC demo

- Plan date: 2026-08-22
- Parent repository: [crypticpy/phct](https://github.com/crypticpy/phct)
- Downstream demo: [crypticpy/bchc-ai-use-case-catalog](https://github.com/crypticpy/bchc-ai-use-case-catalog)
- Detailed governing plan: [Polish and publication plan](polish-and-publish-plan.md)
- Current evidence: [Release-readiness status](release-readiness-status.md)

## Outcome

Finish PHCT as a durable, documented open-source template first. Then update BCHC through the
tested updater so BCHC receives the accepted reusable code without losing its name, branding,
configuration, governance, fictional demo content, media, contacts, or protected records.

This plan ends at a stable PHCT `v1.9.0`, a human-reviewed BCHC stable update, a verified Pages
deployment, and a one-business-day demo soak. Assigning BCHC's long-term product owner and backup
technical maintainer remains a later handoff task, not a blocker for the wider demo.

## Current verified checkpoint

The following work is complete:

- Both repositories use protected `main` branches with strict required checks, resolved-thread
  enforcement, deletion protection, and force-push protection.
- Default Actions workflow permissions are read-only. GitHub Actions may create pull requests;
  project workflows do not approve or merge their own pull requests.
- Selected Actions, security scanning, dependency alerts and updates, private vulnerability
  reporting, secret scanning, push protection, and CodeQL are enabled in both repositories.
- PHCT `v1.9.0-rc.2` is immutable at
  `bb2e44714969d261ce77860ddd27af8c5d9626d0`.
- The real BCHC rc.2 updater opened green
  [PR #4](https://github.com/crypticpy/bchc-ai-use-case-catalog/pull/4), preserving all 116
  protected BCHC files byte-for-byte. It remains intentionally unmerged.
- Protected maintenance PRs
  [#17](https://github.com/crypticpy/phct/pull/17) and
  [#20](https://github.com/crypticpy/phct/pull/20) are merged.
- Generated maintenance [PR #19](https://github.com/crypticpy/phct/pull/19) proved that a workflow
  can open a protected PR, publish every required status through trusted dispatches, and remain
  unable to approve, bypass, or merge itself. It was closed without merging rehearsal metrics.
- The governing plan merged through [PHCT PR #18](https://github.com/crypticpy/phct/pull/18) at
  `f25e87fbc0bb9db9caccb994893921e93634fd1f`; its exact post-merge Pages deployment passed.

## Rules for every remaining phase

1. PHCT is the only source of reusable template code.
2. A reusable defect found in BCHC is reproduced and fixed in PHCT first.
3. BCHC receives template changes only through an immutable parent tag and full 40-character SHA.
4. The updater must keep every protected BCHC path byte-identical unless an intentional migration
   is separately documented and approved by a human.
5. Bots may create or update PRs but may not approve or merge them.
6. Routine parent implementation PRs may proceed without a new conversational approval.
7. P0/P1 findings block both the wider demo and stable release. Unaccepted P2 findings block
   stable release.
8. Never move a release tag, hide a failed run, hand-copy a parent tree into BCHC, or replace
   evidence with an undocumented exception.

## Phase 1 — interface and state audit in PHCT

Review every reusable surface at phone, tablet, laptop, and wide-desktop widths:

- home, navigation, demo banner, browse tiles, featured/latest content, footer, and 404;
- catalog grid/list, search, filters, active state, sorting, comparison, and empty/error states;
- entry hero, fact strip, gallery, in-page navigation, reuse rail, related entries, citation,
  print, and share states;
- submission form, autosave, validation, GitHub handoff, success/failure explanation, and no-JS;
- setup wizard, preset selection, theme/schema preview, review/download, and operator errors; and
- governance, cohorts, events, resources, style guide, documentation, and disabled modules.

For each surface, cover normal, empty, one-item, long-copy, missing-image, slow/failing-data,
invalid-input, keyboard-focus, reduced-motion, forced-colour, zoom/reflow, and narrow-screen states.

Deliverables:

- a finding log with route, viewport/state, severity, expected result, component owner, and evidence;
- a named baseline screenshot set for PHCT and the BCHC rc.2 preview; and
- an explicit zero-P0/P1 decision before implementation is considered complete.

Exit: every P0/P1/P2 interface finding has a fix PR or an accepted owner/date/disposition.

## Phase 2 — interface, usability, and accessibility fixes

Implement reusable corrections in small PHCT PRs grouped by component or journey. Preserve the
existing Quiet Instrument design brief and token system; do not create a BCHC-only component fork.

Each fix PR must include, where practical:

- a regression test for the corrected state;
- before/after mobile and desktop screenshots;
- keyboard and focus verification;
- updated generated output for all affected presets;
- BCHC configuration rebuild evidence; and
- full protected CI on the exact reviewed head.

Pay particular attention to plain-language actions, obvious busy/success/error feedback, touch
targets, focus order/return, live-region announcements, no-JS behavior, print output, long text,
and the visibility of BCHC's fictional-data explanation.

Exit: the design rubric has no unresolved P1/P2 finding and every preset remains intentional.

## Phase 3 — manual browser and assistive-technology acceptance

After automated checks pass, run the critical visitor, contributor, reviewer, maintainer, and
first-time-adopter journeys on:

- current Chrome, Firefox, Safari, and Edge;
- iOS Safari and Android Chrome;
- keyboard-only navigation;
- VoiceOver with Safari and NVDA with Firefox or Chrome;
- 200%, 300%, and 400% zoom/reflow;
- Windows forced colours and reduced motion; and
- slow/offline data, unavailable search, validation failure, and pop-up-blocked handoff states.

Record browser/OS/assistive-technology versions, route, result, evidence, defect, retest date, and
reviewer. Automation cannot close this phase by itself.

Exit: every critical journey passes and every serious manual finding has been retested.

## Phase 4 — performance, reliability, and security durability

Keep 100 entries as the supported ceiling unless this release deliberately adds pagination or
incremental rendering. Re-run the 0/1/10/100/500/1,000-entry fixtures and retain before/after
measurements for build time, artifact/DOM size, CSS/JS/search payloads, Lighthouse, CLS, TBT,
filter p95, and search p95.

Re-review and test failure paths for:

- issue parsing, YAML generation, slugs, attachments, image decoding, redirects, and path
  confinement;
- updater ownership, protected checksums, tag/SHA verification, stale branches, and rollback;
- GitHub API timeouts/rate limits, failed dispatches, missing credentials, missing tools, partial
  downloads, and Pages failures; and
- dependency, license, workflow, CodeQL, secret, and SBOM gates.

Operator-facing failures must explain what happened, whether anything changed, and the safest next
step in language a non-developer can follow.

Exit: no unexplained regression, known P0/P1, unaccepted P2, or unsafe/unexplained failure mode.

## Phase 5 — open-source and nonexpert-maintainer polish

Review the public project as a new adopter with no access to the original developer:

- README purpose, screenshots, examples, support ceiling, prerequisites, architecture summary,
  15-minute start, and no-terminal path;
- LICENSE, attribution, notices, SBOM, SECURITY, SUPPORT, CODE_OF_CONDUCT, CONTRIBUTING,
  MAINTAINERS, and CODEOWNERS consistency;
- bug, feature, accessibility, documentation, and private-security issue routes;
- setup, configuration, publishing, updating, rollback, takedown, credential rotation,
  backup/restore, incident, and repository-transfer instructions;
- troubleshooting indexed by the message an operator sees; and
- repository description, topics, homepage, releases, screenshots, labels, branches, security
  reporting, and contribution defaults.

Run a clean-clone setup rehearsal on macOS, Linux, and a GitHub-hosted runner. The GitHub issue and
workflow path remains BCHC's primary operating path; terminal commands are for developers and
emergency recovery.

Exit: a new adopter can publish a test deployment, and a different maintainer can diagnose and
roll back a failed workflow without live coaching.

## Phase 6 — immutable final release candidate

After phases 1–5 are green:

1. Freeze reusable changes and update the evidence ledger.
2. Open a release-record PR setting package and lock versions to `1.9.0-rc.3` and updating the
   changelog, migration notes, compatibility statement, support limits, and evidence links.
3. Run the complete protected suite from a clean clone on the exact release-record head.
4. Verify every showcase/preset build comes from that commit.
5. Merge normally, then create immutable `v1.9.0-rc.3` on that exact commit.
6. Publish the full SHA, SBOM/checksum, compatibility impact, rollback instructions, limitations,
   and exact CI evidence.
7. Download and verify the published assets and tag-to-commit equality.

If another parent correction is required, create rc.4; never replace or move rc.3.

Exit: one immutable candidate contains all intended reusable work and complete evidence.

## Phase 7 — generate and prove the BCHC candidate update

1. Run BCHC's updater against the exact final candidate tag; do not hand-copy files.
2. Verify the new PR's lock contains the same immutable tag and full parent SHA.
3. Confirm all protected BCHC files remain byte-identical.
4. Verify BCHC identity, colours, contacts, configuration, schema, search vocabulary, navigation,
   governance, demo content, images, events, cohorts, resources, and protected documentation.
5. Confirm template-owned code matches the candidate and generated output was rebuilt from BCHC's
   preserved settings.
6. Require the complete downstream test, coverage, build, workflow, security, scale, accessibility,
   interaction, Lighthouse, and preview evidence.
7. Compare PHCT and BCHC presentation screenshots and rehearse update rollback.
8. Keep BCHC PR #4 until the new candidate PR's provenance is verified, then mark #4 superseded
   without merging it.
9. Obtain human review. Automation must not approve or merge the candidate update.

Exit: BCHC proves the candidate without content drift and with a demonstrated rollback path.

## Phase 8 — live candidate and presentation rehearsal

Before a stable-version commit or tag exists:

- run fake issue -> generated PR -> media -> checks -> review -> merge -> Pages -> notification
  journeys, removing the rehearsal content afterward;
- exercise candidate-specific behavior in a temporary BCHC rehearsal repository when the
  candidate differs from BCHC's current workflows or content machinery;
- verify presentation links and contacts while signed out;
- confirm fictional/demo labeling at every presentation entry point;
- rehearse the actual device, display, browser, and network, with offline screenshots/PDF and the
  last known-good deployment available;
- scan content, history, issues, PRs, artifacts, analytics, screenshots, and notes for PII, PHI,
  credentials, private URLs, or non-public contacts; and
- rehearse bad-deploy rollback and urgent content takedown, recording exact steps and elapsed time.

Exit: the presentation remains safe and usable if the newest deploy or network fails.

## Phase 9 — stable publication, BCHC update, and soak

1. Open a stable release-record PR directly on the accepted candidate commit. Change only
   version-bearing release records from `1.9.0-rc.3` to `1.9.0`; include no reusable behavior change.
2. Verify the candidate-to-stable diff against that allowlist and run every protected parent gate.
3. Merge normally and create immutable `v1.9.0` on the exact stable-version commit.
4. Publish release notes, migration/rollback guidance, SBOM/checksum, support statement,
   limitations, candidate provenance, and exact CI links.
5. Run BCHC's updater against stable `v1.9.0`; verify tag, lock, SHA, and package version agreement.
6. Re-run all protected-file and downstream gates on the generated stable BCHC PR.
7. Obtain human review and merge the stable BCHC update.
8. Verify the deployed Pages SHA and every presentation-critical route.
9. Verify PHCT's public metadata, quick start, issue forms, security route, showcase, release links,
   and downloadable assets while signed out.
10. Soak the BCHC deployment for one business day with no unresolved P0/P1, checking Actions,
    Pages, console errors, links, layout, and submissions.
11. Record exact PHCT tag/SHA, BCHC lock/SHA, deployment SHA/URL, reviewers, runs, assets, rollback
    point, and go/no-go decision in both ledgers.

Exit: BCHC consumes the audited stable parent release and the wider-demo decision is backed by
retained evidence.

## Required PR and release order

1. Parent interface/state PRs.
2. Parent reliability, performance, security, and documentation PRs.
3. Parent rc.3 release-record PR.
4. Generated BCHC rc.3 candidate PR, retained as compatibility evidence without merge.
5. Live candidate and presentation rehearsals.
6. Parent stable `1.9.0` release-record PR and immutable tag.
7. Generated BCHC stable update PR, human-reviewed and merged.
8. BCHC-only presentation-content PR if needed; it may change only BCHC-owned content/configuration.

Any reusable correction discovered downstream returns to step 1 and produces a new immutable
candidate. It is not patched only in BCHC.

## Remaining execution ledger

| ID | Deliverable | State |
|---|---|---|
| RW-01 | Parent interface/state audit and baseline screenshots | In progress |
| RW-02 | Parent interface/usability/accessibility fixes | Not started |
| RW-03 | Manual browser and assistive-technology matrix | Not started |
| RW-04 | Performance/reliability/security durability review | Not started |
| RW-05 | Open-source and nonexpert-maintainer polish | Not started |
| RW-06 | Immutable final PHCT release candidate | Not started |
| RW-07 | Generated and verified final BCHC candidate update | Not started |
| RW-08 | Live candidate/presentation/rollback rehearsal | Not started |
| RW-09 | Stable PHCT release and generated BCHC stable update | Not started |
| RW-10 | Human BCHC merge, deployment verification, and one-business-day soak | Not started |
| RW-11 | BCHC owner/backup assignment and handoff drills | Deferred until handoff |

Update this table and the release-readiness status with exact PRs, SHAs, run links, evidence, and
dated decisions as each item completes.

## Human checkpoints

Human action remains required for:

- visual/content acceptance when a change alters the established design brief;
- real-device Safari/iOS and assistive-technology checks;
- final review and merge of the stable BCHC update;
- stable-release and wider-demo go/no-go decisions; and
- owner/backup assignment when organizational handoff begins.

## Definition of done

The remaining work is complete when PHCT has an immutable stable release with zero open P0/P1 and
no unaccepted P2; every supported preset, automated gate, manual critical journey, and public
document passes at the exact release commit; BCHC consumes that commit through its updater with all
protected deployment files preserved; a human has merged and verified the BCHC deployment; the
demo has completed its rollback rehearsal and one-business-day soak; and all evidence a nonexpert
maintainer needs to operate, update, and recover the repositories is current and discoverable.
