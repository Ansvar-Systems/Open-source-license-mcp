# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.0.x   | Yes       |

## Security Scanning

This repository uses automated security scanning:

- **npm audit** — dependency vulnerability detection
- **Trivy** — container image scanning
- **Socket Security** — supply chain risk analysis
- **CodeQL** — static analysis for code vulnerabilities
- **Semgrep** — pattern-based security rules
- **Gitleaks** — secret detection in commits
- **OpenSSF Scorecard** — supply chain security posture

## Reporting a Vulnerability

**Email:** security@ansvar.eu

**Do NOT open public GitHub issues for security vulnerabilities.**

### Response Times

| Severity | Acknowledgement | Resolution Target |
|----------|-----------------|-------------------|
| Critical | 24 hours        | 7 days            |
| High     | 48 hours        | 30 days           |
| Medium   | 5 business days | 90 days           |
| Low      | 2 weeks         | Next release      |

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact assessment

## Scope

### In Scope

- Source code in `src/`
- Database layer and query handling
- Input validation and sanitisation
- npm dependencies
- Build pipeline and CI workflows
- Docker image security

### Out of Scope

- **SPDX data accuracy** — report upstream to [spdx.org](https://spdx.org)
- **REUSE spec accuracy** — report to [fsfe.org](https://fsfe.org)
- **Third-party MCP clients** — client-side vulnerabilities are the client's responsibility
- **User environment configuration** — local filesystem permissions, network exposure

## Database Security

- Database is pre-built and version-controlled (not generated at runtime)
- Opened in **read-only mode** at runtime (`SQLITE_OPEN_READONLY`)
- All queries use parameterised statements
- Data sources: SPDX/Linux Foundation, FSFE REUSE Specification, EU Official Journal
- Ingestion scripts require manual execution and review before commit
