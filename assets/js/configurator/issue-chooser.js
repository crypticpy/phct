const REPOSITORY = /^[\w.-]+\/[\w.-]+$/u;

/** @returns {boolean} whether a value is a complete owner/repository identity. */
export function isRepositoryIdentity(value) {
  return REPOSITORY.test(String(value ?? '').trim());
}

/**
 * Whether the issue chooser still carries the setup aids: the maintainer-only
 * Apply setup form and the Launch checklist link. `github.setup_forms` decides
 * when it is a boolean; otherwise they follow `demo`, which is on from the
 * template's first day until `npm run eject:samples` (or its checkbox on the
 * Apply setup issue) declares the catalog the deployment's own.
 *
 * @param {object} site a parsed _data/site.yml
 * @returns {boolean}
 */
export function setupFormsEnabled(site) {
  const explicit = site?.github?.setup_forms;
  return typeof explicit === 'boolean' ? explicit : Boolean(site?.demo);
}

const cohortsOn = (site) => Boolean(site?.modules?.cohorts);

/**
 * Issue forms that exist in `.github/ISSUE_TEMPLATE/` only while the site uses
 * them. GitHub has no way to hide a form, so `npm run generate` writes each one
 * from `scripts/issue-forms/<file>` while `enabled(site)` is true and deletes it
 * while it is false.
 *
 * `when` is the site.yml setting named in the generated header and the docs.
 */
export const OPTIONAL_ISSUE_FORMS = Object.freeze(
  [
    { file: 'apply-setup.yml', when: 'setup (github.setup_forms, or demo)', enabled: setupFormsEnabled },
    { file: 'new-year.yml', when: 'modules.cohorts', enabled: cohortsOn },
    { file: 'schedule.yml', when: 'modules.cohorts', enabled: cohortsOn },
    { file: 'new-event.yml', when: 'modules.cohorts', enabled: cohortsOn },
    { file: 'update-event-attachments.yml', when: 'modules.cohorts', enabled: cohortsOn },
  ].map((form) => Object.freeze(form))
);

/**
 * Render the issue chooser from deployment-owned repository identity.
 *
 * The chooser itself is protected during a PHCT update, so the updater runs
 * this generator after reconciliation to migrate its structure without
 * replacing the deployment's identity or content.
 *
 * @param {string} repository owner/repository
 * @param {string} [branch]
 * @param {{setup?: boolean}} [options] `setup` adds the Launch checklist link
 *   (see {@link setupFormsEnabled}); a finished site's chooser leaves it out.
 */
export function renderIssueChooser(repository, branch = 'main', { setup = false } = {}) {
  const configuredRepository = String(repository ?? '').trim();
  if (!isRepositoryIdentity(configuredRepository)) {
    throw new Error('github.repository must use the owner/repository form');
  }
  const configuredBranch = typeof branch === 'string' && branch.trim() ? branch.trim() : 'main';
  const branchPath = configuredBranch.split('/').map(encodeURIComponent).join('/');
  const launch = setup
    ? `  - name: Launch checklist
    url: https://github.com/${configuredRepository}/blob/${branchPath}/docs/launch.md
    about: Setting this catalog up for the first time — settings, the /setup/ wizard, and clearing the demo content.
`
    : '';

  return `# Generated from _data/site.yml by scripts/generate.mjs — do not hand-edit.
# Regenerate with \`npm run generate\` after changing github.repository, github.branch, github.setup_forms, demo, or PHCT.
blank_issues_enabled: false
contact_links:
  - name: Report a security vulnerability privately
    url: https://github.com/${configuredRepository}/security/advisories/new
    about: Never put credentials, personal information, PHI, private URLs, or exploit details in a public issue.
  - name: Security reporting help
    url: https://github.com/${configuredRepository}/blob/${branchPath}/SECURITY.md
    about: Use the documented private email fallback if private vulnerability reporting is not available.
  - name: Maintainer guide
    url: https://github.com/${configuredRepository}/blob/${branchPath}/docs/admin-guide.md
    about: How submissions become pull requests, how to review them, and how to configure the site.
${launch}`;
}
