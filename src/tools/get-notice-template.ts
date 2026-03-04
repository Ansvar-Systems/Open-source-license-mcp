// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface GetNoticeTemplateArgs {
  license_id: string;
}

interface NoticeRow {
  license_id: string;
  required_text: string;
  attribution_format: string;
  modification_marking: string | null;
  example: string | null;
}

export function getNoticeTemplate(db: Db, args: GetNoticeTemplateArgs) {
  const row = db.prepare(`
    SELECT license_id, required_text, attribution_format, modification_marking, example
    FROM notice_templates
    WHERE license_id = ?
  `).get(args.license_id) as NoticeRow | undefined;

  if (!row) {
    return {
      error: `No notice template found for license: ${args.license_id}`,
      _error_type: 'NO_MATCH',
      ...responseMeta(),
    };
  }

  return {
    license_id: row.license_id,
    required_text: row.required_text,
    attribution_format: row.attribution_format,
    modification_marking: row.modification_marking,
    example: row.example,
    ...responseMeta(),
  };
}
