// SPDX-License-Identifier: Apache-2.0
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Db } from '../constants.js';
import { buildCitation } from '../citation.js';

// License tools (5)
import { getLicense } from './get-license.js';
import { searchLicenses } from './search-licenses.js';
import { checkCompatibility } from './check-compatibility.js';
import { getObligationChecklist } from './get-obligation-checklist.js';
import { compareLicenses } from './compare-licenses.js';

// REUSE compliance tools (3)
import { getReuseSpec } from './get-reuse-spec.js';
import { checkReuseRules } from './check-reuse-rules.js';
import { searchReuseRules } from './search-reuse-rules.js';

// NOTICE & attribution tools (3)
import { getNoticeTemplate } from './get-notice-template.js';
import { generateNoticeRequirements } from './generate-notice-requirements.js';
import { checkAttributionCompliance } from './check-attribution-compliance.js';

// CRA & regulatory tools (4)
import { getCraLicenseObligations } from './get-cra-license-obligations.js';
import { checkSbomLicenseCompleteness } from './check-sbom-license-completeness.js';
import { mapLicenseToCraCategory } from './map-license-to-cra-category.js';
import { getOpenSourceStewardObligations } from './get-open-source-steward-obligations.js';

// Meta tools (3)
import { about } from './about.js';
import { listSources } from './list-sources.js';
import { checkDataFreshness } from './check-data-freshness.js';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export function registerTools(server: Server, db: Db): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools: ToolDefinition[] = [
      // -- License Lookup & Compatibility (5) --------------------------------
      {
        name: 'get_license',
        description: 'Retrieve a specific open-source license by SPDX identifier. Returns license metadata: name, OSI approval, FSF classification, copyleft type, and reference URLs. Use when you know the exact SPDX ID.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            spdx_id: { type: 'string', description: 'SPDX license identifier (e.g., MIT, Apache-2.0, GPL-3.0-only)' },
          },
          required: ['spdx_id'],
        },
      },
      {
        name: 'search_licenses',
        description: 'Full-text search across the SPDX License List. Use when you need to find licenses by name, keyword, or category. Supports filtering by copyleft type and OSI approval status.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'Search text (e.g., "apache", "creative commons", "copyleft")' },
            copyleft_type: { type: 'string', enum: ['permissive', 'weak', 'strong', 'network', 'unknown'], description: 'Filter by copyleft classification' },
            osi_approved: { type: 'boolean', description: 'Filter to OSI-approved licenses only' },
          },
          required: ['query'],
        },
      },
      {
        name: 'check_compatibility',
        description: 'Check pairwise compatibility between two open-source licenses. Returns whether the licenses can be combined, the permitted direction, any conditions, and confidence level. Supports linking type distinctions (static, dynamic, separate_component).',
        inputSchema: {
          type: 'object' as const,
          properties: {
            license_a: { type: 'string', description: 'First SPDX license identifier' },
            license_b: { type: 'string', description: 'Second SPDX license identifier (or "proprietary")' },
            linking_type: { type: 'string', enum: ['static', 'dynamic', 'separate_component', 'any'], description: 'How the components are combined (default: any)' },
          },
          required: ['license_a', 'license_b'],
        },
      },
      {
        name: 'get_obligation_checklist',
        description: 'Get the compliance obligation checklist for a specific license. Returns all obligations grouped by type (attribution, source_disclosure, patent, modification_marking, etc.) with required/optional status and compliance actions.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            license_id: { type: 'string', description: 'SPDX license identifier to get obligations for' },
          },
          required: ['license_id'],
        },
      },
      {
        name: 'compare_licenses',
        description: 'Side-by-side comparison of two licenses. Returns metadata, obligations, and a summary of differences (copyleft type, OSI approval, FSF classification, obligation types). Use to understand the practical differences between two license options.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            license_a: { type: 'string', description: 'First SPDX license identifier' },
            license_b: { type: 'string', description: 'Second SPDX license identifier' },
          },
          required: ['license_a', 'license_b'],
        },
      },

      // -- REUSE Compliance (3) ----------------------------------------------
      {
        name: 'get_reuse_spec',
        description: 'Retrieve REUSE specification rules by topic. Topics: header_format (SPDX file headers), dep5 (.reuse/dep5 entries), compliance (general rules), binary (binary file handling), generated (generated file handling), license_placement (where to put LICENSE files), copyright_format (copyright line format), companion_files (.license companion files).',
        inputSchema: {
          type: 'object' as const,
          properties: {
            topic: {
              type: 'string',
              enum: ['header_format', 'dep5', 'compliance', 'binary', 'generated', 'license_placement', 'copyright_format', 'companion_files'],
              description: 'REUSE specification topic to look up',
            },
          },
          required: ['topic'],
        },
      },
      {
        name: 'check_reuse_rules',
        description: 'Get REUSE-compliant header format and dep5 entry for a specific file type and license. Returns the recommended SPDX header, dep5 template, and any special handling rules for the file type.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            file_type: { type: 'string', description: 'File extension (e.g., ".py", ".ts", ".md", ".json")' },
            license_id: { type: 'string', description: 'SPDX license identifier to use in the header' },
          },
          required: ['file_type', 'license_id'],
        },
      },
      {
        name: 'search_reuse_rules',
        description: 'Full-text search across REUSE specification rules. Use to find rules about a topic (e.g., "binary", "generated files", "Python", "dep5").',
        inputSchema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'Search text (e.g., "binary files", "Python header", "dep5 format")' },
          },
          required: ['query'],
        },
      },

      // -- NOTICE & Attribution (3) ------------------------------------------
      {
        name: 'get_notice_template',
        description: 'Retrieve the NOTICE/attribution template for a specific license. Returns the required text, attribution format, modification marking requirements, and an example. Use when generating NOTICE files or third-party attribution documents.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            license_id: { type: 'string', description: 'SPDX license identifier (e.g., MIT, Apache-2.0, GPL-3.0-only)' },
          },
          required: ['license_id'],
        },
      },
      {
        name: 'generate_notice_requirements',
        description: 'Generate combined NOTICE requirements for multiple licenses. Pass an array of SPDX IDs used in your project. Returns per-license templates and deduplicated requirement groups where licenses share the same attribution format.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            license_ids: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of SPDX license identifiers used in the project',
            },
          },
          required: ['license_ids'],
        },
      },
      {
        name: 'check_attribution_compliance',
        description: 'Check if a given attribution text satisfies a license\'s notice requirements. Compares the provided text against the license\'s notice template and attribution obligations. Returns compliance status and specific issues found.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            license_id: { type: 'string', description: 'SPDX license identifier to check against' },
            current_attribution: { type: 'string', description: 'The current attribution/NOTICE text to validate' },
          },
          required: ['license_id', 'current_attribution'],
        },
      },

      // -- CRA & Regulatory (4) ----------------------------------------------
      {
        name: 'get_cra_license_obligations',
        description: 'Retrieve EU Cyber Resilience Act obligations related to open-source licensing. Filter by license type (permissive, copyleft, etc.) or CRA article. Returns obligations with descriptions and compliance actions.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            license_type: { type: 'string', description: 'Filter by license type (e.g., "permissive", "weak_copyleft", "strong_copyleft")' },
            cra_article: { type: 'string', description: 'Filter by CRA article (e.g., "Article 13(1)(f)", "Article 24")' },
          },
        },
      },
      {
        name: 'check_sbom_license_completeness',
        description: 'Validate SPDX license expressions in an SBOM component list. Flags: missing expressions, NOASSERTION values, deprecated SPDX identifiers, and identifiers not found in the SPDX License List. Use to verify SBOM license data quality before CRA submission.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            components: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Component name' },
                  spdx_expression: { type: 'string', description: 'SPDX license expression (e.g., "MIT", "Apache-2.0 OR MIT")' },
                },
                required: ['name', 'spdx_expression'],
              },
              description: 'Array of SBOM components with their SPDX license expressions',
            },
          },
          required: ['components'],
        },
      },
      {
        name: 'map_license_to_cra_category',
        description: 'Map an open-source license type to its CRA product category implications. Returns how the license type affects the conformity assessment path, SBOM requirements, and update obligations under the EU Cyber Resilience Act.',
        inputSchema: {
          type: 'object' as const,
          properties: {
            license_type: {
              type: 'string',
              enum: ['permissive', 'weak_copyleft', 'strong_copyleft', 'network_copyleft', 'proprietary'],
              description: 'License type category',
            },
          },
          required: ['license_type'],
        },
      },
      {
        name: 'get_open_source_steward_obligations',
        description: 'Retrieve all CRA Article 24 obligations for open-source software stewards. Article 24 defines duties for legal persons that systematically support open-source products intended for commercial use.',
        inputSchema: {
          type: 'object' as const,
          properties: {},
        },
      },

      // -- Meta (3) -----------------------------------------------------------
      {
        name: 'about',
        description: 'Information about this MCP server: version, capabilities, data source counts, and domain description. Use to understand what data is available and how current it is.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'list_sources',
        description: 'List all data sources with URLs, licences, and update frequencies. Use to understand data provenance and freshness.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'check_data_freshness',
        description: 'Check when the database was last built and report freshness status for each data source. Returns build date, age in days, and per-source status.',
        inputSchema: { type: 'object' as const, properties: {} },
      },
    ];

    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      let response;
      switch (name) {
        // License Lookup & Compatibility
        case 'get_license': {
          const licResult = getLicense(db, args as { spdx_id: string });
          if (!licResult.error) {
            response = {
              ...licResult,
              _citation: buildCitation(
                String(licResult.spdx_id),
                `${licResult.name} (${licResult.spdx_id})`,
                'get_license',
                { spdx_id: String(licResult.spdx_id) },
                licResult.details_url as string | undefined,
              ),
            };
          } else {
            response = licResult;
          }
          break;
        }
        case 'search_licenses':
          response = searchLicenses(db, args as { query: string; copyleft_type?: string; osi_approved?: boolean });
          break;
        case 'check_compatibility':
          response = checkCompatibility(db, args as { license_a: string; license_b: string; linking_type?: 'static' | 'dynamic' | 'separate_component' | 'any' });
          break;
        case 'get_obligation_checklist':
          response = getObligationChecklist(db, args as { license_id: string });
          break;
        case 'compare_licenses':
          response = compareLicenses(db, args as { license_a: string; license_b: string });
          break;

        // REUSE Compliance
        case 'get_reuse_spec': {
          const reuseResult = getReuseSpec(db, args as { topic: string });
          if (!reuseResult.error) {
            response = {
              ...reuseResult,
              _citation: buildCitation(
                `REUSE ${(args as { topic: string }).topic}`,
                `REUSE Specification: ${(args as { topic: string }).topic}`,
                'get_reuse_spec',
                { topic: (args as { topic: string }).topic },
              ),
            };
          } else {
            response = reuseResult;
          }
          break;
        }
        case 'check_reuse_rules':
          response = checkReuseRules(db, args as { file_type: string; license_id: string });
          break;
        case 'search_reuse_rules':
          response = searchReuseRules(db, args as { query: string });
          break;

        // NOTICE & Attribution
        case 'get_notice_template':
          response = getNoticeTemplate(db, args as { license_id: string });
          break;
        case 'generate_notice_requirements':
          response = generateNoticeRequirements(db, args as { license_ids: string[] });
          break;
        case 'check_attribution_compliance':
          response = checkAttributionCompliance(db, args as { license_id: string; current_attribution: string });
          break;

        // CRA & Regulatory
        case 'get_cra_license_obligations':
          response = getCraLicenseObligations(db, args as { license_type?: string; cra_article?: string });
          break;
        case 'check_sbom_license_completeness':
          response = checkSbomLicenseCompleteness(db, args as { components: Array<{ name: string; spdx_expression: string }> });
          break;
        case 'map_license_to_cra_category':
          response = mapLicenseToCraCategory(db, args as { license_type: string });
          break;
        case 'get_open_source_steward_obligations':
          response = getOpenSourceStewardObligations(db);
          break;

        // Meta
        case 'about':
          response = about(db);
          break;
        case 'list_sources':
          response = listSources();
          break;
        case 'check_data_freshness':
          response = checkDataFreshness(db);
          break;

        default:
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: `Unknown tool: ${name}` }) }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(response, null, 2) }],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  });
}
