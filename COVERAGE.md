# Coverage Manifest

## What's In

| Dataset | Count | Source |
|---------|-------|--------|
| SPDX licenses | 727 | SPDX License List v3.28.0 (complete) |
| Compatibility pairings | 26 | Curated from FSF, SPDX, license texts |
| License obligations | 54 entries across 15 licenses | Curated from license texts |
| REUSE specification rules | 23 | FSFE REUSE Specification 3.3 (complete) |
| CRA license obligation mappings | 18 | EU Cyber Resilience Act |
| NOTICE file templates | 10 | Curated per-license templates |

## What's NOT In (Known Gaps)

- **Full compatibility matrix** — Only 26 curated pairings out of a possible 727x727. Uncovered pairs return `no_data`, which means no curated determination exists (not that they are incompatible).
- **License exceptions / "WITH" modifiers** — e.g., Classpath-exception-2.0, LLVM-exception. SPDX exceptions are not modelled.
- **Dual-licensing analysis** — No support for "OR" licensing strategy evaluation beyond SPDX expression parsing.
- **License detection from source code** — This tool queries structured data; it does not scan files for license headers or patterns.
- **Package manager license metadata** — No integration with npm, PyPI, Maven, or other package registries.
- **EUPL compatibility decisions** — The EUPL.eu compatibility list is not included.
- **Historical SPDX versions** — Only the current v3.28.0. Previous SPDX License List versions are not available.
- **Non-SPDX licenses** — Proprietary, custom, or unregistered licenses are not in the database.
- **Obligation checklists for all 727 licenses** — Only 15 high-use licenses have curated obligations. Others return empty results.

## Data Sources

| Source | URL | License | Update Frequency |
|--------|-----|---------|------------------|
| SPDX License List | https://spdx.org/licenses/ | CC-BY-3.0 | Follows SPDX releases |
| FSFE REUSE Specification | https://reuse.software/spec-3.3/ | CC-BY-SA-4.0 | Follows FSFE releases |
| EU Cyber Resilience Act | https://eur-lex.europa.eu/ | EU public access | As amended |
| Curated compatibility matrix | Internal | Apache-2.0 | Manual review |
| Curated obligation checklists | Internal | Apache-2.0 | Manual review |
| NOTICE file templates | Internal | Apache-2.0 | Manual review |
