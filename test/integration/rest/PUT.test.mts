// oxlint-disable max-lines-per-function
// Copyright (C) 2026 - present Jeton Rama, Hochschule Karlsruhe

import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    IF_MATCH,
    restURL,
} from '../constants.mts';
import { beforeAll, describe, expect, test } from 'vitest';
import axios from 'axios';
import { getToken } from '../token.mts';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const geaendertesMitglied = {
    vorname: 'Geaendert',
    nachname: 'Mitglied',
    email: 'geaendert@example.com',
    geburtsdatum: '1990-03-03',
    telefonnummer: '+49 721 3333333',
    geschlecht: 'DIVERS',
    mitgliedsstatus: 'AKTIV',
    beitrittsdatum: '2025-01-01',
    interessen: ['SPORT'],
};
const idVorhanden = '40';

const geaendertesMitgliedIdNichtVorhanden = {
    vorname: 'Nicht',
    nachname: 'Vorhanden',
    email: 'nicht.vorhanden@example.com',
    geschlecht: 'MAENNLICH',
    mitgliedsstatus: 'AKTIV',
    interessen: [],
};
const idNichtVorhanden = '999999';

const geaendertesMitgliedInvalid: Record<string, unknown> = {
    vorname: '',
    nachname: '',
    email: 'keine-email',
    geschlecht: 'UNGUELTIG',
    mitgliedsstatus: 'UNGUELTIG',
};

const veraltesMitglied = {
    vorname: 'Veraltet',
    nachname: 'Version',
    email: 'veraltet@example.com',
    geschlecht: 'WEIBLICH',
    mitgliedsstatus: 'AKTIV',
    interessen: [],
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('PUT /rest/:id', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Vorhandenes Mitglied aendern', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;

        // when
        const { status } = await axios.put(url, geaendertesMitglied, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [IF_MATCH]: '"0"',
                [AUTHORIZATION]: `${BEARER} ${token}`,
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(204);
    });

    test('Nicht-vorhandenes Mitglied aendern', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;

        // when
        const { status } = await axios.put(url, geaendertesMitgliedIdNichtVorhanden, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [IF_MATCH]: '"0"',
                [AUTHORIZATION]: `${BEARER} ${token}`,
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(404);
    });

    test('Vorhandenes Mitglied aendern, aber mit ungueltigen Daten', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;

        // when
        const { status, data } = await axios.put(url, geaendertesMitgliedInvalid, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [IF_MATCH]: '"0"',
                [AUTHORIZATION]: `${BEARER} ${token}`,
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(422);
        expect(data.detail).toBeDefined();
    });

    test('Vorhandenes Mitglied aendern, aber ohne Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;

        // when
        const { status, data } = await axios.put(url, geaendertesMitglied, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [AUTHORIZATION]: `${BEARER} ${token}`,
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(428);
        expect(data.detail).toContain(IF_MATCH);
    });

    test('Vorhandenes Mitglied aendern, aber mit alter Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;

        // when
        const { status, data } = await axios.put(url, veraltesMitglied, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [IF_MATCH]: '"0"',
                [AUTHORIZATION]: `${BEARER} ${token}`,
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(412);
        expect(data.detail).toMatch(/Versionsnummer/u);
    });

    test('Vorhandenes Mitglied aendern, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;

        // when
        const { status } = await axios.put(url, geaendertesMitglied, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [IF_MATCH]: '"0"',
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(401);
    });

    test('Vorhandenes Mitglied aendern, aber mit falschem Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;

        // when
        const { status } = await axios.put(url, geaendertesMitglied, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [IF_MATCH]: '"0"',
                [AUTHORIZATION]: `${BEARER} FALSCHER_TOKEN`,
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(401);
    });
});
