/**
 * The workflow wiring around the submitter notifications: every rebuild of a
 * draft branch waits on the branch guard, the stage workflow listens for the
 * labels notify.mjs acts on and runs only default-branch code, Bootstrap labels
 * creates the same status labels the notifier does, and every step that
 * imports the notifier has installed it first.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { NOTIFY_LABELS, REVIEW_LABELS } from '../../scripts/lib/notify.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DIR = path.join(ROOT, '.github', 'workflows');
const source = (name) => fs.readFileSync(path.join(DIR, name), 'utf8');
const parse = (name) => YAML.parse(source(name));

/** Workflows that build a submission's draft branch from an issue. */
const INTAKE = [
  'also-deployed-by.yml',
  'apply-setup.yml',
  'new-entry.yml',
  'new-event.yml',
  'new-year.yml',
  'refresh-entry.yml',
  'update-event-attachments.yml',
  'update-schedule.yml',
];

const writesBranch = (step) =>
  /peter-evans\/create-pull-request@/.test(step.uses ?? '') || /\bgit push\b/.test(step.run ?? '');

test('every intake workflow checks the draft branch before it rebuilds it, on the same branch', () => {
  for (const name of INTAKE) {
    for (const [jobName, job] of Object.entries(parse(name).jobs)) {
      const steps = job.steps ?? [];
      const writers = steps.filter(writesBranch);
      if (writers.length === 0) continue;
      const guardIndex = steps.findIndex((step) => step.id === 'guard');
      assert.ok(guardIndex >= 0, `${name} ${jobName} has no guard step`);
      const guard = steps[guardIndex];
      assert.equal(guard.run, 'node scripts/branch_guard.mjs', `${name} guard`);
      const checkout = steps.find((step) => /actions\/checkout@/.test(step.uses ?? ''));
      assert.equal(
        checkout?.with?.['fetch-depth'],
        0,
        `${name} ${jobName}: the guard reads every remote branch`
      );
      for (const writer of writers) {
        const index = steps.indexOf(writer);
        assert.ok(index > guardIndex, `${name} "${writer.name}" runs before the guard`);
        assert.match(
          String(writer.if ?? ''),
          /steps\.guard\.outputs\.held != 'true'/,
          `${name} "${writer.name}" ignores the guard`
        );
        const branch = writer.with?.branch ?? writer.env?.BRANCH;
        assert.equal(
          branch,
          guard.env?.BRANCH,
          `${name} "${writer.name}" checks one branch and writes another`
        );
        if (/\bgit push\b/.test(writer.run ?? '')) {
          assert.match(writer.run, /git push --force-with-lease origin /, `${name} pushes without a lease`);
        }
      }
      const handOver = steps.find((step) => /notify\.holdEdit\(/.test(step.with?.script ?? ''));
      assert.ok(handOver, `${name} ${jobName} never hands a held edit to the reviewer`);
      assert.match(String(handOver.if), /steps\.guard\.outputs\.held == 'true'/);
    }
  }
});

test('every intake workflow marks the submission received when it opens', () => {
  for (const name of INTAKE) {
    assert.match(source(name), /status: notify\.STATUS\.received/, `${name} never sets status:received`);
  }
});

test('every step that imports the notifier has checked out and installed the repository first', () => {
  const names = fs.readdirSync(DIR).filter((file) => file.endsWith('.yml'));
  let seen = 0;
  for (const name of names) {
    for (const [jobName, job] of Object.entries(parse(name).jobs ?? {})) {
      const steps = job.steps ?? [];
      steps.forEach((step, index) => {
        if (!/notify_github\.mjs/.test(step.with?.script ?? '')) return;
        seen += 1;
        const before = steps.slice(0, index);
        assert.ok(
          before.some((s) => /actions\/checkout@/.test(s.uses ?? '')),
          `${name} ${jobName}: no checkout before "${step.name}"`
        );
        assert.ok(
          before.some((s) => /npm ci/.test(s.run ?? '')),
          `${name} ${jobName}: no npm ci before "${step.name}"`
        );
        assert.equal(job.permissions?.issues, 'write', `${name} ${jobName} cannot comment`);
      });
    }
  }
  assert.ok(seen >= INTAKE.length + 3, `only ${seen} notifier steps found`);
});

test('submission-status.yml listens for exactly the review labels notify.mjs acts on', () => {
  const workflow = parse('submission-status.yml');
  const labels = JSON.parse(/fromJSON\('(\[[^']*\])'\)/.exec(workflow.jobs.notify.if)[1]);
  assert.deepEqual(labels.sort(), Object.values(REVIEW_LABELS).sort());
});

test('submission-status.yml runs only default-branch code, for pull requests from this repository', () => {
  const workflow = parse('submission-status.yml');
  assert.deepEqual(Object.keys(workflow.on).sort(), ['pull_request', 'pull_request_review']);
  assert.equal(
    workflow.permissions && Object.keys(workflow.permissions).length,
    0,
    'no workflow-wide permissions'
  );
  const job = workflow.jobs.notify;
  assert.match(job.if, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.deepEqual(job.permissions, { contents: 'read', issues: 'write', 'pull-requests': 'read' });
  const checkout = job.steps.find((step) => /actions\/checkout@/.test(step.uses ?? ''));
  assert.equal(checkout.with.ref, '${{ github.event.repository.default_branch }}');
  assert.equal(checkout.with['persist-credentials'], false);
  for (const step of job.steps) {
    assert.doesNotMatch(
      String(step.run ?? ''),
      /\$\{\{\s*github\.event/,
      `"${step.name}" puts event text in a shell`
    );
  }
  for (const name of fs.readdirSync(DIR).filter((file) => file.endsWith('.yml'))) {
    assert.ok(
      !Object.hasOwn(parse(name).on ?? {}, 'pull_request_target'),
      `${name} uses pull_request_target`
    );
  }
});

test('Bootstrap labels creates the status and triage labels exactly as the notifier would', () => {
  const created = [
    ...source('bootstrap-labels.yml').matchAll(/^\s*create "([^"]+)"\s+"([0-9A-Fa-f]{6})"\s+"([^"]*)"/gm),
  ].map(([, name, color, description]) => ({ name, color, description }));
  for (const label of NOTIFY_LABELS) {
    assert.deepEqual(
      created.find((c) => c.name === label.name),
      label,
      `${label.name} differs between bootstrap-labels.yml and scripts/lib/notify.mjs`
    );
  }
  for (const label of created)
    assert.ok(label.description.length <= 100, `${label.name}: over GitHub's 100-character limit`);
});
