import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { renderIssueChooser } from '../../scripts/lib/issue_chooser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('the checked-in issue chooser matches the canonical generator', () => {
  const expected = renderIssueChooser('crypticpy/phct');
  const actual = fs.readFileSync(path.join(ROOT, '.github/ISSUE_TEMPLATE/config.yml'), 'utf8');
  assert.equal(actual, expected);
});

test('the canonical chooser migrates safety structure while preserving downstream identity', () => {
  const chooser = YAML.parse(renderIssueChooser('example/community-catalog'));
  assert.equal(chooser.blank_issues_enabled, false);
  assert.deepEqual(
    chooser.contact_links.map((link) => link.url),
    [
      'https://github.com/example/community-catalog/security/advisories/new',
      'https://github.com/example/community-catalog/blob/main/SECURITY.md',
      'https://github.com/example/community-catalog/blob/main/docs/admin-guide.md',
      'https://github.com/example/community-catalog/blob/main/docs/launch.md',
    ]
  );
});

test('the canonical chooser rejects malformed repository identity', () => {
  assert.throws(() => renderIssueChooser('not-a-repository'), /owner\/repository/u);
});
