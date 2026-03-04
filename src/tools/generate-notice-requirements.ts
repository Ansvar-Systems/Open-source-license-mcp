// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface GenerateNoticeRequirementsArgs {
  license_ids: string[];
}

interface NoticeRow {
  license_id: string;
  required_text: string;
  attribution_format: string;
  modification_marking: string | null;
  example: string | null;
}

export function generateNoticeRequirements(db: Db, args: GenerateNoticeRequirementsArgs) {
  if (!args.license_ids || args.license_ids.length === 0) {
    return {
      error: 'license_ids must be a non-empty array of SPDX identifiers',
      _error_type: 'INVALID_INPUT',
      ...responseMeta(),
    };
  }

  const stmt = db.prepare(`
    SELECT license_id, required_text, attribution_format, modification_marking, example
    FROM notice_templates
    WHERE license_id = ?
  `);

  const found: NoticeRow[] = [];
  const missing: string[] = [];

  for (const id of args.license_ids) {
    const row = stmt.get(id) as NoticeRow | undefined;
    if (row) {
      found.push(row);
    } else {
      missing.push(id);
    }
  }

  // Deduplicate by attribution_format (some licenses share the same requirements)
  const seenFormats = new Set<string>();
  const deduplicatedRequirements: Array<{
    license_ids: string[];
    attribution_format: string;
    modification_marking: string | null;
  }> = [];

  for (const row of found) {
    if (seenFormats.has(row.attribution_format)) {
      // Add this license_id to the existing group
      const group = deduplicatedRequirements.find((g) => g.attribution_format === row.attribution_format);
      if (group) group.license_ids.push(row.license_id);
    } else {
      seenFormats.add(row.attribution_format);
      deduplicatedRequirements.push({
        license_ids: [row.license_id],
        attribution_format: row.attribution_format,
        modification_marking: row.modification_marking,
      });
    }
  }

  const templates = found.map((row) => ({
    license_id: row.license_id,
    required_text: row.required_text,
    attribution_format: row.attribution_format,
    modification_marking: row.modification_marking,
    example: row.example,
  }));

  return {
    templates,
    deduplicated_requirements: deduplicatedRequirements,
    missing_templates: missing,
    summary: {
      requested: args.license_ids.length,
      found: found.length,
      missing: missing.length,
      unique_requirement_groups: deduplicatedRequirements.length,
    },
    ...responseMeta(),
  };
}
