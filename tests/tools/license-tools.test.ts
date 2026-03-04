// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeAll } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { getLicense } from '../../src/tools/get-license.js';
import { searchLicenses } from '../../src/tools/search-licenses.js';
import { checkCompatibility } from '../../src/tools/check-compatibility.js';
import { getObligationChecklist } from '../../src/tools/get-obligation-checklist.js';
import { compareLicenses } from '../../src/tools/compare-licenses.js';

let db: any;

beforeAll(() => {
  // Build database from seed data -- hardcoded command, no user input
  execSync('npm run build:db', { cwd: join(__dirname, '../..'), stdio: 'pipe' });
  db = new BetterSqlite3(join(__dirname, '../../data/database.db'));
});

// ---------------------------------------------------------------------------
// get_license
// ---------------------------------------------------------------------------

describe('get_license', () => {
  it('returns MIT license details', () => {
    const result = getLicense(db, { spdx_id: 'MIT' });
    expect(result.spdx_id).toBe('MIT');
    expect(result.name).toContain('MIT');
    expect(result.osi_approved).toBe(true);
    expect(result.copyleft_type).toBe('permissive');
    expect(result._meta).toBeDefined();
  });

  it('returns Apache-2.0 license details', () => {
    const result = getLicense(db, { spdx_id: 'Apache-2.0' });
    expect(result.spdx_id).toBe('Apache-2.0');
    expect(result.osi_approved).toBe(true);
    expect(result.copyleft_type).toBe('permissive');
  });

  it('returns GPL-3.0-only with strong copyleft', () => {
    const result = getLicense(db, { spdx_id: 'GPL-3.0-only' });
    expect(result.spdx_id).toBe('GPL-3.0-only');
    expect(result.copyleft_type).toBe('strong');
  });

  it('returns error for unknown license', () => {
    const result = getLicense(db, { spdx_id: 'FAKE-LICENSE-1.0' });
    expect(result.error).toContain('FAKE-LICENSE-1.0');
    expect(result._error_type).toBe('NO_MATCH');
    expect(result._meta).toBeDefined();
  });

  it('parses see_also as array', () => {
    const result = getLicense(db, { spdx_id: 'MIT' });
    expect(Array.isArray(result.see_also)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// search_licenses
// ---------------------------------------------------------------------------

describe('search_licenses', () => {
  it('finds licenses matching "apache"', () => {
    const result = searchLicenses(db, { query: 'apache' });
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.some((r: any) => r.spdx_id === 'Apache-2.0')).toBe(true);
    expect(result._meta).toBeDefined();
  });

  it('finds licenses matching "MIT"', () => {
    const result = searchLicenses(db, { query: 'MIT' });
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.some((r: any) => r.spdx_id === 'MIT')).toBe(true);
  });

  it('filters by copyleft_type', () => {
    const result = searchLicenses(db, { query: 'GPL', copyleft_type: 'strong' });
    expect(result.results.length).toBeGreaterThan(0);
    for (const r of result.results) {
      expect(r.copyleft_type).toBe('strong');
    }
  });

  it('filters by osi_approved', () => {
    const result = searchLicenses(db, { query: 'license', osi_approved: true });
    for (const r of result.results) {
      expect(r.osi_approved).toBe(true);
    }
  });

  it('returns empty for garbage query', () => {
    const result = searchLicenses(db, { query: 'zzzzxyznonexistent' });
    expect(result.results).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns empty for empty query', () => {
    const result = searchLicenses(db, { query: '' });
    expect(result.results).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// check_compatibility
// ---------------------------------------------------------------------------

describe('check_compatibility', () => {
  it('MIT + Apache-2.0 = compatible', () => {
    const result = checkCompatibility(db, {
      license_a: 'MIT',
      license_b: 'Apache-2.0',
    });
    expect(result.compatible).toBe(true);
    expect(result.confidence).toBe('established');
    expect(result._meta).toBeDefined();
  });

  it('Apache-2.0 + GPL-2.0-only = incompatible', () => {
    const result = checkCompatibility(db, {
      license_a: 'Apache-2.0',
      license_b: 'GPL-2.0-only',
    });
    expect(result.compatible).toBe(false);
  });

  it('LGPL-2.1 + proprietary dynamic = compatible', () => {
    const result = checkCompatibility(db, {
      license_a: 'LGPL-2.1-only',
      license_b: 'proprietary',
      linking_type: 'dynamic',
    });
    expect(result.compatible).toBe(true);
    expect(result.conditions).toContain('re-link');
  });

  it('LGPL-2.1 + proprietary static = compatible with conditions', () => {
    const result = checkCompatibility(db, {
      license_a: 'LGPL-2.1-only',
      license_b: 'proprietary',
      linking_type: 'static',
    });
    expect(result.compatible).toBe(true);
    expect(result.conditions).toContain('object file');
  });

  it('GPL-2.0-only + GPL-3.0-only = incompatible', () => {
    const result = checkCompatibility(db, {
      license_a: 'GPL-2.0-only',
      license_b: 'GPL-3.0-only',
    });
    expect(result.compatible).toBe(false);
  });

  it('finds reverse match (B,A instead of A,B)', () => {
    // MIT + Apache-2.0 is stored as (MIT, Apache-2.0). Query (Apache-2.0, MIT) should still find it.
    const result = checkCompatibility(db, {
      license_a: 'Apache-2.0',
      license_b: 'MIT',
    });
    expect(result.compatible).toBe(true);
    expect(result.direction).toBe('bidirectional');
  });

  it('falls back to linking_type=any when specific type not found', () => {
    // MIT + proprietary stored with linking_type=any. Querying with dynamic should fall back.
    const result = checkCompatibility(db, {
      license_a: 'MIT',
      license_b: 'proprietary',
      linking_type: 'dynamic',
    });
    expect(result.compatible).toBe(true);
    expect(result.linking_type).toBe('any');
  });

  it('returns no_data for unknown pairing', () => {
    const result = checkCompatibility(db, {
      license_a: 'Artistic-2.0',
      license_b: 'CDDL-1.0',
    });
    expect(result.no_data).toBe(true);
    expect(result._meta).toBeDefined();
  });

  it('defaults linking_type to any', () => {
    const result = checkCompatibility(db, {
      license_a: 'MIT',
      license_b: 'Apache-2.0',
    });
    expect(result.linking_type).toBe('any');
  });
});

// ---------------------------------------------------------------------------
// get_obligation_checklist
// ---------------------------------------------------------------------------

describe('get_obligation_checklist', () => {
  it('returns obligations for Apache-2.0', () => {
    const result = getObligationChecklist(db, { license_id: 'Apache-2.0' });
    expect(result.license_id).toBe('Apache-2.0');
    expect(result.obligations.length).toBeGreaterThan(3);
    expect(result._meta).toBeDefined();
  });

  it('returns obligations for MIT', () => {
    const result = getObligationChecklist(db, { license_id: 'MIT' });
    expect(result.license_id).toBe('MIT');
    expect(result.obligations.length).toBeGreaterThan(0);
  });

  it('groups obligations by type', () => {
    const result = getObligationChecklist(db, { license_id: 'Apache-2.0' });
    expect(result.grouped).toBeDefined();
    expect(Object.keys(result.grouped).length).toBeGreaterThan(0);
    for (const [, items] of Object.entries(result.grouped)) {
      expect(Array.isArray(items)).toBe(true);
    }
  });

  it('returns empty for unknown license', () => {
    const result = getObligationChecklist(db, { license_id: 'FAKE-LICENSE-1.0' });
    expect(result.obligations).toHaveLength(0);
    expect(result.message).toBeDefined();
  });

  it('obligation fields have correct types', () => {
    const result = getObligationChecklist(db, { license_id: 'MIT' });
    for (const ob of result.obligations) {
      expect(typeof ob.required).toBe('boolean');
      expect(typeof ob.description).toBe('string');
      expect(typeof ob.compliance_action).toBe('string');
      expect(typeof ob.obligation_type).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// compare_licenses
// ---------------------------------------------------------------------------

describe('compare_licenses', () => {
  it('compares MIT vs Apache-2.0', () => {
    const result = compareLicenses(db, { license_a: 'MIT', license_b: 'Apache-2.0' });
    expect(result.license_a.spdx_id).toBe('MIT');
    expect(result.license_b.spdx_id).toBe('Apache-2.0');
    expect(result._meta).toBeDefined();
  });

  it('compares MIT vs GPL-3.0-only and shows copyleft difference', () => {
    const result = compareLicenses(db, { license_a: 'MIT', license_b: 'GPL-3.0-only' });
    expect(result.differences.length).toBeGreaterThan(0);
    expect(result.differences.some((d: string) => d.includes('Copyleft'))).toBe(true);
  });

  it('returns obligations for both licenses', () => {
    const result = compareLicenses(db, { license_a: 'MIT', license_b: 'Apache-2.0' });
    expect(Array.isArray(result.obligations_a)).toBe(true);
    expect(Array.isArray(result.obligations_b)).toBe(true);
  });

  it('returns error when license_a not found', () => {
    const result = compareLicenses(db, { license_a: 'FAKE-1.0', license_b: 'MIT' });
    expect(result.error).toContain('FAKE-1.0');
    expect(result._error_type).toBe('NO_MATCH');
  });

  it('returns error when license_b not found', () => {
    const result = compareLicenses(db, { license_a: 'MIT', license_b: 'FAKE-1.0' });
    expect(result.error).toContain('FAKE-1.0');
    expect(result._error_type).toBe('NO_MATCH');
  });

  it('returns error when neither found', () => {
    const result = compareLicenses(db, { license_a: 'FAKE-A', license_b: 'FAKE-B' });
    expect(result.error).toBeDefined();
    expect(result._error_type).toBe('NO_MATCH');
  });
});
