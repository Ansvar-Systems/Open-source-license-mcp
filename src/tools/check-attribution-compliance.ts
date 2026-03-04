// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface CheckAttributionComplianceArgs {
  license_id: string;
  current_attribution: string;
}

interface NoticeRow {
  required_text: string;
  attribution_format: string;
  modification_marking: string | null;
}

interface ObligationRow {
  obligation_type: string;
  required: number;
  description: string;
  compliance_action: string;
}

export function checkAttributionCompliance(db: Db, args: CheckAttributionComplianceArgs) {
  const notice = db.prepare(`
    SELECT required_text, attribution_format, modification_marking
    FROM notice_templates
    WHERE license_id = ?
  `).get(args.license_id) as NoticeRow | undefined;

  const attributionObligations = db.prepare(`
    SELECT obligation_type, required, description, compliance_action
    FROM obligations
    WHERE license_id = ? AND obligation_type = 'attribution'
    ORDER BY required DESC
  `).all(args.license_id) as ObligationRow[];

  if (!notice && attributionObligations.length === 0) {
    return {
      license_id: args.license_id,
      error: `No notice template or attribution obligations found for license: ${args.license_id}`,
      _error_type: 'NO_MATCH',
      ...responseMeta(),
    };
  }

  const issues: string[] = [];
  const attrLower = args.current_attribution.toLowerCase();

  // Check if the attribution contains the license name/identifier
  if (!attrLower.includes(args.license_id.toLowerCase())) {
    issues.push(`Attribution does not mention the license identifier (${args.license_id}).`);
  }

  // Check for copyright notice presence
  if (!attrLower.includes('copyright') && !attrLower.includes('(c)')) {
    issues.push('Attribution does not appear to include a copyright notice.');
  }

  // Check for required text fragments from the notice template
  if (notice) {
    // Check if the attribution references key phrases from required_text
    const requiredPhrases = extractKeyPhrases(notice.required_text);
    const missingPhrases = requiredPhrases.filter(
      (phrase) => !attrLower.includes(phrase.toLowerCase()),
    );
    if (missingPhrases.length > 0) {
      issues.push(
        `Attribution may be missing required text. Expected phrases not found: ${missingPhrases.join('; ')}`,
      );
    }
  }

  const compliant = issues.length === 0;

  return {
    license_id: args.license_id,
    compliant,
    issues,
    notice_template: notice
      ? {
          required_text: notice.required_text,
          attribution_format: notice.attribution_format,
          modification_marking: notice.modification_marking,
        }
      : null,
    attribution_obligations: attributionObligations.map((ob) => ({
      required: ob.required === 1,
      description: ob.description,
      compliance_action: ob.compliance_action,
    })),
    ...responseMeta(),
  };
}

/**
 * Extract key phrases from required text that should appear in a valid attribution.
 * Looks for license name references and permission/condition keywords.
 */
function extractKeyPhrases(requiredText: string): string[] {
  const phrases: string[] = [];

  // Check for "permission notice" or similar
  if (requiredText.toLowerCase().includes('permission notice')) {
    phrases.push('permission');
  }

  // Check for license URL references
  const urlMatch = requiredText.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    phrases.push(urlMatch[0]);
  }

  return phrases;
}
