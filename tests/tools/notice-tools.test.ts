// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeAll } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { getNoticeTemplate } from '../../src/tools/get-notice-template.js';
import { generateNoticeRequirements } from '../../src/tools/generate-notice-requirements.js';
import { checkAttributionCompliance } from '../../src/tools/check-attribution-compliance.js';

let db: any;

beforeAll(() => {
  db = new BetterSqlite3(join(__dirname, '../../data/database.db'));
});

// ---------------------------------------------------------------------------
// get_notice_template
// ---------------------------------------------------------------------------

describe('get_notice_template', () => {
  it('returns MIT notice template', () => {
    const result = getNoticeTemplate(db, { license_id: 'MIT' });
    expect(result.license_id).toBe('MIT');
    expect(result.required_text).toBeDefined();
    expect(result.attribution_format).toBeDefined();
    expect(result._meta).toBeDefined();
  });

  it('returns Apache-2.0 notice template', () => {
    const result = getNoticeTemplate(db, { license_id: 'Apache-2.0' });
    expect(result.license_id).toBe('Apache-2.0');
    expect(result.required_text).toContain('Apache License');
    expect(result.modification_marking).toBeDefined();
  });

  it('returns error for unknown license', () => {
    const result = getNoticeTemplate(db, { license_id: 'FAKE-LICENSE-1.0' });
    expect(result.error).toContain('FAKE-LICENSE-1.0');
    expect(result._error_type).toBe('NO_MATCH');
  });
});

// ---------------------------------------------------------------------------
// generate_notice_requirements
// ---------------------------------------------------------------------------

describe('generate_notice_requirements', () => {
  it('generates requirements for MIT and Apache-2.0', () => {
    const result = generateNoticeRequirements(db, { license_ids: ['MIT', 'Apache-2.0'] });
    expect(result.templates.length).toBe(2);
    expect(result.summary.requested).toBe(2);
    expect(result.summary.found).toBe(2);
    expect(result.summary.missing).toBe(0);
    expect(result._meta).toBeDefined();
  });

  it('reports missing templates', () => {
    const result = generateNoticeRequirements(db, { license_ids: ['MIT', 'FAKE-LICENSE'] });
    expect(result.summary.found).toBe(1);
    expect(result.summary.missing).toBe(1);
    expect(result.missing_templates).toContain('FAKE-LICENSE');
  });

  it('returns error for empty array', () => {
    const result = generateNoticeRequirements(db, { license_ids: [] });
    expect(result.error).toBeDefined();
    expect(result._error_type).toBe('INVALID_INPUT');
  });

  it('deduplicates requirements', () => {
    const result = generateNoticeRequirements(db, { license_ids: ['MIT', 'Apache-2.0'] });
    expect(result.deduplicated_requirements).toBeDefined();
    expect(result.deduplicated_requirements.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// check_attribution_compliance
// ---------------------------------------------------------------------------

describe('check_attribution_compliance', () => {
  it('identifies compliant attribution for MIT', () => {
    const attribution = 'Copyright (c) 2026 Test Corp\nMIT License\nPermission is hereby granted...';
    const result = checkAttributionCompliance(db, { license_id: 'MIT', current_attribution: attribution });
    expect(result.license_id).toBe('MIT');
    expect(result.compliant).toBeDefined();
    expect(result._meta).toBeDefined();
  });

  it('flags missing copyright notice', () => {
    const attribution = 'MIT License\nSome text here only';
    const result = checkAttributionCompliance(db, { license_id: 'MIT', current_attribution: attribution });
    expect(result.issues.some((i: string) => i.toLowerCase().includes('copyright'))).toBe(true);
  });

  it('flags missing license identifier', () => {
    const attribution = 'Copyright (c) 2026 Test Corp\nSome license text';
    const result = checkAttributionCompliance(db, { license_id: 'Apache-2.0', current_attribution: attribution });
    expect(result.issues.some((i: string) => i.includes('Apache-2.0'))).toBe(true);
  });

  it('returns error for unknown license', () => {
    const result = checkAttributionCompliance(db, { license_id: 'FAKE-1.0', current_attribution: 'some text' });
    expect(result.error).toBeDefined();
    expect(result._error_type).toBe('NO_MATCH');
  });
});
