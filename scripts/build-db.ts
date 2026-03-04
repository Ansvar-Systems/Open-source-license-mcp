// SPDX-License-Identifier: Apache-2.0
// Build script: reads seed JSON files and produces data/database.db with FTS5

import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import BetterSqlite3 from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const SEED = join(ROOT, 'data', 'seed');
const DB_PATH = join(ROOT, 'data', 'database.db');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readSeed<T>(filename: string, key: string): T[] {
  const raw = JSON.parse(readFileSync(join(SEED, filename), 'utf-8'));
  return raw[key] as T[];
}

function kw(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const SCHEMA = `
CREATE TABLE licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  spdx_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  osi_approved INTEGER NOT NULL DEFAULT 0,
  fsf_free INTEGER NOT NULL DEFAULT 0,
  deprecated INTEGER NOT NULL DEFAULT 0,
  copyleft_type TEXT NOT NULL DEFAULT 'unknown',
  details_url TEXT,
  see_also TEXT,
  keywords TEXT NOT NULL DEFAULT ''
);

CREATE TABLE compatibility_matrix (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_a TEXT NOT NULL,
  license_b TEXT NOT NULL,
  linking_type TEXT NOT NULL DEFAULT 'any',
  compatible INTEGER NOT NULL,
  direction TEXT NOT NULL DEFAULT 'bidirectional',
  conditions TEXT,
  confidence TEXT NOT NULL DEFAULT 'consensus',
  UNIQUE(license_a, license_b, linking_type)
);

CREATE TABLE obligations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_id TEXT NOT NULL,
  obligation_type TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  compliance_action TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT ''
);

CREATE TABLE reuse_spec (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  rule_type TEXT NOT NULL,
  file_pattern TEXT,
  language TEXT,
  description TEXT NOT NULL,
  example TEXT,
  keywords TEXT NOT NULL DEFAULT ''
);

CREATE TABLE cra_license_obligations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cra_article TEXT NOT NULL,
  license_type TEXT NOT NULL,
  obligation TEXT NOT NULL,
  description TEXT NOT NULL,
  compliance_action TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT ''
);

CREATE TABLE notice_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_id TEXT NOT NULL,
  required_text TEXT NOT NULL,
  attribution_format TEXT NOT NULL,
  modification_marking TEXT,
  example TEXT,
  keywords TEXT NOT NULL DEFAULT ''
);

CREATE TABLE db_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- FTS5 tables
CREATE VIRTUAL TABLE licenses_fts USING fts5(
  spdx_id, name, copyleft_type, keywords, content='licenses', content_rowid='id'
);

CREATE VIRTUAL TABLE obligations_fts USING fts5(
  license_id, obligation_type, description, compliance_action, keywords,
  content='obligations', content_rowid='id'
);

CREATE VIRTUAL TABLE reuse_spec_fts USING fts5(
  rule_type, description, example, keywords, content='reuse_spec', content_rowid='id'
);
`;

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function build(): void {
  // Remove old DB
  if (existsSync(DB_PATH)) {
    unlinkSync(DB_PATH);
  }

  const db = new BetterSqlite3(DB_PATH);

  // journal_mode = DELETE (required for Vercel WASM SQLite — WAL not supported)
  db.pragma('journal_mode = DELETE');

  // Create schema
  db.exec(SCHEMA);

  // --- Licenses -----------------------------------------------------------
  const spdxRaw = JSON.parse(readFileSync(join(SEED, 'spdx-licenses.json'), 'utf-8'));
  const spdxVersion: string = spdxRaw.version ?? 'unknown';

  interface SpdxLicense {
    spdx_id: string;
    name: string;
    osi_approved: boolean;
    fsf_free: boolean;
    deprecated: boolean;
    copyleft_type?: string;
    details_url?: string;
    see_also?: string[];
  }

  const licenses: SpdxLicense[] = spdxRaw.licenses;
  const insertLicense = db.prepare(`
    INSERT INTO licenses (spdx_id, name, osi_approved, fsf_free, deprecated, copyleft_type, details_url, see_also, keywords)
    VALUES (@spdx_id, @name, @osi_approved, @fsf_free, @deprecated, @copyleft_type, @details_url, @see_also, @keywords)
  `);

  const insertLicenses = db.transaction(() => {
    for (const l of licenses) {
      insertLicense.run({
        spdx_id: l.spdx_id,
        name: l.name,
        osi_approved: l.osi_approved ? 1 : 0,
        fsf_free: l.fsf_free ? 1 : 0,
        deprecated: l.deprecated ? 1 : 0,
        copyleft_type: l.copyleft_type ?? 'unknown',
        details_url: l.details_url ?? null,
        see_also: l.see_also ? JSON.stringify(l.see_also) : null,
        keywords: kw(l.spdx_id, l.name, l.copyleft_type),
      });
    }
  });
  insertLicenses();
  console.log(`licenses: ${licenses.length} rows`);

  // --- Compatibility matrix -----------------------------------------------
  interface CompatEntry {
    license_a: string;
    license_b: string;
    linking_type: string;
    compatible: boolean;
    direction: string;
    conditions?: string;
    confidence: string;
  }

  const compatEntries = readSeed<CompatEntry>('compatibility-matrix.json', 'entries');
  const insertCompat = db.prepare(`
    INSERT INTO compatibility_matrix (license_a, license_b, linking_type, compatible, direction, conditions, confidence)
    VALUES (@license_a, @license_b, @linking_type, @compatible, @direction, @conditions, @confidence)
  `);

  const insertCompats = db.transaction(() => {
    for (const c of compatEntries) {
      insertCompat.run({
        license_a: c.license_a,
        license_b: c.license_b,
        linking_type: c.linking_type ?? 'any',
        compatible: c.compatible ? 1 : 0,
        direction: c.direction ?? 'bidirectional',
        conditions: c.conditions ?? null,
        confidence: c.confidence ?? 'consensus',
      });
    }
  });
  insertCompats();
  console.log(`compatibility_matrix: ${compatEntries.length} rows`);

  // --- Obligations --------------------------------------------------------
  interface ObligationEntry {
    license_id: string;
    obligation_type: string;
    required: boolean;
    description: string;
    compliance_action: string;
  }

  const obligationEntries = readSeed<ObligationEntry>('obligations.json', 'entries');
  const insertObligation = db.prepare(`
    INSERT INTO obligations (license_id, obligation_type, required, description, compliance_action, keywords)
    VALUES (@license_id, @obligation_type, @required, @description, @compliance_action, @keywords)
  `);

  const insertObligations = db.transaction(() => {
    for (const o of obligationEntries) {
      insertObligation.run({
        license_id: o.license_id,
        obligation_type: o.obligation_type,
        required: o.required ? 1 : 0,
        description: o.description,
        compliance_action: o.compliance_action,
        keywords: kw(o.license_id, o.obligation_type, o.description),
      });
    }
  });
  insertObligations();
  console.log(`obligations: ${obligationEntries.length} rows`);

  // --- REUSE spec ---------------------------------------------------------
  interface ReuseEntry {
    rule_type: string;
    file_pattern?: string;
    language?: string;
    description: string;
    example?: string;
  }

  const reuseEntries = readSeed<ReuseEntry>('reuse-spec.json', 'entries');
  const insertReuse = db.prepare(`
    INSERT INTO reuse_spec (rule_type, file_pattern, language, description, example, keywords)
    VALUES (@rule_type, @file_pattern, @language, @description, @example, @keywords)
  `);

  const insertReuses = db.transaction(() => {
    for (const r of reuseEntries) {
      insertReuse.run({
        rule_type: r.rule_type,
        file_pattern: r.file_pattern ?? null,
        language: r.language ?? null,
        description: r.description,
        example: r.example ?? null,
        keywords: kw(r.rule_type, r.language, r.description),
      });
    }
  });
  insertReuses();
  console.log(`reuse_spec: ${reuseEntries.length} rows`);

  // --- CRA license obligations --------------------------------------------
  interface CraEntry {
    cra_article: string;
    license_type: string;
    obligation: string;
    description: string;
    compliance_action: string;
  }

  const craEntries = readSeed<CraEntry>('cra-license-obligations.json', 'entries');
  const insertCra = db.prepare(`
    INSERT INTO cra_license_obligations (cra_article, license_type, obligation, description, compliance_action, keywords)
    VALUES (@cra_article, @license_type, @obligation, @description, @compliance_action, @keywords)
  `);

  const insertCras = db.transaction(() => {
    for (const c of craEntries) {
      insertCra.run({
        cra_article: c.cra_article,
        license_type: c.license_type,
        obligation: c.obligation,
        description: c.description,
        compliance_action: c.compliance_action,
        keywords: kw(c.cra_article, c.license_type, c.obligation, c.description),
      });
    }
  });
  insertCras();
  console.log(`cra_license_obligations: ${craEntries.length} rows`);

  // --- Notice templates ---------------------------------------------------
  interface NoticeEntry {
    license_id: string;
    required_text: string;
    attribution_format: string;
    modification_marking?: string | null;
    example?: string;
  }

  const noticeEntries = readSeed<NoticeEntry>('notice-templates.json', 'entries');
  const insertNotice = db.prepare(`
    INSERT INTO notice_templates (license_id, required_text, attribution_format, modification_marking, example, keywords)
    VALUES (@license_id, @required_text, @attribution_format, @modification_marking, @example, @keywords)
  `);

  const insertNotices = db.transaction(() => {
    for (const n of noticeEntries) {
      insertNotice.run({
        license_id: n.license_id,
        required_text: n.required_text,
        attribution_format: n.attribution_format,
        modification_marking: n.modification_marking ?? null,
        example: n.example ?? null,
        keywords: kw(n.license_id, n.attribution_format),
      });
    }
  });
  insertNotices();
  console.log(`notice_templates: ${noticeEntries.length} rows`);

  // --- Rebuild FTS --------------------------------------------------------
  db.exec(`INSERT INTO licenses_fts(licenses_fts) VALUES('rebuild')`);
  db.exec(`INSERT INTO obligations_fts(obligations_fts) VALUES('rebuild')`);
  db.exec(`INSERT INTO reuse_spec_fts(reuse_spec_fts) VALUES('rebuild')`);

  // --- Metadata -----------------------------------------------------------
  const insertMeta = db.prepare(`INSERT INTO db_metadata (key, value) VALUES (?, ?)`);
  const insertMetas = db.transaction(() => {
    insertMeta.run('schema_version', '1');
    insertMeta.run('category', 'open-source-license-compliance');
    insertMeta.run('mcp_name', 'eu.ansvar/open-source-license-mcp');
    insertMeta.run('built_at', new Date().toISOString());
    insertMeta.run('spdx_version', spdxVersion);
  });
  insertMetas();

  // --- VACUUM -------------------------------------------------------------
  db.exec('VACUUM');
  db.close();

  console.log(`\nDatabase built: ${DB_PATH}`);
}

build();
