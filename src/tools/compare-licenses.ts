// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface CompareLicensesArgs {
  license_a: string;
  license_b: string;
}

interface LicenseRow {
  spdx_id: string;
  name: string;
  osi_approved: number;
  fsf_free: number;
  deprecated: number;
  copyleft_type: string;
}

interface ObligationRow {
  obligation_type: string;
  required: number;
  description: string;
  compliance_action: string;
}

function fetchLicense(db: Db, spdxId: string): LicenseRow | undefined {
  return db.prepare(`
    SELECT spdx_id, name, osi_approved, fsf_free, deprecated, copyleft_type
    FROM licenses WHERE spdx_id = ?
  `).get(spdxId) as LicenseRow | undefined;
}

function fetchObligations(db: Db, licenseId: string): ObligationRow[] {
  return db.prepare(`
    SELECT obligation_type, required, description, compliance_action
    FROM obligations WHERE license_id = ?
    ORDER BY obligation_type
  `).all(licenseId) as ObligationRow[];
}

function formatLicense(row: LicenseRow) {
  return {
    spdx_id: row.spdx_id,
    name: row.name,
    osi_approved: row.osi_approved === 1,
    fsf_free: row.fsf_free === 1,
    deprecated: row.deprecated === 1,
    copyleft_type: row.copyleft_type,
  };
}

function formatObligations(rows: ObligationRow[]) {
  return rows.map((r) => ({
    obligation_type: r.obligation_type,
    required: r.required === 1,
    description: r.description,
    compliance_action: r.compliance_action,
  }));
}

export function compareLicenses(db: Db, args: CompareLicensesArgs) {
  const rowA = fetchLicense(db, args.license_a);
  const rowB = fetchLicense(db, args.license_b);

  if (!rowA && !rowB) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: `Neither license found: ${args.license_a}, ${args.license_b}` }) }],
      isError: true,
      _error_type: 'NO_MATCH',
      ...responseMeta(),
    };
  }

  if (!rowA) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: `License not found: ${args.license_a}` }) }],
      isError: true,
      _error_type: 'NO_MATCH',
      ...responseMeta(),
    };
  }

  if (!rowB) {
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ error: `License not found: ${args.license_b}` }) }],
      isError: true,
      _error_type: 'NO_MATCH',
      ...responseMeta(),
    };
  }

  const licenseA = formatLicense(rowA);
  const licenseB = formatLicense(rowB);

  const obligationsA = formatObligations(fetchObligations(db, args.license_a));
  const obligationsB = formatObligations(fetchObligations(db, args.license_b));

  // Build differences summary
  const differences: string[] = [];

  if (licenseA.copyleft_type !== licenseB.copyleft_type) {
    differences.push(`Copyleft: ${licenseA.spdx_id} is ${licenseA.copyleft_type}, ${licenseB.spdx_id} is ${licenseB.copyleft_type}`);
  }
  if (licenseA.osi_approved !== licenseB.osi_approved) {
    differences.push(`OSI approved: ${licenseA.spdx_id}=${licenseA.osi_approved}, ${licenseB.spdx_id}=${licenseB.osi_approved}`);
  }
  if (licenseA.fsf_free !== licenseB.fsf_free) {
    differences.push(`FSF free: ${licenseA.spdx_id}=${licenseA.fsf_free}, ${licenseB.spdx_id}=${licenseB.fsf_free}`);
  }

  // Obligation type comparison
  const typesA = new Set(obligationsA.map((o) => o.obligation_type));
  const typesB = new Set(obligationsB.map((o) => o.obligation_type));
  const onlyInA = [...typesA].filter((t) => !typesB.has(t));
  const onlyInB = [...typesB].filter((t) => !typesA.has(t));

  if (onlyInA.length > 0) {
    differences.push(`Obligation types only in ${licenseA.spdx_id}: ${onlyInA.join(', ')}`);
  }
  if (onlyInB.length > 0) {
    differences.push(`Obligation types only in ${licenseB.spdx_id}: ${onlyInB.join(', ')}`);
  }

  return {
    license_a: licenseA,
    license_b: licenseB,
    obligations_a: obligationsA,
    obligations_b: obligationsB,
    differences,
    ...responseMeta(),
  };
}
