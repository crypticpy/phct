/**
 * The workflow wiring around uploaded files: the scaffold step gets a
 * read-only token for the uploads repository (and nothing else does), the
 * cleanup workflow mints the only write token, and with UPLOADS_REPO unset
 * the feature is off with a clean summary.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { runs } from '../helpers/workflow_expr.mjs';

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..', '.github', 'workflows');
const load = (name) => YAML.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));
const entry = load('new-entry.yml');
const cleanup = load('uploads-cleanup.yml');
const step = (job, id) => job.steps.find((s) => s.id === id);
const TOKEN_ACTION = /^actions\/create-github-app-token@[0-9a-f]{40}$/;
const SHA_COMMENT = /uses: actions\/create-github-app-token@[0-9a-f]{40} # v\d+\.\d+\.\d+/;

test('new-entry: the token step runs only when UPLOADS_REPO is set and is read-only', () => {
  const token = step(entry.jobs.scaffold, 'uploads-token');
  assert.equal(token.if, "vars.UPLOADS_REPO != ''");
  assert.match(token.uses, TOKEN_ACTION);
  assert.equal(token.with['permission-contents'], 'read');
  assert.equal(token.with['app-id'], '${{ secrets.UPLOADS_APP_ID }}');
  assert.equal(token.with['private-key'], '${{ secrets.UPLOADS_APP_PRIVATE_KEY }}');
  assert.ok(Object.keys(token.with).filter((k) => k.startsWith('permission-')).length === 1, 'only contents');
  assert.match(fs.readFileSync(path.join(DIR, 'new-entry.yml'), 'utf8'), SHA_COMMENT);
  const split = step(entry.jobs.scaffold, 'uploads-repo');
  for (const v of [true, false]) {
    assert.equal(runs(token, { vars: { UPLOADS_REPO: v ? 'o/r' : '' } }), v);
    assert.equal(runs(split, { vars: { UPLOADS_REPO: v ? 'o/r' : '' } }), v);
  }
});

test('new-entry: UPLOADS_TOKEN reaches exactly one step, the scaffolder, just before it', () => {
  const steps = Object.values(entry.jobs).flatMap((j) => j.steps);
  const holders = steps.filter((s) => s.env && 'UPLOADS_TOKEN' in s.env);
  assert.equal(holders.length, 1);
  assert.equal(holders[0].id, 'scaffold');
  assert.equal(holders[0].env.UPLOADS_TOKEN, '${{ steps.uploads-token.outputs.token }}');
  assert.equal(holders[0].env.UPLOADS_REPO, '${{ vars.UPLOADS_REPO }}');
  assert.equal(holders[0].env.ISSUE_AUTHOR_ID, '${{ github.event.issue.user.id }}');
  const text = fs.readFileSync(path.join(DIR, 'new-entry.yml'), 'utf8');
  assert.equal(text.match(/steps\.uploads-token\.outputs\.token/g).length, 1);
  const names = entry.jobs.scaffold.steps.map((s) => s.id ?? s.name);
  assert.equal(names.indexOf('uploads-token') + 1, names.indexOf('scaffold'));
});

test('cleanup: triggers, empty top-level permissions, concurrency', () => {
  assert.deepEqual(Object.keys(cleanup.on).sort(), ['issues', 'schedule', 'workflow_dispatch']);
  assert.deepEqual(cleanup.on.issues.types, ['closed']);
  assert.equal(cleanup.on.schedule.length, 1);
  const [minute, hour] = cleanup.on.schedule[0].cron.split(' ');
  assert.notEqual(minute, '0');
  assert.match(hour, /^\d+$/);
  assert.deepEqual(cleanup.permissions, {});
  assert.ok(cleanup.concurrency.group);
});

test('cleanup: the real job needs UPLOADS_REPO and, for a closed issue, the entry label', () => {
  const job = cleanup.jobs.cleanup;
  assert.deepEqual(job.permissions, { contents: 'read', issues: 'read' });
  const labelled = { event: { issue: { labels: [{ name: 'content:new-entry' }] } } };
  const plain = { event: { issue: { labels: [{ name: 'bug' }] } } };
  const ctx = (base, event_name, repo) => ({ github: { event_name, ...base }, vars: { UPLOADS_REPO: repo } });
  assert.equal(runs(job, ctx(labelled, 'issues', 'o/r')), true);
  assert.equal(runs(job, ctx(plain, 'issues', 'o/r')), false);
  assert.equal(runs(job, ctx(plain, 'schedule', 'o/r')), true);
  assert.equal(runs(job, ctx(plain, 'workflow_dispatch', 'o/r')), true);
  assert.equal(runs(job, ctx(labelled, 'issues', '')), false);
  assert.equal(runs(job, ctx(plain, 'schedule', '')), false);
});

test('cleanup: the turned-off job runs exactly when the feature is off, and says why', () => {
  const off = cleanup.jobs['turned-off'];
  const ctx = (event_name, repo, name = 'content:new-entry') => ({
    github: { event_name, event: { issue: { labels: [{ name }] } } },
    vars: { UPLOADS_REPO: repo },
  });
  assert.equal(runs(off, ctx('schedule', '')), true);
  assert.equal(runs(off, ctx('issues', '')), true);
  assert.equal(runs(off, ctx('issues', '', 'bug')), false);
  assert.equal(runs(off, ctx('schedule', 'o/r')), false);
  assert.match(off.steps[0].run, /UPLOADS_REPO[\s\S]*GITHUB_STEP_SUMMARY/);
  assert.equal(off.permissions, undefined);
});

test('cleanup: the write token is minted here, scoped to contents write, and reaches only the script', () => {
  const job = cleanup.jobs.cleanup;
  const token = step(job, 'uploads-token');
  assert.match(token.uses, TOKEN_ACTION);
  assert.equal(token.with['permission-contents'], 'write');
  assert.match(fs.readFileSync(path.join(DIR, 'uploads-cleanup.yml'), 'utf8'), SHA_COMMENT);
  const holders = job.steps.filter((s) => s.env && 'UPLOADS_TOKEN' in s.env);
  assert.equal(holders.length, 1);
  assert.equal(holders[0].run, 'node scripts/uploads_cleanup.mjs');
  assert.equal(holders[0].env.MODE, "${{ github.event_name == 'issues' && 'closed' || 'sweep' }}");
  // Issue text only ever reaches a step through env:.
  for (const s of job.steps) assert.ok(!/github\.event\.issue/.test(s.run ?? ''), s.name);
});

test('both workflows pin the app-token action to the same commit', () => {
  const pins = [entry.jobs.scaffold, cleanup.jobs.cleanup].map((j) => step(j, 'uploads-token').uses);
  assert.equal(pins[0], pins[1]);
});
