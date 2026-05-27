// Copyright (C) 2026 - present Jeton Rama, Hochschule Karlsruhe

import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globalSetup: ['./test/integration/setup.global.mts'],
        coverage: {
            provider: 'v8',
        },
    },
});
