// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface GetObligationChecklistArgs {
  license_id: string;
}

interface ObligationRow {
  obligation_type: string;
  required: number;
  description: string;
  compliance_action: string;
}

interface Obligation {
  obligation_type: string;
  required: boolean;
  description: string;
  compliance_action: string;
}

export function getObligationChecklist(db: Db, args: GetObligationChecklistArgs) {
  const rows = db.prepare(`
    SELECT obligation_type, required, description, compliance_action
    FROM obligations
    WHERE license_id = ?
    ORDER BY obligation_type, required DESC
  `).all(args.license_id) as ObligationRow[];

  if (rows.length === 0) {
    return {
      license_id: args.license_id,
      obligations: [],
      grouped: {},
      message: `No obligation data found for ${args.license_id}. The license may exist but obligations have not been curated yet.`,
      ...responseMeta(),
    };
  }

  const obligations: Obligation[] = rows.map((r) => ({
    obligation_type: r.obligation_type,
    required: r.required === 1,
    description: r.description,
    compliance_action: r.compliance_action,
  }));

  // Group by obligation_type
  const grouped: Record<string, Obligation[]> = {};
  for (const ob of obligations) {
    if (!grouped[ob.obligation_type]) {
      grouped[ob.obligation_type] = [];
    }
    grouped[ob.obligation_type].push(ob);
  }

  return {
    license_id: args.license_id,
    obligations,
    grouped,
    ...responseMeta(),
  };
}
