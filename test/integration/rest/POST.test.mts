// oxlint-disable max-lines-per-function
// Copyright (C) 2026 - present Jeton Rama, Hochschule Karlsruhe

import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    LOCATION,
    restURL,
} from '../constants.mts';
import { beforeAll, describe, expect, test } from 'vitest';
import { type MitgliedNeuType } from '../../../src/mitglied/router/mitglied-validation.mts';
import { MitgliedService } from '../../../src/mitglied/service/mitglied-service.mts';
import { getToken } from '../token.mts';
import axios from 'axios';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuesMitglied: Omit<MitgliedNeuType, 'geburtsdatum' | 'beitrittsdatum'> & {
    geburtsdatum: string;
    beitrittsdatum: string;
} = {
    vorname: 'Test',
    nachname: 'Mitglied',
    email: 'test.post@example.com',
    geburtsdatum: '1995-06-15',
    telefonnummer: '+49 721 1234567',
    geschlecht: 'MAENNLICH',
    mitgliedsstatus: 'AKTIV',
    beitrittsdatum: '2026-01-01',
    interessen: ['SPORT', 'LESEN'],
    ausweis: {
        ausstellungsdatum: '2026-01-01',
        ablaufdatum: '2028-01-01',
    },
    ausleihen: [],
};

const neuesMitgliedInvalid: Record<string, unknown> = {
    vorname: '',
    nachname: '',
    email: 'keine-email',
    geschlecht: 'UNGUELTIG',
    mitgliedsstatus: 'UNGUELTIG',
};

const neuesMitgliedEmailExistiert: Omit<MitgliedNeuType, 'geburtsdatum' | 'beitrittsdatum'> & {
    geburtsdatum: string;
    beitrittsdatum: string;
} = {
    vorname: 'Duplikat',
    nachname: 'Email',
    email: 'admin@acme.com',
    geburtsdatum: '1990-01-01',
    telefonnummer: '+49 721 9999999',
    geschlecht: 'WEIBLICH',
    mitgliedsstatus: 'AKTIV',
    beitrittsdatum: '2026-01-01',
    interessen: ['MUSIK'],
    ausleihen: [],
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('POST /rest', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Neues Mitglied', async () => {
        // given & when
        const { status, headers } = await axios.post(restURL, neuesMitglied, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [AUTHORIZATION]: `${BEARER} ${token}`,
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(201);

        const location = headers[LOCATION.toLowerCase()];
        expect(location).toBeDefined();

        const indexLastSlash = location?.lastIndexOf('/') ?? -1;
        expect(indexLastSlash).not.toBe(-1);

        const idStr = location?.slice(indexLastSlash + 1);
        expect(idStr).toBeDefined();
        expect(MitgliedService.ID_PATTERN.test(idStr ?? '')).toBe(true);
    });

    test('Neues Mitglied mit ungueltigen Daten', async () => {
        // given & when
        const { status, data } = await axios.post(restURL, neuesMitgliedInvalid, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [AUTHORIZATION]: `${BEARER} ${token}`,
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(422);
        expect(data.detail).toBeDefined();
    });

    test('Neues Mitglied, aber die Email existiert bereits', async () => {
        // given & when
        const { status, data } = await axios.post(restURL, neuesMitgliedEmailExistiert, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [AUTHORIZATION]: `${BEARER} ${token}`,
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(422);
        expect(data.detail).toStrictEqual(expect.stringContaining('E-Mail'));
    });

    test.concurrent('Neues Mitglied, aber ohne Token', async () => {
        // when
        const { status } = await axios.post(restURL, neuesMitglied, {
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(401);
    });

    test.concurrent('Neues Mitglied, aber mit falschem Token', async () => {
        // when
        const { status } = await axios.post(restURL, neuesMitglied, {
            headers: {
                [CONTENT_TYPE]: APPLICATION_JSON,
                [AUTHORIZATION]: `${BEARER} FALSCHER_TOKEN`,
            },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(401);
    });
});
