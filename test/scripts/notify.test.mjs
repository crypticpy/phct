/**
 * The submitter-facing messages and the status-label rules
 * (scripts/lib/notify.mjs). The GitHub side is test/scripts/notify_github.test.mjs.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_APPEAL,
  DEFAULT_MESSAGES,
  ENTRY_LABEL,
  NOTIFY_LABELS,
  REVIEW_LABELS,
  STATUS,
  currentStatus,
  fill,
  hasMarker,
  linkedIssue,
  marker,
  mayMoveTo,
  pullNumber,
  quote,
  render,
  resolveSettings,
  siteUrl,
  stageDecision,
  statusLabelPlan,
  statusPage,
  statusUrl,
} from '../../scripts/lib/notify.mjs';

const REPO = 'acme/catalog';
const settingsWithStatus = () =>
  resolveSettings({ site: { name: 'Acme', status: { enabled: true } }, repository: REPO });

test('the five status labels are the contract the /status/ page reads', () => {
  assert.deepEqual(Object.values(STATUS), [
    'status:received',
    'status:in-review',
    'status:changes-requested',
    'status:published',
    'status:declined',
  ]);
  const names = NOTIFY_LABELS.map((label) => label.name);
  for (const status of Object.values(STATUS)) assert.ok(names.includes(status), status);
  for (const label of NOTIFY_LABELS) {
    assert.match(label.color, /^[0-9A-F]{6}$/, `${label.name} color`);
    assert.ok(label.description.length <= 100, `${label.name}: GitHub caps label descriptions at 100`);
  }
});

test('no default message uses an em dash, and every acknowledgement names the issue number', () => {
  for (const [kind, text] of Object.entries(DEFAULT_MESSAGES)) {
    assert.doesNotMatch(text, /—/, `${kind} has an em dash`);
  }
  assert.doesNotMatch(DEFAULT_APPEAL, /—/);
  const acknowledgements = [
    'draft_ready',
    'scaffold_failed',
    'pr_failed',
    'paused',
    'no_change',
    'handed_over',
    'triage_ack',
    'label_missing',
  ];
  for (const kind of acknowledgements) {
    const body = render(
      kind,
      { number: 12, pr_url: 'https://github.com/acme/catalog/pull/13', reason: 'x', details: 'd' },
      settingsWithStatus()
    );
    assert.match(body, /\*\*#12\*\*/, `${kind} names #12`);
    assert.match(body, /GitHub emails you/, `${kind} says GitHub emails updates`);
    assert.match(
      body,
      /https:\/\/acme\.github\.io\/catalog\/status\/\?n=12/,
      `${kind} links the status page`
    );
  }
});

