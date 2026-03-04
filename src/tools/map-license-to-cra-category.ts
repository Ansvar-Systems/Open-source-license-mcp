// SPDX-License-Identifier: Apache-2.0
import type { Db } from '../constants.js';
import { responseMeta } from '../utils/response-meta.js';

export interface MapLicenseToCraCategoryArgs {
  license_type: string;
}

const VALID_TYPES = ['permissive', 'weak_copyleft', 'strong_copyleft', 'network_copyleft', 'proprietary'];

interface CraCategoryMapping {
  license_type: string;
  conformity_assessment: string;
  sbom_requirements: string;
  update_obligations: string;
  key_considerations: string[];
}

const CATEGORY_MAPPINGS: Record<string, CraCategoryMapping> = {
  permissive: {
    license_type: 'permissive',
    conformity_assessment: 'Standard self-assessment path (Module A) applies. Permissive licenses (MIT, Apache-2.0, BSD) do not add conformity assessment complexity beyond the base product classification.',
    sbom_requirements: 'SBOM must include SPDX license identifiers for all permissive components. No source disclosure required in the SBOM. Standard CycloneDX or SPDX format.',
    update_obligations: 'Security updates must be provided for the support period. No license-specific update constraints -- permissive licenses allow patching and redistribution without additional obligations.',
    key_considerations: [
      'Include the license text in NOTICE/LICENSE files bundled with the product.',
      'Attribution requirements vary by license (e.g., Apache-2.0 requires NOTICE file preservation).',
      'No source code disclosure required.',
    ],
  },
  weak_copyleft: {
    license_type: 'weak_copyleft',
    conformity_assessment: 'Standard self-assessment path (Module A) applies. Weak copyleft (LGPL, MPL) may require documenting the boundary between LGPL/MPL components and proprietary code.',
    sbom_requirements: 'SBOM must identify weak copyleft components and their linking type (static vs dynamic). For LGPL, document whether the component is dynamically linked. For MPL, identify file-level boundaries.',
    update_obligations: 'Security updates must preserve the re-linking capability for LGPL components (users must be able to replace the LGPL library). MPL: modified files must remain under MPL.',
    key_considerations: [
      'LGPL dynamic linking: users must be able to re-link with updated library versions.',
      'LGPL static linking: must provide object files or source to enable re-linking.',
      'MPL: modifications to MPL-licensed files must be shared, but combining with proprietary files in the same project is allowed.',
      'Document linking architecture in the technical documentation.',
    ],
  },
  strong_copyleft: {
    license_type: 'strong_copyleft',
    conformity_assessment: 'Self-assessment still applies, but the manufacturer must confirm that GPL source disclosure obligations are met. If the product is a "critical product" (Annex III), third-party assessment may require source code availability evidence.',
    sbom_requirements: 'SBOM must identify all GPL components. Must document the source code availability mechanism (written offer, bundled source, or download URL). GPL components trigger disclosure for the entire linked work.',
    update_obligations: 'Security updates must include corresponding source code. The "complete corresponding source" requirement applies to all modifications. Update delivery mechanisms must comply with GPL Section 6.',
    key_considerations: [
      'Source code for the entire linked work must be available.',
      'Tivoization restrictions (GPLv3): installation information must be provided for user products.',
      'GPL-2.0-only and GPL-3.0-only are not cross-compatible.',
      'Combining GPL with proprietary code creates a derivative work requiring full source disclosure.',
    ],
  },
  network_copyleft: {
    license_type: 'network_copyleft',
    conformity_assessment: 'Same as strong copyleft, with additional consideration: AGPL requires source disclosure even for network/SaaS use. If the product with digital elements provides network services, AGPL components trigger source disclosure to network users.',
    sbom_requirements: 'SBOM must identify AGPL components. Must document source availability for network-accessible deployments. The SBOM should note that AGPL obligations extend to remote network interaction.',
    update_obligations: 'Security updates must include source code. For AGPL, source must be available to users interacting over the network. This affects update delivery for cloud-deployed products.',
    key_considerations: [
      'AGPL extends copyleft to network/SaaS usage -- users interacting over a network must receive source.',
      'Combining AGPL with proprietary code is usually incompatible.',
      'SSPL (Server Side Public License) has similar but broader obligations and is not OSI-approved.',
      'Document which components are network-accessible in the technical file.',
    ],
  },
  proprietary: {
    license_type: 'proprietary',
    conformity_assessment: 'Standard CRA conformity assessment applies based on product category (Default/Important Class I/Important Class II/Critical). No open-source-specific considerations. Full manufacturer responsibility.',
    sbom_requirements: 'SBOM must still list all components, including proprietary ones. Use LicenseRef-Proprietary or similar custom SPDX identifiers for proprietary components. Third-party proprietary libraries must be declared.',
    update_obligations: 'Full update obligations as per CRA Article 13. The manufacturer bears complete responsibility for security updates of proprietary components with no upstream open-source community support.',
    key_considerations: [
      'No source disclosure obligations.',
      'Full liability for security vulnerabilities in proprietary code.',
      'Third-party proprietary dependencies must be tracked and updated.',
      'Contractual obligations with proprietary suppliers should cover security update provisions.',
    ],
  },
};

export function mapLicenseToCraCategory(_db: Db, args: MapLicenseToCraCategoryArgs) {
  if (!VALID_TYPES.includes(args.license_type)) {
    return {
      error: `Unknown license type: ${args.license_type}. Valid types: ${VALID_TYPES.join(', ')}`,
      _error_type: 'INVALID_INPUT',
      ...responseMeta(),
    };
  }

  const mapping = CATEGORY_MAPPINGS[args.license_type];

  return {
    ...mapping,
    ...responseMeta(),
  };
}
