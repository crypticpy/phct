/**
 * The pure half of the monthly refresh sweep (scripts/verification_sweep.mjs):
 * date coercion, which entries count as unconfirmed, who gets mentioned, and
 * the per-entry issue. The GitHub side lives in
 * .github/workflows/verification-sweep.yml and only ever sees the strings these
 * functions produce.
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_MAX_NEW_ISSUES,
  MAX_ISSUE_PAYLOAD,
  handleMention,
  issueMarker,
  lastConfirmed,
  mentionLine,
  monthName,
  parseFrontMatter,
  refreshIssue,
  staleEntries,
  toDay,
} from '../../scripts/verification_sweep.mjs';

const day = (iso) => toDay(iso);

/** @param {object} over @returns {object} an entry as collectEntries would build it */
const entry = (over = {}) => ({
  slug: 'thing',
  file: 'catalog/thing/index.md',
  title: 'A thing',
  url: '/catalog/thing/',
  contact: 'a@example.gov',
  submitter: '',
  data: { published: '2020-01-01' },
  ...over,
});

/** The single stale entry a `published` date of `iso` produces on 2026-08-17. */
const stale1 = (over = {}) => staleEntries([entry(over)], day('2026-08-17'), 365)[0];

const render = (over = {}, options = {}) =>
  refreshIssue({
    entry: stale1(over),
    repo: 'org/catalog',
    branch: 'main',
    siteUrl: 'https://example.org/catalog',
    afterDays: 365,
    ...options,
  });

/* ------------------------------------------------------------------ toDay */

test('toDay parses ISO dates and rejects everything else', () => {
  assert.equal(toDay('2026-03-04'), Date.UTC(2026, 2, 4));
  assert.equal(toDay(new Date(Date.UTC(2026, 2, 4, 22))), Date.UTC(2026, 2, 4));
  for (const bad of ['', null, undefined, 'soon', '2026-3-4', '04/03/2026', 42]) {
    assert.equal(toDay(bad), null, `${String(bad)} should not parse`);
  }
});

test('toDay rejects a date that does not exist', () => {
  assert.equal(toDay('2026-02-31'), null);
  assert.equal(toDay('2026-13-01'), null);
});

/* ---------------------------------------------------------- lastConfirmed */

test('lastConfirmed takes the newest of the three keys, not the strongest', () => {
  const best = lastConfirmed({ published: '2024-01-01', updated: '2026-05-05', verified: '2025-02-02' });
  assert.deepEqual(best, { key: 'updated', day: day('2026-05-05') });
});

test('lastConfirmed prefers verified when it is the newest', () => {
  const best = lastConfirmed({ published: '2024-01-01', updated: '2025-01-01', verified: '2026-01-01' });
  assert.equal(best.key, 'verified');
});

test('lastConfirmed ignores a malformed date rather than throwing', () => {
  const best = lastConfirmed({ published: '2024-01-01', verified: 'last spring' });
  assert.equal(best.key, 'published');
});

test('lastConfirmed is null when the entry has no usable date at all', () => {
  assert.equal(lastConfirmed({ title: 'x' }), null);
});

/* ---------------------------------------------------------- staleEntries */

test('staleEntries returns only entries past the window, oldest first', () => {
  const entries = [
    entry({ slug: 'fresh', data: { published: '2026-06-01' } }),
    entry({ slug: 'ancient', data: { published: '2022-01-01' } }),
    entry({ slug: 'just-over', data: { published: '2025-08-16' } }),
  ];
  const stale = staleEntries(entries, day('2026-08-17'), 365);
  assert.deepEqual(
    stale.map((e) => e.slug),
    ['ancient', 'just-over']
  );
  assert.equal(stale[1].days, 366);
  assert.equal(stale[1].since, '2025-08-16');
  assert.equal(stale[1].key, 'published');
});

test('staleEntries treats exactly the window as still fresh', () => {
  const entries = [entry({ data: { published: '2025-08-17' } })];
  assert.deepEqual(staleEntries(entries, day('2026-08-17'), 365), []);
});

test('a recent verified date rescues an old entry', () => {
  const entries = [entry({ data: { published: '2019-01-01', verified: '2026-07-01' } })];
  assert.deepEqual(staleEntries(entries, day('2026-08-17'), 365), []);
});

test('staleEntries skips entries with no date instead of counting them stale', () => {
  const entries = [entry({ slug: 'undated', data: {} })];
  assert.deepEqual(staleEntries(entries, day('2026-08-17'), 365), []);
});

test('staleEntries honours a custom window', () => {
  const entries = [entry({ data: { published: '2026-01-01' } })];
  assert.equal(staleEntries(entries, day('2026-08-17'), 30).length, 1);
  assert.equal(staleEntries(entries, day('2026-08-17'), 3650).length, 0);
});

test('staleEntries falls back to a year for a nonsense window', () => {
  const entries = [entry({ data: { published: '2024-01-01' } })];
  for (const bad of [0, -5, NaN, undefined]) {
    assert.equal(staleEntries(entries, day('2026-08-17'), bad).length, 1);
  }
});

/* ---------------------------------------------------------- handleMention */

test('handleMention normalises what a person actually types', () => {
  assert.equal(handleMention('jordan-lee'), '@jordan-lee');
  assert.equal(handleMention('@jordan-lee'), '@jordan-lee');
  assert.equal(handleMention('  @@jordan-lee '), '@jordan-lee');
  assert.equal(handleMention('org/data-governance'), '@org/data-governance');
});

