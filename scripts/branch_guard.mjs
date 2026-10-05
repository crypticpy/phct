#!/usr/bin/env node
/**
 * Decide whether an intake workflow may rebuild (force-push) a draft branch.
 *
 * Input (env):  BRANCH     the draft branch, e.g. entry/<slug>-<issue>
 *               BASE_REF   what the branch is compared against (default HEAD:
 *                          the default-branch commit the workflow checked out)
 * Output:       $GITHUB_OUTPUT  held=true|false, reason, foreign (count)
 *               $GITHUB_STEP_SUMMARY  the reason, for the run page
 *
 * Reads only refs the checkout already fetched (`fetch-depth: 0` brings every
 * branch as refs/remotes/origin/*), so it needs no credentials. The workflows
 * that push themselves use `--force-with-lease`, whose lease is that same
 * remote-tracking ref: a reviewer who pushes after this check makes the push
 * fail rather than vanish.
 *
 * Fails safe. If git cannot answer, the branch is reported as held: a missed
 * rebuild costs a reviewer one manual edit, an unwanted one costs their work.
 * See scripts/lib/branch_guard.mjs for the rule.
 */

import fs from 'node:fs';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

import { setOutput } from './lib/actions_output.mjs';
import { LOG_FORMAT, parseLog, verdict } from './lib/branch_guard.mjs';

/**
 * @param {string[]} args
 * @returns {{ok: boolean, stdout: string, stderr: string}}
 */
function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  return { ok: result.status === 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

/**
 * @param {boolean} held
 * @param {string} reason
 * @param {number} foreign
 */
function report(held, reason, foreign = 0) {
  console.log(reason);
  setOutput('held', held ? 'true' : 'false');
  setOutput('reason', reason);
  setOutput('foreign', String(foreign));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Draft branch\n\n${reason}\n`);
  }
}

const branch = String(process.env.BRANCH ?? '').trim();
const base = String(process.env.BASE_REF ?? '').trim() || 'HEAD';

if (!branch || !git(['check-ref-format', '--branch', branch]).ok) {
  report(true, `"${branch}" is not a usable branch name, so nothing is rebuilt.`);
  process.exit(0);
}

const remote = `refs/remotes/origin/${branch}`;
if (!git(['rev-parse', '--verify', '--quiet', `${remote}^{commit}`]).ok) {
  report(false, `There is no ${branch} branch yet, so it is built fresh.`);
  process.exit(0);
}

const log = git(['log', `--format=${LOG_FORMAT}`, `${base}..${remote}`]);
if (!log.ok) {
  report(
    true,
    `Could not read the history of ${branch} (${log.stderr.trim() || 'git log failed'}), so it is not rebuilt.`
  );
  process.exit(0);
}

const result = verdict(parseLog(log.stdout));
report(result.held, result.reason, result.foreign.length);
