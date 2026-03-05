# Privacy Policy

## Data Collection

This MCP server **collects no data**. It operates as a read-only database query tool:

- No user queries are logged
- No analytics or telemetry
- No cookies or session tracking
- No network requests to external services
- No data written to disk at runtime

## Hosting Considerations

When accessed through hosted infrastructure, the hosting provider's privacy policies apply:

- **Anthropic** (Claude Desktop / MCP client): See [Anthropic Privacy Policy](https://www.anthropic.com/privacy)
- **Vercel** (Streamable HTTP deployment): See [Vercel Privacy Policy](https://vercel.com/legal/privacy-policy)
- **Self-hosted** (npm/Docker): No third-party data processing

## Most Private Deployment

For maximum privacy, run locally via npm (stdio transport):

```bash
npm install -g @ansvar/open-source-license-mcp
OSS_LICENSE_DB_PATH=./data/database.db npx open-source-license-mcp
```

This mode runs entirely on your machine with no network communication.

## Recommendations

- Do not include proprietary codebase details, internal project names, or confidential dependency lists in queries
- Use the local npm deployment for sensitive compliance analysis
- Review your MCP client's privacy policy for query retention details

---

Last Updated: 2026-03-04
