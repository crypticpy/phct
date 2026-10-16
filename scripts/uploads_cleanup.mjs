#!/usr/bin/env node
/**
 * Delete files attached on /submit/ once nobody needs them. See
 * docs/submit-uploads-plan.md and .github/workflows/uploads-cleanup.yml.
 *
 * Each uploaded file is a branch `u/<user-id>/<set>/<sha256>` in the
 * deployment's PRIVATE uploads repository. Two modes:
 *
 *   closed  A new-entry issue was closed: delete the author's sets that its
 *           body references.
 *   sweep   Daily: delete every set older than MAX_AGE_DAYS that no OPEN
 *           `content:new-entry` issue by the same author still references.
 *
 * The invariant both modes keep: deletion targets ALWAYS come from the ref
 * listing of the uploads repository. Issue text is untrusted and can only
 * select among refs already listed (closed) or cause a set to be KEPT (sweep);
 * it never constructs a ref name. Anything in the listing that is not exactly
 * `refs/heads/u/<digits>/<set>/<sha256>` is left alone.
 *
 * Environment: UPLOADS_TOKEN (write, uploads repo only), UPLOADS_REPO,
 * CATALOG_REPO, GITHUB_TOKEN (issues: read), MODE, ISSUE_BODY and
 * ISSUE_AUTHOR_ID (closed), MAX_AGE_DAYS (default 14), DRY_RUN.
 */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

import { parseUploadRef, SET_ID_RE, SHA256_RE } from './lib/upload_refs.mjs';

const API = 'https://api.github.com';
const PAGE_SIZE = 100;
const DAY_MS = 24 * 60 * 60 * 1000;
const ENTRY_LABEL = 'content:new-entry';
const REF_RE = /^refs\/heads\/u\/([1-9][0-9]*)\/([^/]+)\/([^/]+)$/;
const REF_IN_TEXT_RE = /upload:[a-z2-7]{26}\/[0-9a-f]{64}\.(?:png|jpg|webp|pdf)/g;

/** @param {string} text @returns {Set<string>} set ids named by strict `upload:` lines */
function setsFromLines(text) {
  const sets = new Set();
  for (const line of String(text ?? '').split(/\r?\n/)) {
    const ref = parseUploadRef(line.split('|')[0]);
    if (ref) sets.add(ref.set);
  }
  return sets;
}

/** Looser than setsFromLines on purpose: it only ever keeps more. */
function setsFromAnywhere(text) {
  const sets = new Set();
  for (const hit of String(text ?? '').match(REF_IN_TEXT_RE) ?? []) {
    const ref = parseUploadRef(hit);
    if (ref) sets.add(ref.set);
  }
  return sets;
}

/**
 * @param {{ env: Record<string,string|undefined>, fetch?: typeof fetch, now?: () => number, log?: (line: string) => void }} io
 * @returns {Promise<{ mode: string, dryRun: boolean, listed: number, ignored: number, deleted: string[], gone: number, kept: number, failed: number, lines: string[] }>}
 */
