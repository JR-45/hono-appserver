// Copyright (C) 2026 - present Jeton Rama, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { connectDB, disconnectDB } from './config/prisma-client.mts';
import Bun from 'bun';
import { app } from './app.mts';
import { banner } from './logger/banner.mts';
import { container } from './container.mts';
import { env } from './config/env.mts';
import process from 'node:process';
import { serverConfig } from './config/server.mts';

const { NODE_ENV } = env;
if (NODE_ENV === 'development' || NODE_ENV === 'test') {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
}

const { fetch } = app;
const { port, portHttp, key, cert } = serverConfig;

await container.dbPopulateService.populate();
await connectDB();

Bun.serve({ port: portHttp, fetch });
Bun.serve({
  port,
  fetch,
  tls: {
    key,
    cert,
  },
});

await banner();

process.on('SIGINT', () => {
  (async () => {
    await disconnectDB();
    console.log('Der Server wird heruntergefahren.');
    process.exit(0);
  })();
});
