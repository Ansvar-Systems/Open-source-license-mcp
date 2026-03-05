# Tools Reference

18 tools organised by category.

---

## License Intelligence

### `get_license`

Retrieve a specific open-source license by SPDX identifier. Returns license metadata: name, OSI approval, FSF classification, copyleft type, and reference URLs.

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `spdx_id` | string | Yes      | SPDX license identifier (e.g., MIT, Apache-2.0, GPL-3.0-only) |

**Returns:** License object with `spdx_id`, `name`, `osi_approved`, `fsf_libre`, `copyleft_type`, `see_also` URLs.

**Example use case:** Look up whether BSD-3-Clause is OSI-approved and what copyleft type it has.

---

### `search_licenses`

Full-text search across the SPDX License List. Supports filtering by copyleft type and OSI approval status.

| Parameter      | Type    | Required | Description |
|----------------|---------|----------|-------------|
| `query`        | string  | Yes      | Search text (e.g., "apache", "creative commons", "copyleft") |
| `copyleft_type`| string  | No       | Filter: permissive, weak, strong, network, unknown |
| `osi_approved` | boolean | No       | Filter to OSI-approved licenses only |

**Returns:** Array of matching licenses with metadata and relevance ranking.

**Example use case:** Find all permissive OSI-approved licenses related to "BSD".

---

### `check_compatibility`

Check pairwise compatibility between two open-source licenses. Uses a 4-step fallback: exact match, reverse match, copyleft-type inference, no_data.

| Parameter     | Type   | Required | Description |
|---------------|--------|----------|-------------|
| `license_a`   | string | Yes      | First SPDX license identifier |
| `license_b`   | string | Yes      | Second SPDX license identifier (or "proprietary") |
| `linking_type` | string | No      | How components are combined: static, dynamic, separate_component, any (default: any) |

**Returns:** Compatibility result with `compatible` (boolean/null), `direction`, `conditions`, `confidence`, `source`.

**Example use case:** Check if MIT code can be included in a GPL-3.0-only project.

---

### `get_obligation_checklist`

Get compliance obligations for a license grouped by type (attribution, source_disclosure, patent, modification_marking).

| Parameter    | Type   | Required | Description |
|--------------|--------|----------|-------------|
| `license_id` | string | Yes      | SPDX license identifier |

**Returns:** Array of obligations with `type`, `description`, `required` (boolean), and `compliance_action`.

**Example use case:** Get the full list of things you must do when distributing Apache-2.0 code.

---

### `compare_licenses`

Side-by-side comparison of two licenses. Returns metadata, obligations, and a summary of key differences.

| Parameter   | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `license_a` | string | Yes      | First SPDX license identifier |
| `license_b` | string | Yes      | Second SPDX license identifier |

**Returns:** Both licenses' metadata, obligations, and a `differences` summary (copyleft type, OSI status, FSF classification, obligation types).

**Example use case:** Compare MIT and Apache-2.0 to understand the practical differences for a new project.

---

## REUSE Compliance

### `get_reuse_spec`

Retrieve REUSE 3.3 specification rules by topic.

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `topic`   | string | Yes      | One of: header_format, dep5, compliance, binary, generated, license_placement, copyright_format, companion_files |

**Returns:** Array of rules with `rule_id`, `topic`, `description`, `example` (if available).

**Example use case:** Get the rules for how to format SPDX headers in source files.

---

### `check_reuse_rules`

Get REUSE-compliant header format and dep5 entry for a specific file type and license.

| Parameter    | Type   | Required | Description |
|--------------|--------|----------|-------------|
| `file_type`  | string | Yes      | File extension (e.g., ".py", ".ts", ".md", ".json") |
| `license_id` | string | Yes      | SPDX license identifier to use in the header |

**Returns:** Recommended SPDX header text, dep5 template, and special handling rules for the file type.

**Example use case:** Get the correct SPDX header for a `.ts` file licensed under Apache-2.0.

---

### `search_reuse_rules`

