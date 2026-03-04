// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface SbomComponent {
  name: string;
  spdx_expression: string;
}

export interface CheckSbomLicenseCompletenessArgs {
  components: SbomComponent[];
}

interface LicenseRow {
  spdx_id: string;
  deprecated: number;
}

interface ComponentIssue {
  name: string;
  spdx_expression: string;
  issues: string[];
}

/**
 * Extract individual SPDX identifiers from a compound expression.
 * Handles operators: AND, OR, WITH, and parentheses.
 */
function extractSpdxIds(expression: string): string[] {
  return expression
    .replace(/[()]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !['AND', 'OR', 'WITH'].includes(token.toUpperCase()))
    .map((token) => token.trim())
    .filter(Boolean);
}

export function checkSbomLicenseCompleteness(db: Db, args: CheckSbomLicenseCompletenessArgs) {
  if (!args.components || !Array.isArray(args.components)) {
    return {
      error: 'components must be a non-empty array of { name, spdx_expression } objects',
      _error_type: 'INVALID_INPUT',
      ...responseMeta(),
    };
  }

  const licenseStmt = db.prepare(`
    SELECT spdx_id, deprecated FROM licenses WHERE spdx_id = ?
  `);

  const componentIssues: ComponentIssue[] = [];
  let totalIssues = 0;

  for (const component of args.components) {
    const issues: string[] = [];

    // Check for missing expression
    if (!component.spdx_expression || component.spdx_expression.trim() === '') {
      issues.push('Missing SPDX license expression.');
      componentIssues.push({ name: component.name, spdx_expression: component.spdx_expression || '', issues });
      totalIssues += issues.length;
      continue;
    }

    // Check for NOASSERTION
    if (component.spdx_expression.toUpperCase() === 'NOASSERTION') {
      issues.push('SPDX expression is NOASSERTION -- the license is unknown or not declared. This must be resolved for CRA compliance.');
      componentIssues.push({ name: component.name, spdx_expression: component.spdx_expression, issues });
      totalIssues += issues.length;
      continue;
    }

    // Extract individual SPDX IDs and validate each
    const ids = extractSpdxIds(component.spdx_expression);

    if (ids.length === 0) {
      issues.push('Could not parse any SPDX identifiers from the expression.');
    }

    for (const id of ids) {
      // Skip well-known exception identifiers (used with WITH operator)
      if (id.endsWith('-exception') || id.startsWith('LicenseRef-')) {
        continue;
      }

      const row = licenseStmt.get(id) as LicenseRow | undefined;

      if (!row) {
        issues.push(`Unknown SPDX identifier: ${id}. Not found in the SPDX License List.`);
      } else if (row.deprecated === 1) {
        issues.push(`Deprecated SPDX identifier: ${id}. Use the current replacement identifier instead.`);
      }
    }

    if (issues.length > 0) {
      componentIssues.push({ name: component.name, spdx_expression: component.spdx_expression, issues });
      totalIssues += issues.length;
    }
  }

  const compliant = componentIssues.length === 0;

  return {
    compliant,
    components_checked: args.components.length,
    components_with_issues: componentIssues.length,
    total_issues: totalIssues,
    issues: componentIssues,
    ...responseMeta(),
  };
}
