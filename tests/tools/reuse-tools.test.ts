// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeAll } from 'vitest';
import BetterSqlite3 from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

import { getReuseSpec } from '../../src/tools/get-reuse-spec.js';
import { checkReuseRules } from '../../src/tools/check-reuse-rules.js';
import { searchReuseRules } from '../../src/tools/search-reuse-rules.js';

let db: any;

beforeAll(() => {
  db = new BetterSqlite3(join(__dirname, '../../data/database.db'));
});

// ---------------------------------------------------------------------------
// get_reuse_spec
// ---------------------------------------------------------------------------

describe('get_reuse_spec', () => {
  it('returns header_format rules', () => {
    const result = getReuseSpec(db, { topic: 'header_format' });
    expect(result.topic).toBe('header_format');
    expect(result.rules.length).toBeGreaterThan(0);
    expect(result.rules[0].rule_type).toBe('header_format');
    expect(result._meta).toBeDefined();
  });

  it('returns dep5 rules', () => {
    const result = getReuseSpec(db, { topic: 'dep5' });
    expect(result.topic).toBe('dep5');
    expect(result.rules).toBeDefined();
  });

  it('returns error for invalid topic', () => {
    const result = getReuseSpec(db, { topic: 'nonexistent_topic' });
    expect(result.error).toContain('Unknown topic');
    expect(result._error_type).toBe('INVALID_INPUT');
  });

  it('returns total count', () => {
    const result = getReuseSpec(db, { topic: 'header_format' });
    expect(result.total).toBe(result.rules.length);
  });

  it('rules have expected fields', () => {
    const result = getReuseSpec(db, { topic: 'header_format' });
    if (result.rules.length > 0) {
      const rule = result.rules[0];
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('rule_type');
      expect(rule).toHaveProperty('description');
    }
  });
});

// ---------------------------------------------------------------------------
// check_reuse_rules
// ---------------------------------------------------------------------------

describe('check_reuse_rules', () => {
  it('returns header format for .py files', () => {
    const result = checkReuseRules(db, { file_type: '.py', license_id: 'MIT' });
    expect(result.file_type).toBe('.py');
    expect(result.license_id).toBe('MIT');
    expect(result.header_format.length).toBeGreaterThan(0);
    expect(result._meta).toBeDefined();
  });

  it('returns header format for .ts files', () => {
    const result = checkReuseRules(db, { file_type: '.ts', license_id: 'Apache-2.0' });
    expect(result.file_type).toBe('.ts');
    expect(result.header_format.length).toBeGreaterThan(0);
  });

  it('handles file_type without leading dot', () => {
    const result = checkReuseRules(db, { file_type: 'py', license_id: 'MIT' });
    expect(result.file_type).toBe('.py');
  });

  it('substitutes license_id into recommended header', () => {
    const result = checkReuseRules(db, { file_type: '.py', license_id: 'GPL-3.0-only' });
    if (result.recommended_header) {
      expect(result.recommended_header).toContain('GPL-3.0-only');
    }
  });

  it('returns dep5 rules', () => {
    const result = checkReuseRules(db, { file_type: '.py', license_id: 'MIT' });
    expect(result.dep5_rules).toBeDefined();
    expect(Array.isArray(result.dep5_rules)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// search_reuse_rules
// ---------------------------------------------------------------------------

describe('search_reuse_rules', () => {
  it('finds rules matching "Python"', () => {
    const result = searchReuseRules(db, { query: 'Python' });
    expect(result.results.length).toBeGreaterThan(0);
    expect(result._meta).toBeDefined();
  });

  it('finds rules matching "binary"', () => {
    const result = searchReuseRules(db, { query: 'binary' });
    expect(result.results.length).toBeGreaterThan(0);
  });

  it('returns empty for garbage query', () => {
    const result = searchReuseRules(db, { query: 'zzzzxyznonexistent' });
    expect(result.results).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('returns empty for empty query', () => {
    const result = searchReuseRules(db, { query: '' });
    expect(result.results).toHaveLength(0);
  });

  it('result items have expected fields', () => {
    const result = searchReuseRules(db, { query: 'header' });
    if (result.results.length > 0) {
      const rule = result.results[0];
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('rule_type');
      expect(rule).toHaveProperty('description');
    }
  });
});
