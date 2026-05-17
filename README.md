# Open Source License Compliance MCP

<!-- ANSVAR-CTA-BEGIN -->
> ### ▶ Try this MCP instantly via Ansvar Gateway
> **50 free queries/day · no card required · OAuth signup at [ansvar.eu/gateway](https://ansvar.eu/gateway)**
>
> One endpoint, one OAuth signup, access from any MCP-compatible client.

### Connect

**Claude Code** (one line):

```bash
claude mcp add ansvar --transport http https://gateway.ansvar.eu/mcp
```

**Claude Desktop / Cursor** — add to `claude_desktop_config.json` (or `mcp.json`):

```json
{
  "mcpServers": {
    "ansvar": {
      "type": "url",
      "url": "https://gateway.ansvar.eu/mcp"
    }
  }
}
```

**Claude.ai** — Settings → Connectors → Add custom connector → paste `https://gateway.ansvar.eu/mcp`

First request opens an OAuth flow at [ansvar.eu/gateway](https://ansvar.eu/gateway). After signup, your client is bound to your account; tier (free / premium / team / company) determines fan-out, quota, and which downstream MCPs are reachable.

---

## Self-host this MCP

You can also clone this repo and build the corpus yourself. The schema,
fetcher, and tool implementations all live here. What is not in the repo is
the pre-built database — TDM and standards-licensing constraints on the
upstream sources mean we host the corpus on Ansvar infrastructure rather
than redistribute it as a public artifact.

Build your own: run this repo's ingestion script (entry-point varies per
repo — typically `scripts/ingest.sh`, `npm run ingest`, or `make ingest`;
check the repo root).
<!-- ANSVAR-CTA-END -->


Open-source license compliance intelligence server implementing the Model Context Protocol (MCP). Provides structured access to 727 SPDX licenses, compatibility analysis, obligation checklists, REUSE 3.3 specification, CRA (Cyber Resilience Act) license obligations, and NOTICE file templates.

Part of the [Ansvar MCP Network](https://ansvar.ai/mcp).

## Quick Start

### npm (stdio)

```bash

OSS_LICENSE_DB_PATH=./data/database.db npx open-source-license-mcp
```

### Docker

```bash
docker build -t open-source-license-mcp .
docker run -p 3000:3000 open-source-license-mcp
```

## Tools

### License Intelligence

| Tool | Description |
|------|-------------|
| `get_license` | Retrieve a specific license by SPDX identifier |
| `search_licenses` | Full-text search across SPDX License List with copyleft/OSI filters |
| `check_compatibility` | Check pairwise compatibility between two licenses (4-step fallback) |
| `get_obligation_checklist` | Get compliance obligations for a license grouped by type |
| `compare_licenses` | Side-by-side comparison of two licenses with diff summary |

### REUSE Compliance

| Tool | Description |
|------|-------------|
| `get_reuse_spec` | Query REUSE 3.3 specification rules by topic |
| `check_reuse_rules` | Get REUSE-compliant header format for a file type and license |
| `search_reuse_rules` | Full-text search across REUSE specification rules |

### Attribution and NOTICE

| Tool | Description |
|------|-------------|
| `get_notice_template` | Get the NOTICE/attribution template for a license |
| `generate_notice_requirements` | Combined NOTICE requirements for multiple licenses |
| `check_attribution_compliance` | Validate attribution text against license requirements |

### CRA Regulatory

| Tool | Description |
|------|-------------|
| `get_cra_license_obligations` | CRA obligations filtered by license type or article |
| `map_license_to_cra_category` | Map license type to CRA conformity assessment implications |
| `get_open_source_steward_obligations` | CRA Article 24 steward obligations |

### SBOM

| Tool | Description |
|------|-------------|
| `check_sbom_license_completeness` | Validate SPDX expressions in SBOM component list |

### Meta

| Tool | Description |
|------|-------------|
| `about` | Server info with record counts and capabilities |
| `list_sources` | Data sources with URLs, licences, and update frequencies |
| `check_data_freshness` | Database build date and per-source freshness status |

## Data Sources

- **SPDX License List v3.28.0** (Linux Foundation) — 727 licenses
- **Curated compatibility matrix** — 26 pairings (common OSS licenses)
- **License obligations database** — 54 entries across 15 licenses
- **REUSE Specification 3.3** (FSFE) — 23 rules
- **EU Cyber Resilience Act obligations** — 18 entries
- **NOTICE file templates** — 10 per-license templates

## Building the Database

```bash
npm run build:db
```

## Development

```bash
npm install
npm run build
npm test
```

Run contract tests only:

```bash
npm run test:contract
```

## License

Apache 2.0 — see [LICENSE](LICENSE).

## Links

- [Ansvar Platform](https://ansvar.eu)
- [MCP Protocol](https://modelcontextprotocol.io)
