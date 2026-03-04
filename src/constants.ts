export const SERVER_NAME = 'open-source-license-mcp';
export const SERVER_VERSION = '0.1.0';
export const DB_ENV_VAR = 'OSS_LICENSE_DB_PATH';

/** Minimal database interface compatible with both better-sqlite3 and @ansvar/mcp-sqlite */
export interface Db {
  prepare(sql: string): {
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
    run(...params: unknown[]): unknown;
  };
  pragma(sql: string): unknown;
}