export async function cleanup({ env, fetch: fetchImpl = globalThis.fetch, now = Date.now, log = () => {} }) {
  const mode = env.MODE;
  if (mode !== 'closed' && mode !== 'sweep')
    throw new Error(`MODE must be "closed" or "sweep", got ${JSON.stringify(mode)}`);
  const uploadsRepo = env.UPLOADS_REPO;
  if (!/^[\w.-]+\/[\w.-]+$/.test(uploadsRepo ?? '')) throw new Error('UPLOADS_REPO must be owner/name');
  if (!env.UPLOADS_TOKEN) throw new Error('UPLOADS_TOKEN is not set');
  const dryRun = /^(1|true|yes)$/i.test(env.DRY_RUN ?? '');

  async function call(method, url, token) {
    const res = await fetchImpl(url.startsWith('http') ? url : `${API}${url}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'phct-uploads-cleanup',
      },
    });
    return res;
  }

  async function pages(url, token) {
    const items = [];
    for (let page = 1; ; page += 1) {
      const res = await call(
        'GET',
        `${url}${url.includes('?') ? '&' : '?'}per_page=${PAGE_SIZE}&page=${page}`,
        token
      );
      if (!res.ok) throw new Error(`GET ${url.split('?')[0]} failed: ${res.status}`);
      const batch = await res.json();
      if (!Array.isArray(batch)) throw new Error(`GET ${url.split('?')[0]} did not return a list`);
      items.push(...batch);
      if (batch.length < PAGE_SIZE) return items;
    }
  }

  // The ref listing: the only source of deletion targets.
  const listing = await pages(`/repos/${uploadsRepo}/git/matching-refs/heads/u/`, env.UPLOADS_TOKEN);
  const refs = [];
  for (const item of listing) {
    const m = REF_RE.exec(String(item?.ref ?? ''));
    if (!m || !SET_ID_RE.test(m[2]) || !SHA256_RE.test(m[3])) continue;
    refs.push({ branch: `u/${m[1]}/${m[2]}/${m[3]}`, user: m[1], set: m[2], sha: item?.object?.sha });
  }
  const ignored = listing.length - refs.length;

  /** @type {typeof refs} */
  let targets = [];
  let kept = 0;
  const lines = [];

  if (mode === 'closed') {
    const author = String(env.ISSUE_AUTHOR_ID ?? '').trim();
    if (!/^[1-9][0-9]*$/.test(author)) throw new Error('ISSUE_AUTHOR_ID is not a GitHub user id');
    const named = setsFromLines(env.ISSUE_BODY);
    targets = refs.filter((r) => r.user === author && named.has(r.set));
  } else {
    if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is not set');
    const catalog = env.CATALOG_REPO;
    if (!/^[\w.-]+\/[\w.-]+$/.test(catalog ?? '')) throw new Error('CATALOG_REPO must be owner/name');
    const days = Number(env.MAX_AGE_DAYS || 14);
    if (!Number.isFinite(days) || days < 0) throw new Error('MAX_AGE_DAYS must be a non-negative number');
    const cutoff = now() - days * DAY_MS;

    // A failure here throws before anything is deleted: not knowing what is
    // still referenced must never look like "nothing is".
    const open = await pages(
      `/repos/${catalog}/issues?state=open&labels=${encodeURIComponent(ENTRY_LABEL)}`,
      env.GITHUB_TOKEN
    );
    const referenced = new Set(); // `<user>/<set>`
    for (const issue of open) {
      if (issue.pull_request) continue;
      const author = String(issue.user?.id ?? '');
      for (const set of setsFromAnywhere(issue.body)) referenced.add(`${author}/${set}`);
    }

    const groups = new Map();
    for (const r of refs) {
      const key = `${r.user}/${r.set}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    for (const [key, members] of groups) {
      if (referenced.has(key)) {
        kept += 1;
        continue;
      }
      let newest = 0;
      let known = true;
      for (const r of members) {
        let when = NaN;
        if (r.sha) {
          const res = await call('GET', `/repos/${uploadsRepo}/git/commits/${r.sha}`, env.UPLOADS_TOKEN);
          if (res.ok) {
            const commit = await res.json();
            when = Date.parse(commit?.committer?.date ?? '');
          }
        }
        if (Number.isNaN(when)) known = false;
        else newest = Math.max(newest, when);
      }
      // An age that cannot be read keeps the set.
      if (!known || newest > cutoff) {
        kept += 1;
        continue;
      }
      targets.push(...members);
    }
  }

  const deleted = [];
  let gone = 0;
  let failed = 0;
  for (const r of targets) {
    if (dryRun) {
      deleted.push(r.branch);
      continue;
    }
    const res = await call('DELETE', `/repos/${uploadsRepo}/git/refs/heads/${r.branch}`, env.UPLOADS_TOKEN);
    if (res.ok) deleted.push(r.branch);
    else if (res.status === 404 || res.status === 422) gone += 1;
    else failed += 1;
  }

  lines.push(
    `Uploads cleanup (${mode}${dryRun ? ', dry run' : ''}) on ${uploadsRepo}`,
    `- refs listed: ${listing.length} (ignored, not an upload branch: ${ignored})`,
    `- ${dryRun ? 'would delete' : 'deleted'}: ${deleted.length}`,
    `- already gone: ${gone}`,
    ...(mode === 'sweep' ? [`- sets kept (referenced or too young): ${kept}`] : []),
    `- failed: ${failed}`
  );
  for (const line of lines) log(line);
  return { mode, dryRun, listed: listing.length, ignored, deleted, gone, kept, failed, lines };
}

async function main() {
  try {
    const result = await cleanup({ env: process.env, log: (line) => console.log(line) });
    if (process.env.GITHUB_STEP_SUMMARY) {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${result.lines.join('\n')}\n`);
    }
    if (result.failed > 0) process.exitCode = 1;
  } catch (error) {
    console.error(`uploads cleanup failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
