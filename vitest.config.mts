// Copyright (C) 2026 - present Jeton Rama, Hochschule Karlsruhe

import { defineConfig } from 'vitest/config';
import process from 'node:process';

// selbst-signiertes Zertifikat
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

export default defineConfig({
    test: {
        env: {
            NODE_TLS_REJECT_UNAUTHORIZED: '0',
        },
        globalSetup: ['./test/integration/setup.global.mts'],
        setupFiles: ['./test/integration/setup.mts'],
        include: ['test/integration/**/*.test.mts'],
        testTimeout: 10_000,
        coverage: {
            provider: 'v8',
        },
    },
});
