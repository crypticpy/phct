# Maintainers

**Adopting this template?** Replace this file with your own names and roles — a template update
never overwrites it, so your version is the one that stays. The same goes for
`.github/CODEOWNERS` and `SUPPORT.md`.

PHCT is maintained as a small public-interest project. It does not promise paid support, 24-hour
response, or uninterrupted service. GitHub Pages serves static output; maintainers review code,
dependencies, releases, security reports, and downstream compatibility.

## Current roles

| Role | Account | Responsibilities |
|---|---|---|
| Primary technical maintainer | `@crypticpy` | Shared code review, security triage, PHCT releases, CI and update tooling. |
| Product owner | `<Name the site owner here>` | Content policy, publication decisions, taxonomy, governance language, and final go/no-go. |
| Backup release maintainer | `<Name the backup maintainer here>` | Must be able to run a release, update the deployment, roll back, rotate credentials, and handle a takedown without the primary maintainer. |

A site is not ready for operational handoff while the backup role is a placeholder. Add the real
GitHub account to `.github/CODEOWNERS`, branch rules, Pages/admin access, and this table only
after that person accepts the role and completes the drills in `docs/maintaining.md`.

## Decision and access rules

- Two approvals are required for shared workflow, security, dependency, ownership, or release
  changes once the backup is assigned.
- The product owner approves public content and policy; technical maintainers do not silently
  rewrite adopted governance.
- No shared code change begins in a deployment. Reproduce and fix it in PHCT, release it, then
  consume the immutable release downstream.
- Maintainer access is individual, least-privilege, protected by MFA, and reviewed quarterly. Do
  not share accounts, personal access tokens, recovery codes, or signing keys.
- A maintainer stepping down transfers open incidents and releases, removes their credentials,
  and identifies whether another accepted maintainer covers each role.

See `SUPPORT.md` for response expectations, `SECURITY.md` for private reports, and
`docs/maintaining.md` for the operating and succession runbook.
