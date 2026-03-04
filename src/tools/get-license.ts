// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface GetLicenseArgs {
  spdx_id: string;
}

export function getLicense(db: Db, args: GetLicenseArgs) {
  const row = db.prepare(`
    SELECT spdx_id, name, osi_approved, fsf_free, deprecated, copyleft_type, details_url, see_also
    FROM licenses WHERE spdx_id = ?
  `).get(args.spdx_id) as Record<string, unknown> | undefined;

  if (!row) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: `License not found: ${args.spdx_id}` }) }],
      isError: true,
      _error_type: 'NO_MATCH',
      ...responseMeta(),
    };
  }

  const license = {
    spdx_id: row.spdx_id,
    name: row.name,
    osi_approved: row.osi_approved === 1,
    fsf_free: row.fsf_free === 1,
    deprecated: row.deprecated === 1,
    copyleft_type: row.copyleft_type,
    details_url: row.details_url,
    see_also: row.see_also ? JSON.parse(row.see_also as string) : [],
  };

  return {
    ...license,
    ...responseMeta(),
  };
}
