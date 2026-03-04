// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface GetCraLicenseObligationsArgs {
  license_type?: string;
  cra_article?: string;
}

interface CraRow {
  id: number;
  cra_article: string;
  license_type: string;
  obligation: string;
  description: string;
  compliance_action: string;
}

export function getCraLicenseObligations(db: Db, args: GetCraLicenseObligationsArgs) {
  let sql = `
    SELECT id, cra_article, license_type, obligation, description, compliance_action
    FROM cra_license_obligations
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (args.license_type) {
    sql += ' AND license_type = ?';
    params.push(args.license_type);
  }

  if (args.cra_article) {
    sql += ' AND cra_article = ?';
    params.push(args.cra_article);
  }

  sql += ' ORDER BY cra_article, license_type';

  const rows = db.prepare(sql).all(...params) as CraRow[];

  if (rows.length === 0) {
    const filters = [];
    if (args.license_type) filters.push(`license_type=${args.license_type}`);
    if (args.cra_article) filters.push(`cra_article=${args.cra_article}`);
    return {
      obligations: [],
      total: 0,
      message: `No CRA license obligations found${filters.length ? ` for ${filters.join(', ')}` : ''}.`,
      ...responseMeta(),
    };
  }

  const obligations = rows.map((row) => ({
    id: row.id,
    cra_article: row.cra_article,
    license_type: row.license_type,
    obligation: row.obligation,
    description: row.description,
    compliance_action: row.compliance_action,
  }));

  return {
    obligations,
    total: obligations.length,
    ...responseMeta(),
  };
}
