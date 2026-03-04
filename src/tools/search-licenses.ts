// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { sanitizeFtsQuery } from '../utils/fts-query.js';
import { responseMeta } from '../utils/response-meta.js';

export interface SearchLicensesArgs {
  query: string;
  copyleft_type?: string;
  osi_approved?: boolean;
}

const MAX_RESULTS = 20;

export function searchLicenses(db: Db, args: SearchLicensesArgs) {
  const ftsQuery = sanitizeFtsQuery(args.query);

  if (!ftsQuery) {
    return {
      results: [],
      total: 0,
      ...responseMeta(),
    };
  }

  // FTS5 match then join back to licenses for filtering and full data
  let sql = `
    SELECT l.spdx_id, l.name, l.osi_approved, l.fsf_free, l.deprecated, l.copyleft_type
    FROM licenses_fts f
    JOIN licenses l ON l.rowid = f.rowid
    WHERE licenses_fts MATCH ?
  `;
  const params: unknown[] = [ftsQuery];

  if (args.copyleft_type) {
    sql += ' AND l.copyleft_type = ?';
    params.push(args.copyleft_type);
  }

  if (args.osi_approved !== undefined) {
    sql += ' AND l.osi_approved = ?';
    params.push(args.osi_approved ? 1 : 0);
  }

  sql += ` LIMIT ?`;
  params.push(MAX_RESULTS);

  const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>;

  const results = rows.map((row) => ({
    spdx_id: row.spdx_id,
    name: row.name,
    osi_approved: row.osi_approved === 1,
    fsf_free: row.fsf_free === 1,
    deprecated: row.deprecated === 1,
    copyleft_type: row.copyleft_type,
  }));

  return {
    results,
    total: results.length,
    ...responseMeta(),
  };
}
