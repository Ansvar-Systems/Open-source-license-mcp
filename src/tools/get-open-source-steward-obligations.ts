// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

interface CraRow {
  id: number;
  cra_article: string;
  license_type: string;
  obligation: string;
  description: string;
  compliance_action: string;
}

export function getOpenSourceStewardObligations(db: Db) {
  const rows = db.prepare(`
    SELECT id, cra_article, license_type, obligation, description, compliance_action
    FROM cra_license_obligations
    WHERE cra_article = 'Article 24'
    ORDER BY license_type, id
  `).all() as CraRow[];

  if (rows.length === 0) {
    return {
      obligations: [],
      total: 0,
      message: 'No Article 24 (open-source steward) obligations found in the database.',
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
    cra_article: 'Article 24',
    context: 'CRA Article 24 defines obligations for open-source software stewards -- legal persons (other than manufacturers) that systematically provide support for open-source products with digital elements intended for commercial activities.',
    obligations,
    total: obligations.length,
    ...responseMeta(),
  };
}
