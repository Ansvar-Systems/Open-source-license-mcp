// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface CheckReuseRulesArgs {
  file_type: string;
  license_id: string;
}

interface ReuseSpecRow {
  id: number;
  rule_type: string;
  file_pattern: string | null;
  language: string | null;
  description: string;
  example: string | null;
}

export function checkReuseRules(db: Db, args: CheckReuseRulesArgs) {
  const ext = args.file_type.startsWith('.') ? args.file_type : `.${args.file_type}`;

  // Find header format rules for this file type
  const headerRules = db.prepare(`
    SELECT id, rule_type, file_pattern, language, description, example
    FROM reuse_spec
    WHERE rule_type = 'header_format' AND file_pattern = ?
    ORDER BY id
  `).all(`*${ext}`) as ReuseSpecRow[];

  // Find dep5 rules
  const dep5Rules = db.prepare(`
    SELECT id, rule_type, file_pattern, language, description, example
    FROM reuse_spec
    WHERE rule_type = 'dep5'
    ORDER BY id
  `).all() as ReuseSpecRow[];

  // Find special handling rules (binary, generated, companion_files)
  const specialRules = db.prepare(`
    SELECT id, rule_type, file_pattern, language, description, example
    FROM reuse_spec
    WHERE rule_type IN ('binary', 'generated', 'companion_files')
      AND (file_pattern IS NULL OR file_pattern = ?)
    ORDER BY rule_type, id
  `).all(`*${ext}`) as ReuseSpecRow[];

  const formatRow = (row: ReuseSpecRow) => ({
    id: row.id,
    rule_type: row.rule_type,
    file_pattern: row.file_pattern,
    language: row.language,
    description: row.description,
    example: row.example,
  });

  // Build the recommended header (substitute license_id into example if available)
  let recommended_header: string | null = null;
  if (headerRules.length > 0 && headerRules[0].example) {
    recommended_header = headerRules[0].example.replace(
      /SPDX-License-Identifier:\s*\S+/,
      `SPDX-License-Identifier: ${args.license_id}`,
    );
  }

  // Build dep5 entry template
  let dep5_template: string | null = null;
  if (dep5Rules.length > 0 && dep5Rules[0].example) {
    dep5_template = dep5Rules[0].example.replace(
      /SPDX-License-Identifier:\s*\S+/,
      `SPDX-License-Identifier: ${args.license_id}`,
    );
  }

  return {
    file_type: ext,
    license_id: args.license_id,
    header_format: headerRules.map(formatRow),
    recommended_header,
    dep5_entry_template: dep5_template,
    dep5_rules: dep5Rules.map(formatRow),
    special_handling: specialRules.map(formatRow),
    ...responseMeta(),
  };
}