Full-text search across REUSE specification rules.

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| `query`   | string | Yes      | Search text (e.g., "binary files", "Python header", "dep5 format") |

**Returns:** Matching REUSE rules ranked by relevance.

**Example use case:** Find what the REUSE spec says about handling binary files.

---

## Attribution and NOTICE

### `get_notice_template`

Retrieve the NOTICE/attribution template for a specific license.

| Parameter    | Type   | Required | Description |
|--------------|--------|----------|-------------|
| `license_id` | string | Yes      | SPDX license identifier (e.g., MIT, Apache-2.0, GPL-3.0-only) |

**Returns:** Required text, attribution format, modification marking requirements, and an example.

**Example use case:** Get the NOTICE file template for an Apache-2.0 dependency.

---

### `generate_notice_requirements`

Generate combined NOTICE requirements for multiple licenses used in a project.

| Parameter    | Type     | Required | Description |
|--------------|----------|----------|-------------|
| `license_ids`| string[] | Yes      | Array of SPDX license identifiers used in the project |

**Returns:** Per-license templates and deduplicated requirement groups.

**Example use case:** Generate NOTICE requirements for a project using MIT, Apache-2.0, and BSD-3-Clause.

---

### `check_attribution_compliance`

Validate attribution text against a license's notice requirements.

| Parameter             | Type   | Required | Description |
|-----------------------|--------|----------|-------------|
| `license_id`          | string | Yes      | SPDX license identifier to check against |
| `current_attribution` | string | Yes      | The current attribution/NOTICE text to validate |

**Returns:** Compliance status (pass/fail), specific issues found, and required fixes.

**Example use case:** Check if your project's NOTICE file satisfies Apache-2.0 attribution requirements.

---

## CRA Regulatory

### `get_cra_license_obligations`

Retrieve EU Cyber Resilience Act obligations related to open-source licensing.

| Parameter      | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `license_type` | string | No       | Filter: permissive, weak_copyleft, strong_copyleft |
| `cra_article`  | string | No       | Filter by CRA article (e.g., "Article 13(1)(f)", "Article 24") |

**Returns:** Array of obligations with `article`, `license_type`, `description`, and `compliance_action`.

**Example use case:** Get CRA obligations that apply to strong copyleft licensed components.

---

### `map_license_to_cra_category`

Map a license type to its CRA product category and conformity assessment implications.

| Parameter      | Type   | Required | Description |
|----------------|--------|----------|-------------|
| `license_type` | string | Yes      | One of: permissive, weak_copyleft, strong_copyleft, network_copyleft |

**Returns:** CRA category mapping with conformity assessment path, SBOM requirements, and update obligations.

**Example use case:** Understand how using AGPL-3.0 (network copyleft) affects CRA conformity requirements.

---

### `get_open_source_steward_obligations`

Retrieve all CRA Article 24 obligations for open-source software stewards.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| (none)    |      |          |             |

**Returns:** Array of steward obligations with `obligation_id`, `description`, and `compliance_action`.

**Example use case:** Determine what duties apply to a foundation that maintains OSS used commercially.

---

## SBOM

### `check_sbom_license_completeness`

Validate SPDX license expressions in an SBOM component list. Flags missing expressions, NOASSERTION values, deprecated identifiers, and unknown SPDX IDs.

| Parameter    | Type     | Required | Description |
|--------------|----------|----------|-------------|
| `components` | object[] | Yes      | Array of `{ name: string, spdx_expression: string }` |

**Returns:** Per-component validation results with issues categorised by severity.

**Example use case:** Validate license data quality in an SBOM before CRA submission.

---

## Meta

### `about`

Server information including version, capabilities, data source counts, and domain description.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| (none)    |      |          |             |

**Returns:** Server metadata with record counts per data source.

---

### `list_sources`

List all data sources with URLs, licences, and update frequencies.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| (none)    |      |          |             |

**Returns:** Array of data sources with provenance information.

---

### `check_data_freshness`

Check when the database was last built and report freshness status for each data source.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| (none)    |      |          |             |

**Returns:** Build date, age in days, and per-source freshness status.
