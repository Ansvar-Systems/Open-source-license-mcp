// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { sanitizeFtsQuery } from '../utils/fts-query.js';
import { responseMeta } from '../utils/response-meta.js';

export interface SearchReuseRulesArgs {
  query: string;
}

const MAX_RESULTS = 20;

interface ReuseSpecRow {
  id: number;
  rule_type: string;
  file_pattern: string | null;
  language: string | null;
  description: string;
  example: string | null;
}

export function searchReuseRules(db: Db, args: SearchReuseRulesArgs) {
  const ftsQuery = sanitizeFtsQuery(args.query);

  if (!ftsQuery) {
    return {
      results: [],
      total: 0,
      ...responseMeta(),
    };
  }

  const rows = db.prepare(`
    SELECT r.id, r.rule_type, r.file_pattern, r.language, r.description, r.example
    FROM reuse_spec_fts f
    JOIN reuse_spec r ON r.rowid = f.rowid
    WHERE reuse_spec_fts MATCH ?
    LIMIT ?
  `).all(ftsQuery, MAX_RESULTS) as ReuseSpecRow[];

  const results = rows.map((row) => ({
    id: row.id,
    rule_type: row.rule_type,
    file_pattern: row.file_pattern,
    language: row.language,
    description: row.description,
    example: row.example,
  }));

  return {
    results,
    total: results.length,
    ...responseMeta(),
  };
}