test('draft_ready says what happens next, how long, and where the draft is', () => {
  const settings = resolveSettings({
    site: { submit: { turnaround: 'About two weeks.' } },
    repository: REPO,
  });
  const body = render(
    'draft_ready',
    { number: 7, pr_url: 'https://github.com/acme/catalog/pull/8' },
    settings
  );
  assert.match(body, /What happens next:/);
  assert.match(body, /\*\*How long it takes:\*\* About two weeks\./);
  assert.match(body, /pull\/8/);
  assert.doesNotMatch(body, /\{/, 'no placeholder left unfilled');
  assert.doesNotMatch(body, /check where it stands/, 'no status link while the page is off');
});

test('a paragraph whose placeholders are all empty is dropped, an unknown one is kept as written', () => {
  assert.equal(fill('A\n\n**How long:** {turnaround}\n\nB', { turnaround: '' }), 'A\n\nB');
  assert.equal(fill('Hello {nmae}', { name: 'x' }), 'Hello {nmae}');
  assert.equal(fill('One {a} two {b}', { a: '', b: 'x' }), 'One  two x');
});

test('a quoted reason cannot stand on a line of its own, so it cannot plant a marker', () => {
  const planted = `oops\n${marker('draft_ready')}`;
  const body = render('scaffold_failed', { number: 3, reason: planted }, resolveSettings());
  assert.equal(hasMarker(body, 'draft_ready'), false);
  assert.match(body, /^> oops$/m);
  assert.equal(quote(''), '');
});

test('hasMarker matches only the exact marker on its own line', () => {
  const body = `Hello\n\n${marker('kind:42')}`;
  assert.equal(hasMarker(body, 'kind:42'), true);
  assert.equal(hasMarker(body, 'kind:4'), false);
  assert.equal(hasMarker(`text ${marker('kind:42')}`, 'kind:42'), false);
  assert.equal(marker('a b<c>'), '<!-- phct-notify:abc -->');
});

test('settings: overrides, unknown kinds, appeal, reviewers and a logo', () => {
  const settings = resolveSettings({
    site: {
      name: 'Acme Exchange',
      notifications: {
        messages: { declined: 'Sorry about {number}.', nonsense: 'x', published: '   ' },
        reviewers: { committee: 'steering group' },
        logo: '/assets/images/logo.png',
        appeal: 'email the chair.',
      },
    },
    repository: REPO,
  });
  assert.equal(settings.messages.declined, 'Sorry about {number}.');
  assert.equal(settings.messages.published, DEFAULT_MESSAGES.published, 'a blank override keeps the default');
  assert.deepEqual(settings.warnings, [
    'notifications.messages.nonsense is not a message the automation sends; it is ignored.',
  ]);
  assert.equal(settings.appeal, 'email the chair.');
  assert.equal(settings.reviewers.committee, 'steering group');
  assert.equal(settings.reviewers.partner, 'partner reviewers');
  assert.equal(settings.logo, 'https://acme.github.io/catalog/assets/images/logo.png');

  const body = render('with_committee', { number: 5 }, settings);
  assert.match(
    body,
    /^<img src="https:\/\/acme\.github\.io\/catalog\/assets\/images\/logo\.png" alt="Acme Exchange" height="48">/
  );
  assert.match(body, /with the steering group/);

  const unsafe = resolveSettings({ site: { notifications: { logo: 'javascript:alert(1)' } } });
  assert.equal(unsafe.logo, '');
  assert.equal(unsafe.warnings.length, 1);
});

test('the appeal comes from the published appeals policy, then the default', () => {
  const governance = { policies: [{ id: 'appeals', body: 'Write to the board.\n\nMore detail.' }] };
  assert.equal(resolveSettings({ governance }).appeal, 'Write to the board.');
  assert.equal(
    resolveSettings({ governance, site: { modules: { governance: false } } }).appeal,
    DEFAULT_APPEAL
  );
});

test('site URL and status page follow pages.yml and the status switches', () => {
  assert.equal(siteUrl({ repository: REPO }), 'https://acme.github.io/catalog');
  assert.equal(siteUrl({ repository: 'acme/acme.github.io' }), 'https://acme.github.io');
  assert.equal(siteUrl({ repository: REPO, cname: 'catalog.example.org\n' }), 'https://catalog.example.org');
  assert.equal(siteUrl({ repository: REPO, configUrl: 'https://x.org/' }), 'https://x.org/catalog');
  assert.equal(siteUrl({}), '');

  assert.deepEqual(statusPage({}), { enabled: false, path: '/status/' });
  assert.deepEqual(statusPage({ modules: { status: true } }), { enabled: true, path: '/status/' });
  assert.deepEqual(statusPage({ status: { enabled: true, path: 'track' } }), {
    enabled: true,
    path: '/track/',
  });
  assert.equal(statusPage({ modules: { status: true }, status: { enabled: false } }).enabled, false);

  assert.equal(statusUrl(settingsWithStatus(), '#9'), 'https://acme.github.io/catalog/status/?n=9');
  assert.equal(statusUrl(settingsWithStatus(), 'x'), '');
  assert.equal(statusUrl(resolveSettings({ repository: REPO }), 9), '');
});

test('an explicit empty status_url leaves the status link out', () => {
  const body = render('triage_ack', { number: 4, status_url: '' }, settingsWithStatus());
  assert.doesNotMatch(body, /status\//);
});

test('a mention needs a real GitHub login', () => {
  assert.match(render('draft_mention', { number: 1, author: 'jane-doe' }), /^@jane-doe /);
  assert.doesNotMatch(render('draft_mention', { number: 1, author: 'x y' }), /@x/);
  assert.throws(() => render('nope'), /Unknown notification "nope"/);
});

test('exactly one status label at a time', () => {
  assert.deepEqual(statusLabelPlan(['bug', 'status:received', 'status:typo'], STATUS.inReview), {
    add: ['status:in-review'],
    remove: ['status:received', 'status:typo'],
  });
  assert.deepEqual(statusLabelPlan(['status:in-review'], STATUS.inReview), { add: [], remove: [] });
  assert.throws(() => statusLabelPlan([], 'status:other'));
  assert.equal(currentStatus(['x', 'status:declined']), 'status:declined');
  assert.equal(currentStatus([]), '');
});

test('a finished submission is not pulled back into review; final outcomes always apply', () => {
  assert.equal(mayMoveTo(STATUS.published, STATUS.inReview), false);
  assert.equal(mayMoveTo(STATUS.declined, STATUS.changesRequested), false);
  assert.equal(mayMoveTo(STATUS.declined, STATUS.published), true);
  assert.equal(mayMoveTo(STATUS.inReview, STATUS.declined), true);
  assert.equal(mayMoveTo('', STATUS.changesRequested), true);
});

test('linkedIssue and pullNumber read what the workflows write', () => {
  assert.equal(linkedIssue('Draft.\n\nCloses #41'), 41);
  assert.equal(linkedIssue('fixes #7 and more'), 7);
  assert.equal(linkedIssue('See #41'), null);
  assert.equal(linkedIssue('Encloses #41'), null);
  assert.equal(pullNumber('https://github.com/acme/catalog/pull/12'), 12);
  assert.equal(pullNumber('https://github.com/acme/catalog/issues/12'), null);
});

/** A draft pull request event payload. */
function payload({
  action,
  label,
  merged = false,
  state = 'open',
  review,
  sender = 'User',
  fork = false,
  labels = [ENTRY_LABEL],
}) {
  return {
    action,
    label: label ? { name: label } : undefined,
    review,
    sender: { type: sender },
    repository: { full_name: REPO },
    pull_request: {
      body: 'Closes #41',
      html_url: 'https://github.com/acme/catalog/pull/50',
      merged,
      state,
      labels: labels.map((name) => ({ name })),
      head: { repo: { full_name: fork ? 'someone/catalog' : REPO } },
    },
  };
}

test('stageDecision: the transition table in submission-status.yml', () => {
  const pick = (d) => ({
    status: d.status,
    kind: d.kind,
    once: d.once,
    only: d.onlyOnStatusChange,
    close: d.close,
  });
  const cases = [
    [
      ['pull_request', { action: 'labeled', label: REVIEW_LABELS.revisions }],
      { status: STATUS.changesRequested, kind: 'changes_requested', only: true },
    ],
    [
      ['pull_request_review', { action: 'submitted', review: { state: 'CHANGES_REQUESTED', html_url: 'u' } }],
      { status: STATUS.changesRequested, kind: 'changes_requested', only: true },
    ],
    [['pull_request', { action: 'unlabeled', label: REVIEW_LABELS.revisions }], { status: STATUS.inReview }],
    [
      ['pull_request', { action: 'labeled', label: REVIEW_LABELS.committee }],
      { status: STATUS.inReview, kind: 'with_committee', once: true },
    ],
    [
      ['pull_request', { action: 'labeled', label: REVIEW_LABELS.partner }],
      { status: STATUS.inReview, kind: 'with_partner', once: true },
    ],
    [
      ['pull_request', { action: 'labeled', label: REVIEW_LABELS.declined }],
      { status: STATUS.declined, kind: 'declined', once: true, close: true },
    ],
    [
      ['pull_request', { action: 'closed', state: 'closed' }],
      { status: STATUS.declined, kind: 'declined', once: true, close: true },
    ],
    [['pull_request', { action: 'closed', state: 'closed', merged: true }], { status: STATUS.published }],
  ];
  for (const [[eventName, options], expected] of cases) {
    const decision = stageDecision(eventName, payload(options));
    assert.equal(decision.issue, 41, JSON.stringify(options));
    const want = {
      status: expected.status,
      kind: expected.kind,
      once: expected.once,
      only: expected.only,
      close: expected.close,
    };
    assert.deepEqual(pick(decision), want, `${eventName} ${JSON.stringify(options)}`);
  }
  assert.equal(
    stageDecision(
      'pull_request_review',
      payload({ action: 'submitted', review: { state: 'CHANGES_REQUESTED', html_url: 'https://r' } })
    ).vars.notes_url,
    'https://r'
  );
});

test('stageDecision skips what is not an entry draft of this repository, or not a status change', () => {
  const skips = [
    ['pull_request', payload({ action: 'labeled', label: REVIEW_LABELS.revisions, labels: [] })],
    ['pull_request', payload({ action: 'labeled', label: REVIEW_LABELS.revisions, fork: true })],
    ['pull_request', payload({ action: 'labeled', label: REVIEW_LABELS.revisions, sender: 'Bot' })],
    ['pull_request', payload({ action: 'labeled', label: REVIEW_LABELS.revisions, state: 'closed' })],
    ['pull_request', payload({ action: 'labeled', label: 'bug' })],
    ['pull_request', payload({ action: 'unlabeled', label: REVIEW_LABELS.committee })],
    ['pull_request_review', payload({ action: 'submitted', review: { state: 'approved' } })],
    ['pull_request', payload({ action: 'synchronize' })],
    ['push', {}],
  ];
  for (const [eventName, body] of skips) {
    assert.ok(stageDecision(eventName, body).skip, `${eventName} ${body.action} ${body.label?.name ?? ''}`);
  }
  const noLink = payload({ action: 'closed', state: 'closed' });
  noLink.pull_request.body = 'no link';
  assert.match(stageDecision('pull_request', noLink).skip, /Closes #N/);
});

test('a placeholder the caller does not pass drops its paragraph instead of showing braces', () => {
  for (const kind of Object.keys(DEFAULT_MESSAGES)) {
    const body = render(kind, { number: 2 }, resolveSettings());
    assert.doesNotMatch(body, /\{[a-z_]+\}/, `${kind} leaks a placeholder`);
  }
  const override = resolveSettings({
    site: { notifications: { messages: { published: 'Live at {pgae_url}' } } },
  });
  assert.equal(
    render('published', { number: 2, page_url: 'https://x' }, override),
    'Live at {pgae_url}',
    'a typo stays visible'
  );
});
