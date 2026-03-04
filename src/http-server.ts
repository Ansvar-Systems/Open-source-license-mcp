#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

/**
 * HTTP Server Entry Point for Container Deployment
 *
 * Provides Streamable HTTP transport for remote MCP clients.
 * Use src/index.ts for local stdio-based usage.
 */

import { createServer } from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';

import { SERVER_NAME, SERVER_VERSION } from './constants.js';
import type { Db } from './constants.js';
import { openDatabase } from './db.js';
import { registerTools } from './tools/registry.js';

const PORT = parseInt(process.env.PORT || '3000', 10);

let db: Db;

function getDatabase(): Db {
  if (!db) {
    db = openDatabase() as unknown as Db;
  }
  return db;
}

function createMcpServer(): Server {
  const database = getDatabase();
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );
  registerTools(server, database);
  return server;
}

async function main() {
  const transports = new Map<string, StreamableHTTPServerTransport>();

  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);

    // Health check endpoint
    if (url.pathname === '/health') {
      try {
        const database = getDatabase();
        const row = database.prepare('SELECT COUNT(*) as count FROM licenses').get() as { count: number };
        const status = row.count > 0 ? 'ok' : 'degraded';
        const statusCode = status === 'degraded' ? 503 : 200;

        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status,
          server: SERVER_NAME,
          version: SERVER_VERSION,
          licenses: Number(row.count),
          timestamp: new Date().toISOString(),
        }));
      } catch {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'degraded',
          server: SERVER_NAME,
          version: SERVER_VERSION,
          licenses: 0,
          timestamp: new Date().toISOString(),
        }));
      }
      return;
    }

    // MCP endpoint
    if (url.pathname === '/mcp' || url.pathname === '/') {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;

      if (sessionId && transports.has(sessionId)) {
        await transports.get(sessionId)!.handleRequest(req, res);
        return;
      }

      if (req.method === 'POST') {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
        });
        const server = createMcpServer();
        await server.connect(transport);
        transport.onclose = () => {
          if (transport.sessionId) transports.delete(transport.sessionId);
        };
        await transport.handleRequest(req, res);
        if (transport.sessionId) transports.set(transport.sessionId, transport);
        return;
      }

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad request' }));
      return;
    }

    // 404 for other paths
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(PORT, () => {
    console.error(`${SERVER_NAME} (HTTP) listening on port ${PORT}`);
    console.error(`MCP endpoint: http://localhost:${PORT}/mcp`);
    console.error(`Health check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.error('Received SIGTERM, shutting down...');
    httpServer.close(() => {
      process.exit(0);
    });
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
