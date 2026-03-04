#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';
import type { Db } from './constants.js';
import { openDatabase } from './db.js';
import { registerTools } from './tools/registry.js';

const server = new Server(
  { name: SERVER_NAME, version: SERVER_VERSION },
  { capabilities: { tools: {} } },
);

const db = openDatabase() as unknown as Db;
registerTools(server, db);

const transport = new StdioServerTransport();
await server.connect(transport);
