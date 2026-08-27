import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  catalogContract,
  interactionBudgetFindings,
  measurableTiers,
  mergeInteractionEvidence,
  percentile,
  tierInteractionBudgets,
  timingSummary,
} from '../../scripts/interaction_performance.mjs';

test('nearest-rank timing summaries are deterministic', () => {
  const samples = Array.from({ length: 20 }, (_, index) => index + 1);
  assert.equal(percentile(samples), 19);
  assert.deepEqual(timingSummary(samples), {
    samples: 20,
    values_ms: samples,
    p50_ms: 10,
    p95_ms: 19,
    max_ms: 20,
  });
  assert.throws(() => percentile([]), /at least one sample/);
  assert.throws(() => percentile(samples, 0), /greater than 0/);
  assert.throws(() => percentile([1, Number.NaN]), /finite, non-negative/);
});

test('the browser fixture must match the supported scale and expose its configured route', (t) => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'phct-interaction-site-'));
  t.after(() => fs.rmSync(site, { recursive: true, force: true }));
  fs.writeFileSync(
    path.join(site, 'entries.json'),
    JSON.stringify({ entry: { path: '/projects/' }, entries: [{ slug: 'one' }] })
  );
  assert.deepEqual(catalogContract(site, 1), { entryPath: 'projects', entries: 1 });
  assert.throws(() => catalogContract(site, 100), /expected supported ceiling 100/);
});

const scaleConfig = {
  supported_entries: 100,
  interaction_entries: [100, 500],
  interaction_budgets: { filter_response_p95_ms: 100, search_response_p95_ms: 250 },
  scale_budgets: {
    500: { search_json_gzip_bytes: 1, search_response_p95_ms: 400, search_cold_response_ms: 3000 },
  },
};

test('interaction budgets fail only when a measured p95 exceeds its reviewed maximum', () => {
  const config = {
    supported_entries: 100,
    interaction_budgets: { filter_response_p95_ms: 100, search_response_p95_ms: 250 },
  };
  const interaction = { filter: { p95_ms: 100 }, search: { warm: { p95_ms: 251 } } };
  assert.deepEqual(interactionBudgetFindings(interaction, config, 100), [
    { name: 'search_response_p95_ms', actual: 251, maximum: 250 },
  ]);
  assert.throws(
    () => interactionBudgetFindings({ filter: {}, search: { warm: { p95_ms: 1 } } }, config, 100),
    /did not measure filter_response_p95_ms/
  );
  assert.throws(
    () => interactionBudgetFindings(interaction, { supported_entries: 100, interaction_budgets: {} }, 100),
    /budget is missing or invalid: filter_response_p95_ms/
  );
});

test('a tier above the supported ceiling enforces exactly what its scale budget names', () => {
  assert.deepEqual(tierInteractionBudgets(scaleConfig, 500), {
    search_response_p95_ms: 400,
    search_cold_response_ms: 3000,
  });
  // A payload budget is not an interaction budget, and an unbudgeted tier is
  // measured and reported rather than failed.
  assert.deepEqual(tierInteractionBudgets(scaleConfig, 1000), {});

  const interaction = {
    filter: { p95_ms: 900 },
    search: { warm: { p95_ms: 401 }, cold_initialization_ms: 10 },
  };
  assert.deepEqual(interactionBudgetFindings(interaction, scaleConfig, 500), [
    { name: 'search_response_p95_ms', actual: 401, maximum: 400 },
  ]);
  assert.deepEqual(interactionBudgetFindings(interaction, scaleConfig, 1000), []);
});

test('only the retained fixtures are measurable, and the rest are named', (t) => {
  const site = fs.mkdtempSync(path.join(os.tmpdir(), 'phct-interaction-tiers-'));
  t.after(() => fs.rmSync(site, { recursive: true, force: true }));
  fs.mkdirSync(path.join(site, '100'));
  fs.writeFileSync(path.join(site, '100', 'entries.json'), '{}');

  assert.deepEqual(measurableTiers(site, scaleConfig), { measurable: [100], missing: [500] });
  assert.deepEqual(measurableTiers(site, { supported_entries: 100 }), { measurable: [100], missing: [] });
});

test('interaction evidence replaces prior browser findings on the run it measured', () => {
  const report = {
    supported_entries: 100,
    runs: [
      {
        entries: 100,
        findings: [
          { name: 'build_ms', actual: 1, maximum: 0 },
          { name: 'filter_response_p95_ms', actual: 200, maximum: 100 },
        ],
      },
      { entries: 500, findings: [{ name: 'search_cold_response_ms', actual: 9, maximum: 1 }] },
    ],
  };
  const interaction = {
    filter: { p95_ms: 20 },
    search: { warm: { p95_ms: 120 }, cold_initialization_ms: 30 },
  };
  assert.deepEqual(mergeInteractionEvidence(report, interaction, scaleConfig), []);
  assert.deepEqual(report.runs[0].findings, [{ name: 'build_ms', actual: 1, maximum: 0 }]);
  assert.equal(report.runs[0].interaction, interaction);

  assert.deepEqual(mergeInteractionEvidence(report, interaction, scaleConfig, 500), []);
  assert.deepEqual(report.runs[1].findings, []);
  assert.throws(() => mergeInteractionEvidence(report, interaction, scaleConfig, 1000), /no 1000-entry run/);
});
