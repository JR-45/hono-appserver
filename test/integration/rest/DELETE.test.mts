// oxlint-disable max-lines-per-function
// Copyright (C) 2026 - present Jeton Rama, Hochschule Karlsruhe

import { AUTHORIZATION, BEARER, restURL } from '../constants.mts';
import { beforeAll, describe, expect, test } from 'vitest';
import { getToken } from '../token.mts';
import axios from 'axios';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const id = '50';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('DELETE /rest', () => {
    let token: string;
    let tokenUser: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
        tokenUser = await getToken('user', 'p');
    });

    test.concurrent('Vorhandenes Mitglied loeschen', async () => {
        // given
        const url = `${restURL}/${id}`;

        // when
        const { status } = await axios.delete(url, {
            headers: { [AUTHORIZATION]: `${BEARER} ${token}` },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(204);
    });

    test.concurrent('Mitglied loeschen, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${id}`;

        // when
        const { status } = await axios.delete(url, {
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(401);
    });

    test.concurrent('Mitglied loeschen, aber mit falschem Token', async () => {
        // given
        const url = `${restURL}/${id}`;

        // when
        const { status } = await axios.delete(url, {
            headers: { [AUTHORIZATION]: `${BEARER} FALSCHER_TOKEN` },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(401);
    });

    test.concurrent('Vorhandenes Mitglied als "user" loeschen', async () => {
        // given
        const url = `${restURL}/60`;

        // when
        const { status } = await axios.delete(url, {
            headers: { [AUTHORIZATION]: `${BEARER} ${tokenUser}` },
            validateStatus: () => true,
        });

        // then
        expect(status).toBe(403);
    });
});
