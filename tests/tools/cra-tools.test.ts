// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeAll } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { getCraLicenseObligations } from '../../src/tools/get-cra-license-obligations.js';
import { checkSbomLicenseCompleteness } from '../../src/tools/check-sbom-license-completeness.js';
import { mapLicenseToCraCategory } from '../../src/tools/map-license-to-cra-category.js';
import { getOpenSourceStewardObligations } from '../../src/tools/get-open-source-steward-obligations.js';

let db: any;

beforeAll(() => {
  db = new BetterSqlite3(join(__dirname, '../../data/database.db'));
});

// ---------------------------------------------------------------------------
// get_cra_license_obligations
// ---------------------------------------------------------------------------

describe('get_cra_license_obligations', () => {
  it('returns all obligations when no filters set', () => {
    const result = getCraLicenseObligations(db, {});
    expect(result.obligations.length).toBeGreaterThan(0);
    expect(result.total).toBe(result.obligations.length);
    expect(result._meta).toBeDefined();
  });

  it('filters by license_type', () => {
    const result = getCraLicenseObligations(db, { license_type: 'permissive' });
    expect(result.obligations.length).toBeGreaterThan(0);
    for (const ob of result.obligations) {
      expect(ob.license_type).toBe('permissive');
    }
  });

  it('filters by cra_article', () => {
    const result = getCraLicenseObligations(db, { cra_article: 'Article 13(1)(f)' });
    expect(result.obligations.length).toBeGreaterThan(0);
    for (const ob of result.obligations) {
      expect(ob.cra_article).toBe('Article 13(1)(f)');
    }
  });

  it('returns empty for nonexistent filter', () => {
    const result = getCraLicenseObligations(db, { license_type: 'zzz_nonexistent' });
    expect(result.obligations).toHaveLength(0);
    expect(result.message).toBeDefined();
  });

  it('obligation fields have expected structure', () => {
    const result = getCraLicenseObligations(db, {});
    if (result.obligations.length > 0) {
      const ob = result.obligations[0];
      expect(ob).toHaveProperty('cra_article');
      expect(ob).toHaveProperty('license_type');
      expect(ob).toHaveProperty('obligation');
      expect(ob).toHaveProperty('description');
      expect(ob).toHaveProperty('compliance_action');
    }
  });
});

// ---------------------------------------------------------------------------
// check_sbom_license_completeness
// ---------------------------------------------------------------------------

describe('check_sbom_license_completeness', () => {
  it('validates valid SPDX expressions', () => {
    const result = checkSbomLicenseCompleteness(db, {
      components: [
        { name: 'lodash', spdx_expression: 'MIT' },
        { name: 'express', spdx_expression: 'MIT' },
      ],
    });
    expect(result.compliant).toBe(true);
    expect(result.components_checked).toBe(2);
    expect(result.components_with_issues).toBe(0);
    expect(result._meta).toBeDefined();
  });

  it('flags missing SPDX expressions', () => {
    const result = checkSbomLicenseCompleteness(db, {
      components: [
        { name: 'unknown-lib', spdx_expression: '' },
      ],
    });
    expect(result.compliant).toBe(false);
    expect(result.issues[0].issues.some((i: string) => i.includes('Missing'))).toBe(true);
  });

  it('flags NOASSERTION', () => {
    const result = checkSbomLicenseCompleteness(db, {
      components: [
        { name: 'mystery-lib', spdx_expression: 'NOASSERTION' },
      ],
    });
    expect(result.compliant).toBe(false);
    expect(result.issues[0].issues.some((i: string) => i.includes('NOASSERTION'))).toBe(true);
  });

  it('flags unknown SPDX identifiers', () => {
    const result = checkSbomLicenseCompleteness(db, {
      components: [
        { name: 'custom-lib', spdx_expression: 'TOTALLY-FAKE-LICENSE' },
      ],
    });
    expect(result.compliant).toBe(false);
    expect(result.issues[0].issues.some((i: string) => i.includes('Unknown SPDX identifier'))).toBe(true);
  });

  it('handles compound expressions (AND/OR)', () => {
    const result = checkSbomLicenseCompleteness(db, {
      components: [
        { name: 'dual-licensed', spdx_expression: 'MIT OR Apache-2.0' },
      ],
    });
    expect(result.compliant).toBe(true);
  });

  it('handles parenthesized expressions', () => {
    const result = checkSbomLicenseCompleteness(db, {
      components: [
        { name: 'complex-lib', spdx_expression: '(MIT AND BSD-3-Clause) OR Apache-2.0' },
      ],
    });
    expect(result.compliant).toBe(true);
  });

  it('skips LicenseRef- identifiers', () => {
    const result = checkSbomLicenseCompleteness(db, {
      components: [
        { name: 'custom-lib', spdx_expression: 'MIT AND LicenseRef-Custom' },
      ],
    });
    // Should not flag LicenseRef-Custom as unknown
    const customIssue = result.issues.find((i: any) =>
      i.issues.some((issue: string) => issue.includes('LicenseRef-Custom')),
    );
    expect(customIssue).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// map_license_to_cra_category
// ---------------------------------------------------------------------------

describe('map_license_to_cra_category', () => {
  it('maps permissive licenses', () => {
    const result = mapLicenseToCraCategory(db, { license_type: 'permissive' });
    expect(result.license_type).toBe('permissive');
    expect(result.conformity_assessment).toBeDefined();
    expect(result.sbom_requirements).toBeDefined();
    expect(result.update_obligations).toBeDefined();
    expect(result.key_considerations.length).toBeGreaterThan(0);
    expect(result._meta).toBeDefined();
  });

  it('maps strong_copyleft licenses', () => {
    const result = mapLicenseToCraCategory(db, { license_type: 'strong_copyleft' });
    expect(result.license_type).toBe('strong_copyleft');
    expect(result.key_considerations.some((k: string) => k.toLowerCase().includes('source'))).toBe(true);
  });

  it('maps network_copyleft licenses', () => {
    const result = mapLicenseToCraCategory(db, { license_type: 'network_copyleft' });
    expect(result.license_type).toBe('network_copyleft');
    expect(result.key_considerations.some((k: string) => k.toLowerCase().includes('agpl'))).toBe(true);
  });

  it('returns error for invalid license type', () => {
    const result = mapLicenseToCraCategory(db, { license_type: 'invalid_type' });
    expect(result.error).toContain('Unknown license type');
    expect(result._error_type).toBe('INVALID_INPUT');
  });

  it('covers all valid types', () => {
    const types = ['permissive', 'weak_copyleft', 'strong_copyleft', 'network_copyleft', 'proprietary'];
    for (const type of types) {
      const result = mapLicenseToCraCategory(db, { license_type: type });
      expect(result.license_type).toBe(type);
    }
  });
});

// ---------------------------------------------------------------------------
// get_open_source_steward_obligations
// ---------------------------------------------------------------------------

describe('get_open_source_steward_obligations', () => {
  it('returns Article 24 obligations', () => {
    const result = getOpenSourceStewardObligations(db);
    expect(result.cra_article).toBe('Article 24');
    expect(result.context).toBeDefined();
    expect(result._meta).toBeDefined();
  });

  // Note: the test only verifies structure. If there are no Article 24 entries
  // in the seed data, obligations will be empty and that is also valid.
  it('obligations have expected fields when present', () => {
    const result = getOpenSourceStewardObligations(db);
    if (result.obligations && result.obligations.length > 0) {
      const ob = result.obligations[0];
      expect(ob).toHaveProperty('cra_article');
      expect(ob).toHaveProperty('obligation');
      expect(ob).toHaveProperty('compliance_action');
    }
  });
});
