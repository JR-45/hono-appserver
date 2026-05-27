// oxlint-disable max-lines-per-function, no-magic-numbers
// Copyright (C) 2026 - present Jeton Rama, Hochschule Karlsruhe

import { CONTENT_TYPE, restURL } from '../constants.mts';
import { describe, expect, test } from 'vitest';
import axios from 'axios';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const nachnameArray = ['A', 'M', 'S'];
const nachnameNichtVorhanden = ['xxx', 'yyy', 'zzz'];
const emails = ['alpha@acme.com'];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('GET /rest', () => {
    test.concurrent('Alle Mitglieder', async () => {
        // when
        const { status, headers, data } = await axios.get(restURL, {
            headers: { Accept: 'application/json' },
        });

        // then
        expect(status).toBe(200);
        expect(headers[CONTENT_TYPE.toLowerCase()]).toMatch(/json/iu);

        data.content
            .map((m: any) => m.id)
            .forEach((id: number) => {
                expect(id).toBeDefined();
            });
    });

    test.concurrent.each(nachnameArray)(
        'Mitglieder mit Teil-Nachname %s suchen',
        async (nachname) => {
            // given
            const url = `${restURL}?nachname=${nachname}`;

            // when
            const { status, headers, data } = await axios.get(url, {
                headers: { Accept: 'application/json' },
                validateStatus: () => true,
            });

            // then
            expect(status).toBe(200);
            expect(headers[CONTENT_TYPE.toLowerCase()]).toMatch(/json/iu);

            data.content
                .map((m: any) => m.nachname)
                .forEach((n: string) =>
                    expect(n?.toLowerCase()).toStrictEqual(
                        expect.stringContaining(nachname.toLowerCase()),
                    ),
                );
        },
    );

    test.concurrent.each(nachnameNichtVorhanden)(
        'Mitglieder zu nicht vorhandenem Nachname %s suchen',
        async (nachname) => {
            // given
            const url = `${restURL}?nachname=${nachname}`;

            // when
            const { status } = await axios.get(url, {
                headers: { Accept: 'application/json' },
                validateStatus: () => true,
            });

            // then
            expect(status).toBe(404);
        },
    );

    test.concurrent.each(emails)(
        'Mitglied mit Email %s suchen',
        async (email) => {
            // given
            const url = `${restURL}?email=${email}`;

            // when
            const { status, data } = await axios.get(url, {
                headers: { Accept: 'application/json' },
                validateStatus: () => true,
            });

            // then
            expect(status).toBe(200);

            const mitglieder = data.content;
            expect(mitglieder).toHaveLength(1);

            const [mitglied] = mitglieder;
            expect(mitglied?.email).toBe(email);
        },
    );

    test.concurrent('Keine Mitglieder zu einer nicht-vorhandenen Property', async () => {
        // given
        const url = `${restURL}?foo=bar`;

        // when
        const { status } = await axios.get(url, {
            headers: { Accept: 'application/json' },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(404);
    });
});
