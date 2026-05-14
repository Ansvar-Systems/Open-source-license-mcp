// SPDX-License-Identifier: Apache-2.0
import { SERVER_NAME, SERVER_VERSION } from '../constants.js';
import type { Db } from '../constants.js';

export interface RelatedServer {
  name: string;
  scope: string;
  use_when: string;
}

const RELATED_SERVERS: RelatedServer[] = [
  {
    name: 'data-use-license-mcp',
    scope:
      'Dataset licences, government open-data terms (NLOD, Etalab, OGL, DL-DE, IODL, KOGL, Singapore-OGL), legal regimes (Crown Copyright, EU Database Directive, French CPI L122-5), and vendor TOS reference templates (Westlaw, LexisNexis, Bloomberg, Wolters Kluwer)',
    use_when:
      'User asks about Creative Commons licences for data, government open-data portal terms, sui generis database rights, jurisdictional public-domain doctrines, or vendor terms-of-service for legal-research subscriptions',
  },
];

export function about(db: Db) {
  const count = (table: string) =>
    (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c;

  const counts = {
    licenses: count('licenses'),
    compatibility_entries: count('compatibility_matrix'),
    obligations: count('obligations'),
    reuse_spec_rules: count('reuse_spec'),
    notice_templates: count('notice_templates'),
    cra_license_obligations: count('cra_license_obligations'),
  };

  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    category: 'compliance',
    description:
      'Open-source license compliance: SPDX license data, pairwise compatibility checks, obligation checklists, REUSE specification rules, CRA license obligations, and NOTICE file templates.',
    stats: {
      ...counts,
      total_items: Object.values(counts).reduce((a, b) => a + b, 0),
    },
    disclaimer: 'Reference tool only. Not legal advice. Verify against authoritative sources.',
    network: { name: 'Ansvar MCP Network', directory: 'https://ansvar.ai/mcp' },
    related_servers: RELATED_SERVERS,
  };
}