test('handleMention mentions nobody rather than the wrong body', () => {
  for (const bad of [
    '',
    null,
    undefined,
    'jordan lee',
    'jordan.lee@city.gov',
    'https://github.com/jordan-lee',
    '-leading-hyphen',
    'a'.repeat(40),
  ]) {
    assert.equal(handleMention(bad), '', `${String(bad)} should mention nobody`);
  }
});

/* ------------------------------------------------------------ mentionLine */

test('mentionLine names the submitter first and says why they were asked', () => {
  const line = mentionLine({ submitter: '@jordan-lee', mentions: ['catalog-maintainers'] });
  assert.match(line, /^@jordan-lee @catalog-maintainers/);
  assert.match(line, /you submitted this entry/);
});

test('mentionLine falls back to the standing list when nobody submitted a handle', () => {
  const line = mentionLine({ submitter: '', mentions: ['catalog-maintainers'] });
  assert.equal(
    line,
    "@catalog-maintainers — nobody is named on this entry, so this one is the maintainers' to chase."
  );
});

test('mentionLine never mentions the same person twice', () => {
  const line = mentionLine({
    submitter: 'jordan-lee',
    mentions: ['@jordan-lee', 'catalog-maintainers', 'catalog-maintainers'],
  });
  assert.equal(line.match(/@jordan-lee/g).length, 1);
  assert.equal(line.match(/@catalog-maintainers/g).length, 1);
});

test('mentionLine is empty when there is nobody to name', () => {
  assert.equal(mentionLine({ submitter: '', mentions: [] }), '');
  assert.equal(mentionLine({ submitter: 'not an account', mentions: ['also not one'] }), '');
});

/* ----------------------------------------------------------- refreshIssue */

test('refreshIssue links the entry, dates it, and offers both one-click answers', () => {
  const issue = render();
  assert.equal(issue.slug, 'thing');
  assert.match(issue.body, /\[A thing\]\(https:\/\/example\.org\/catalog\/catalog\/thing\/\)/);
  assert.match(issue.body, /last confirmed \*\*January 2020\*\*/);
  assert.match(issue.body, /`published`/);
  assert.match(
    issue.body,
    /https:\/\/github\.com\/org\/catalog\/issues\/new\?template=refresh-entry\.yml&slug=thing/
  );
  assert.match(issue.body, /https:\/\/github\.com\/org\/catalog\/edit\/main\/catalog\/thing\/index\.md/);
});

test('refreshIssue titles the issue without a date, so a rewrite keeps one thread', () => {
  const issue = render();
  assert.equal(issue.title, 'Still accurate? A thing');
  assert.doesNotMatch(issue.title, /\d{4}/);
});

test('refreshIssue carries the slug marker the sweep dedupes on', () => {
  const issue = render();
  assert.equal(issue.marker, '<!-- refresh-entry: thing -->');
  assert.ok(issue.body.includes(issue.marker));
  // The workflow re-reads it with this shape; keep them in step.
  assert.match(issue.body, /<!--\s*refresh-entry:\s*([a-z0-9-]+)\s*-->/);
});

test('refreshIssue mentions the submitter when the entry named one', () => {
  const issue = render({ submitter: '@jordan-lee' }, { mentions: ['catalog-maintainers'] });
  assert.match(issue.body, /@jordan-lee @catalog-maintainers/);
});

test('refreshIssue says nothing about mentions when nobody is named', () => {
  const issue = render();
  assert.doesNotMatch(issue.body, /@/);
});

test('refreshIssue degrades to a reply-here ask when the repository is unknown', () => {
  const issue = refreshIssue({
    entry: stale1(),
    repo: '',
    branch: 'main',
    siteUrl: '',
    afterDays: 365,
  });
  assert.match(issue.body, /\*\*A thing\*\*/);
  assert.match(issue.body, /Reply here to say it is still accurate/);
  assert.doesNotMatch(issue.body, /github\.com/);
});

test('every refresh issue stays far inside the size GitHub accepts', () => {
  const issue = render({ title: 'A'.repeat(200) });
  assert.ok(issue.body.length < 65536, `body is ${issue.body.length} characters`);
});

/* ------------------------------------------------------------------- caps */

test('the two caps are separate numbers with the courtesy one much smaller', () => {
  assert.ok(DEFAULT_MAX_NEW_ISSUES > 0);
  assert.ok(MAX_ISSUE_PAYLOAD > DEFAULT_MAX_NEW_ISSUES);
});

/* ------------------------------------------------------------ issueMarker */

test('issueMarker is a comment, so a reader never sees it', () => {
  assert.equal(issueMarker('a-slug'), '<!-- refresh-entry: a-slug -->');
});

/* ------------------------------------------------------- parseFrontMatter */

test('parseFrontMatter reads the fenced block and nothing else', () => {
  const data = parseFrontMatter('---\ntitle: X\nverified: 2026-01-02\n---\n\nBody text with --- in it.\n');
  assert.equal(data.title, 'X');
  assert.equal(toDay(data.verified), day('2026-01-02'));
});

test('parseFrontMatter returns an empty object for a document with none or a broken one', () => {
  assert.deepEqual(parseFrontMatter('Just a body.\n'), {});
  assert.deepEqual(parseFrontMatter('---\ntitle: [unclosed\n---\n'), {});
});

/* -------------------------------------------------------------- monthName */

test('monthName formats in UTC and passes through what it cannot parse', () => {
  assert.equal(monthName('2026-01-31'), 'January 2026');
  assert.equal(monthName('whenever'), 'whenever');
});
