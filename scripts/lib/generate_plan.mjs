/**
 * What `npm run generate` would change, worked out without writing anything.
 *
 * `npm run setup` writes the configurator's files and then runs generate, so
 * its `--dry-run` has to show both halves: the files it writes itself, and what
 * generate does next with them — the wizard defaults it recompiles, and the
 * optional issue forms it adds or deletes.
 */

import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

import { OUTPUT_PATH as DEFAULTS_PATH, renderDefaults } from '../build_defaults.mjs';
import { pendingOptionalForms } from './optional_issue_forms.mjs';

const REPOSITORY = /^[\w.-]+\/[\w.-]+$/u;

/**
 * Point file-view links into GitHub (/blob/, /tree/, /raw/, /edit/) at
 * `repository`. The shipped footer links to a file in the template's own
 * repository, so a fork's footer keeps pointing at the template until this
 * runs; a bare github.com/org/project link is a deliberate link out and stays.
 *
 * @param {string} text the contents of _data/site.yml
 * @param {string} repository owner/repository; anything else leaves the text alone
 * @returns {string}
 */
export function pointRepositoryLinks(text, repository) {
  const own = String(repository ?? '').trim();
  if (!REPOSITORY.test(own)) return text;
  return text.replace(/github\.com\/[\w.-]+\/[\w.-]+(?=\/(?:blob|tree|raw|edit)\/)/g, `github.com/${own}`);
}

/**
 * The files `npm run generate` would write or delete once `files` are on disk,
 * beyond `files` themselves (generate rewrites those to the same bytes).
 *
 * @param {string} root the repository root
 * @param {Record<string, string>} files repository-relative path → contents
 *   about to be written; must include _data/site.yml
 * @returns {{write: Record<string, string>, remove: Record<string, string>}}
 *   path → new contents for each file generate would create or change, and
 *   path → the setting that turned it off for each file it would delete
 */
export function planGenerate(root, files) {
  const site = yaml.load(files['_data/site.yml']) || {};
  const write = {};

  const defaults = renderDefaults(root, files);
  const defaultsFile = path.join(root, DEFAULTS_PATH);
  if (!fs.existsSync(defaultsFile) || fs.readFileSync(defaultsFile, 'utf8') !== defaults) {
    write[DEFAULTS_PATH] = defaults;
  }

  const forms = pendingOptionalForms(root, site);
  return { write: { ...write, ...forms.write }, remove: forms.remove };
}
