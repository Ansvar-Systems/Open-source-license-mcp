// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface GetReuseSpecArgs {
  topic: string;
}

const VALID_TOPICS = [
  'header_format',
  'dep5',
  'compliance',
  'binary',
  'generated',
  'license_placement',
  'copyright_format',
  'companion_files',
];

interface ReuseSpecRow {
  id: number;
  rule_type: string;
  file_pattern: string | null;
  language: string | null;
  description: string;
  example: string | null;
}

export function getReuseSpec(db: Db, args: GetReuseSpecArgs) {
  if (!VALID_TOPICS.includes(args.topic)) {
    return {
      error: `Unknown topic: ${args.topic}. Valid topics: ${VALID_TOPICS.join(', ')}`,
      _error_type: 'INVALID_INPUT',
      ...responseMeta(),
    };
  }

  const rows = db.prepare(`
    SELECT id, rule_type, file_pattern, language, description, example
    FROM reuse_spec
    WHERE rule_type = ?
    ORDER BY id
  `).all(args.topic) as ReuseSpecRow[];

  if (rows.length === 0) {
    return {
      topic: args.topic,
      rules: [],
      message: `No REUSE specification rules found for topic: ${args.topic}`,
      ...responseMeta(),
    };
  }

  const rules = rows.map((row) => ({
    id: row.id,
    rule_type: row.rule_type,
    file_pattern: row.file_pattern,
    language: row.language,
    description: row.description,
    example: row.example,
  }));

  return {
    topic: args.topic,
    rules,
    total: rules.length,
    ...responseMeta(),
  };
}
