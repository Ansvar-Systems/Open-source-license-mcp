// SPDX-License-Identifier: Apache-2.0

export function listSources() {
  return {
    sources: [
      {
        name: 'SPDX License List',
        url: 'https://spdx.org/licenses/',
        license: 'CC-BY-3.0',
        description: 'Canonical list of open-source license identifiers, names, OSI approval status, and FSF classification.',
        update_frequency: 'Updated with each SPDX License List release (roughly quarterly).',
      },
      {
        name: 'REUSE Specification',
        url: 'https://reuse.software/spec/',
        license: 'CC-BY-SA-4.0',
        description: 'FSFE REUSE specification for copyright and licensing information in source code. Rules for SPDX headers, .dep5 files, and license placement.',
        update_frequency: 'Updated with specification revisions.',
      },
      {
        name: 'EU Cyber Resilience Act (CRA)',
        url: 'https://eur-lex.europa.eu/eli/reg/2024/2847/oj',
        license: 'Public domain (EU legislation)',
        description: 'CRA obligations that affect open-source license compliance, including SBOM requirements, open-source steward obligations, and conformity assessment paths by license type.',
        update_frequency: 'Updated when CRA implementing acts or delegated acts are published.',
      },
      {
        name: 'Curated Compatibility Matrix',
        url: 'https://github.com/Ansvar-Systems/Open-source-license-mcp',
        license: 'Apache-2.0',
        description: 'Pairwise license compatibility data curated from established sources (FSF, SPDX, license texts). Includes linking type distinctions and directional compatibility.',
        update_frequency: 'Maintained with database rebuilds.',
      },
      {
        name: 'Curated Obligation Checklists',
        url: 'https://github.com/Ansvar-Systems/Open-source-license-mcp',
        license: 'Apache-2.0',
        description: 'Per-license obligation checklists covering attribution, source disclosure, patent, and modification marking requirements.',
        update_frequency: 'Maintained with database rebuilds.',
      },
      {
        name: 'NOTICE File Templates',
        url: 'https://github.com/Ansvar-Systems/Open-source-license-mcp',
        license: 'Apache-2.0',
        description: 'Attribution and NOTICE file templates for common open-source licenses, with required text and formatting guidance.',
        update_frequency: 'Maintained with database rebuilds.',
      },
    ],
  };
}
