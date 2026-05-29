// oxlint-disable max-lines-per-function, no-magic-numbers
// Copyright (C) 2026 - present Jeton Rama, Hochschule Karlsruhe

import { CONTENT_TYPE, IF_NONE_MATCH, restURL } from '../constants.mts';
import { describe, expect, test } from 'vitest';
import axios from 'axios';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const ids = [1, 20];
const idNichtVorhanden = 999999;
const idsETag = [1, 20];
const idFalsch = 'xy';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('GET /rest/:id', () => {
    test.concurrent.each(ids)('Mitglied zu vorhandener ID %i', async (id) => {
        // given
        const url = `${restURL}/${id}`;

        // when
        const { status, headers, data } = await axios.get(url, {
            headers: { Accept: 'application/json' },
        });

        // then
        expect(status).toBe(200);
        expect(headers[CONTENT_TYPE.toLowerCase()]).toMatch(/json/iu);
        expect(data.id).toBe(id);
    });

    test.concurrent('Kein Mitglied zu nicht-vorhandener ID', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;

        // when
        const { status } = await axios.get(url, {
            headers: { Accept: 'application/json' },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(404);
    });

    test.concurrent('Kein Mitglied zu falscher ID', async () => {
        // given
        const url = `${restURL}/${idFalsch}`;

        // when
        const { status } = await axios.get(url, {
            headers: { Accept: 'application/json' },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(404);
    });

    test.concurrent.each(idsETag)(
        `Mitglied zu ID %i mit ${IF_NONE_MATCH}`,
        async (id) => {
            // given
            const url = `${restURL}/${id}`;
            const { data: firstData } = await axios.get(url, {
                headers: { Accept: 'application/json' },
            });
            const etag = `"${firstData.version}"`;

            // when
            const { status, data } = await axios.get(url, {
                headers: {
                    Accept: 'application/json',
                    [IF_NONE_MATCH]: etag,
                },
                validateStatus: () => true,
            });

            // then
            expect(status).toBe(304);
            expect(data).toBe('');
        },
    );
});
