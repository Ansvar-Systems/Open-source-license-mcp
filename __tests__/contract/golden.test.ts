// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeAll } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import all tool functions
import { getLicense } from '../../src/tools/get-license.js';
import { searchLicenses } from '../../src/tools/search-licenses.js';
import { checkCompatibility } from '../../src/tools/check-compatibility.js';
import { getObligationChecklist } from '../../src/tools/get-obligation-checklist.js';
import { compareLicenses } from '../../src/tools/compare-licenses.js';
import { getReuseSpec } from '../../src/tools/get-reuse-spec.js';
import { checkReuseRules } from '../../src/tools/check-reuse-rules.js';
import { searchReuseRules } from '../../src/tools/search-reuse-rules.js';
import { getNoticeTemplate } from '../../src/tools/get-notice-template.js';
import { generateNoticeRequirements } from '../../src/tools/generate-notice-requirements.js';
import { checkAttributionCompliance } from '../../src/tools/check-attribution-compliance.js';
import { getCraLicenseObligations } from '../../src/tools/get-cra-license-obligations.js';
import { checkSbomLicenseCompleteness } from '../../src/tools/check-sbom-license-completeness.js';
import { mapLicenseToCraCategory } from '../../src/tools/map-license-to-cra-category.js';
import { getOpenSourceStewardObligations } from '../../src/tools/get-open-source-steward-obligations.js';
import { about } from '../../src/tools/about.js';
import { listSources } from '../../src/tools/list-sources.js';
import { checkDataFreshness } from '../../src/tools/check-data-freshness.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

// Tool function mapping: snake_case name from golden-tests.json -> implementation.
// Functions with non-standard signatures get wrapper lambdas.
const TOOLS: Record<string, (db: any, args: any) => any> = {
  get_license: (db, args) => getLicense(db, args),
  search_licenses: (db, args) => searchLicenses(db, args),
  check_compatibility: (db, args) => checkCompatibility(db, args),
  get_obligation_checklist: (db, args) => getObligationChecklist(db, args),
  compare_licenses: (db, args) => compareLicenses(db, args),
  get_reuse_spec: (db, args) => getReuseSpec(db, args),
  check_reuse_rules: (db, args) => checkReuseRules(db, args),
  search_reuse_rules: (db, args) => searchReuseRules(db, args),
  get_notice_template: (db, args) => getNoticeTemplate(db, args),
  generate_notice_requirements: (db, args) => generateNoticeRequirements(db, args),
  check_attribution_compliance: (db, args) => checkAttributionCompliance(db, args),
  get_cra_license_obligations: (db, args) => getCraLicenseObligations(db, args),
  check_sbom_license_completeness: (db, args) => checkSbomLicenseCompleteness(db, args),
  map_license_to_cra_category: (db, args) => mapLicenseToCraCategory(db, args),
  get_open_source_steward_obligations: (db, _args) => getOpenSourceStewardObligations(db),
  about: (db, _args) => about(db),
  list_sources: (_db, _args) => listSources(),
  check_data_freshness: (db, _args) => checkDataFreshness(db),
};

interface GoldenTest {
  id: string;
  category: string;
  tool: string;
  input: Record<string, unknown>;
  assertions: {
    has_field?: string[];
    field_equals?: Record<string, unknown>;
    array_min_length?: Record<string, number>;
    array_contains_field_value?: { array: string; field: string; value: unknown };
  };
}

let db: any;
let tests: GoldenTest[];

beforeAll(() => {
  // DB is built by globalSetup (tests/global-setup.ts)
  db = new BetterSqlite3(join(ROOT, 'data/database.db'), { readonly: true });
  const golden = JSON.parse(readFileSync(join(ROOT, 'fixtures/golden-tests.json'), 'utf-8'));
  tests = golden.tests;
});

describe('Golden Contract Tests', () => {
  it('should load golden test fixtures', () => {
    expect(tests.length).toBeGreaterThanOrEqual(12);
  });

  // Build the test table eagerly so vitest can enumerate test names.
  // The fixture file is read synchronously at module load time.
  const goldenFixture = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../fixtures/golden-tests.json'), 'utf-8'),
  );
  const testTable = goldenFixture.tests.map((t: GoldenTest) => [t.id, t.tool]);

  it.each(testTable)('[%s] %s', (id: string, _tool: string) => {
    const test = tests.find((t) => t.id === id)!;
    expect(test, `Golden test ${id} not found`).toBeDefined();

    const toolFn = TOOLS[test.tool];
    expect(toolFn, `Tool "${test.tool}" not found in TOOLS map`).toBeDefined();

    const result = toolFn(db, test.input);

    // has_field: every listed field must be present on the result object
    if (test.assertions.has_field) {
      for (const field of test.assertions.has_field) {
        expect(result, `[${test.id}] missing field: ${field}`).toHaveProperty(field);
      }
    }

    // field_equals: each field must match the expected value exactly
    if (test.assertions.field_equals) {
      for (const [field, expected] of Object.entries(test.assertions.field_equals)) {
        expect(result[field], `[${test.id}] ${field} should equal ${JSON.stringify(expected)}`).toEqual(expected);
      }
    }

    // array_min_length: the array field must have at least N elements
    if (test.assertions.array_min_length) {
      for (const [field, minLen] of Object.entries(test.assertions.array_min_length)) {
        expect(
          result[field]?.length,
          `[${test.id}] ${field}.length should be >= ${minLen}`,
        ).toBeGreaterThanOrEqual(minLen);
      }
    }

    // array_contains_field_value: at least one element in the array has field === value
    if (test.assertions.array_contains_field_value) {
      const { array, field, value } = test.assertions.array_contains_field_value;
      const arr = result[array] as any[];
      expect(
        arr.some((item: any) => item[field] === value),
        `[${test.id}] ${array} should contain an item where ${field} === ${JSON.stringify(value)}`,
      ).toBe(true);
    }
  });
});
