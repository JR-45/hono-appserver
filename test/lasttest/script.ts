// oxlint-disable func-style
// oxlint-disable no-magic-numbers
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

import { type MitgliedNeuType } from '../../src/mitglied/router/mitglied-validation.mts';
import { type Options } from 'k6/options';
// @ts-expect-error https://github.com/grafana/k6-jslib-testing
import { expect } from 'https://jslib.k6.io/k6-testing/0.6.1/index.js';
import http from 'k6/http';
import { sleep } from 'k6';

const baseUrl = 'https://localhost:3000';
const restUrl = `${baseUrl}/rest`;
const graphqlUrl = `${baseUrl}/graphql`;
const tokenUrl = `${baseUrl}/auth/token`;
const dbPopulateUrl = `${baseUrl}/dev/db_populate`;

const ids = [1, 20, 30, 40];
const nachnameArray = ['A', 'M', 'S', 'O'];
const nachnameNichtVorhanden = ['xxx', 'yyy', 'zzz'];

const neuesMitglied: Omit<MitgliedNeuType, 'geburtsdatum' | 'beitrittsdatum'> & {
    geburtsdatum: string;
    beitrittsdatum: string;
} = {
    vorname: 'k6Test',
    nachname: 'Lasttest',
    email: 'TBD',
    geburtsdatum: '1990-01-01',
    geschlecht: 'MAENNLICH',
    mitgliedsstatus: 'AKTIV',
    beitrittsdatum: '2026-01-01',
    interessen: ['SPORT'],
    ausleihen: [],
};

const tlsDir = '../../src/config/resources/tls';
const cert = open(`${tlsDir}/certificate.crt`);
const key = open(`${tlsDir}/key.pem`);

// https://grafana.com/docs/k6/latest/using-k6/test-lifecycle
export function setup() {
    const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const body = 'username=admin&password=p';
    const tokenResponse = http.post<'text'>(tokenUrl, body, {
        headers: tokenHeaders,
    });
    let token: string;
    if (tokenResponse.status === 200) {
        token = JSON.parse(tokenResponse.body).access_token;
        console.log(`token=${token}`);
    } else {
        throw new Error(
            `setup fuer adminToken: status=${tokenResponse.status}, body=${tokenResponse.body}`,
        );
    }

    const headers = { Authorization: `Bearer ${token}` };
    const res = http.post(dbPopulateUrl, null, { headers });
    if (res.status === 200) {
        console.log('DB neu geladen');
    } else {
        throw new Error(
            `setup fuer db_populate: status=${res.status}, body=${res.body}`,
        );
    }
}

const rampUpDuration = '5s';
const steadyDuration = '22s';
const rampDownDuration = '3s';

export const options: Options = {
    batchPerHost: 50,

    scenarios: {
        get_id: {
            exec: 'getById',
            executor: 'ramping-vus',
            stages: [
                { target: 2, duration: rampUpDuration },
                { target: 2, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        get_id_not_modified: {
            exec: 'getByIdNotModified',
            executor: 'ramping-vus',
            stages: [
                { target: 5, duration: rampUpDuration },
                { target: 5, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        get_nachname: {
            exec: 'getByNachname',
            executor: 'ramping-vus',
            stages: [
                { target: 20, duration: rampUpDuration },
                { target: 20, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        post_mitglied: {
            exec: 'postMitglied',
            executor: 'ramping-vus',
            stages: [
                { target: 3, duration: rampUpDuration },
                { target: 3, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        query_mitglied: {
            exec: 'queryMitglied',
            executor: 'ramping-vus',
            stages: [
                { target: 3, duration: rampUpDuration },
                { target: 3, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        query_mitglieder: {
            exec: 'queryMitglieder',
            executor: 'ramping-vus',
            stages: [
                { target: 5, duration: rampUpDuration },
                { target: 5, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },

        // Scenarios mit 404 NOT_FOUND -> http_req_failed
        get_nachname_nicht_vorhanden: {
            exec: 'getByNachnameNichtVorhanden',
            executor: 'ramping-vus',
            stages: [
                { target: 3, duration: rampUpDuration },
                { target: 3, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
    },

    // https://grafana.com/docs/k6/latest/using-k6/protocols/ssl-tls/ssl-tls-client-certificates
    tlsAuth: [
        {
            cert,
            key,
        },
    ],
    tlsVersion: http.TLS_1_3, // DevSkim: ignore DS440000
    insecureSkipTLSVerify: true,
};

// GET /rest/<id>
export function getById() {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const response = http.get(`${restUrl}/${id}`);

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// GET /rest/<id> mit If-None-Match
export function getByIdNotModified() {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const headers: Record<string, string> = {
        'If-None-Match': '"0"',
    };
    const response = http.get(`${restUrl}/${id}`, { headers });

    expect(response.status).toBe(304);
    sleep(1);
}

// GET /rest?nachname=<value>
export function getByNachname() {
    const nachname = nachnameArray[Math.floor(Math.random() * nachnameArray.length)];
    const response = http.get(`${restUrl}?nachname=${nachname}`);

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// 404 GET /rest?nachname=<value>
export function getByNachnameNichtVorhanden() {
    const nachname =
        nachnameNichtVorhanden[Math.floor(Math.random() * nachnameNichtVorhanden.length)];
    const response = http.get(`${restUrl}?nachname=${nachname}`);

    expect(response.status).toBe(404);
    sleep(1);
}

// POST /rest
export function postMitglied() {
    const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    const body = 'username=admin&password=p';
    const tokenResponse = http.post<'text'>(tokenUrl, body, {
        headers: tokenHeaders,
    });
    expect(tokenResponse.status).toBe(200);
    const token = JSON.parse(tokenResponse.body).access_token;

    // Eindeutige E-Mail pro VU und Iteration
    const mitglied = { ...neuesMitglied };
    mitglied['email'] = `k6.${__VU}.${__ITER}@lasttest.example.com`;

    const requestHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
    const response = http.post(restUrl, JSON.stringify(mitglied), {
        headers: requestHeaders,
    });

    const { status, headers } = response;
    expect(status).toBe(201);
    expect(headers['Location']).toContain(restUrl);
    sleep(1);
}

// POST /graphql query "mitglied"
export function queryMitglied() {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const body = {
        query: `
            {
                mitglied(id: "${id}") {
                    version
                    vorname
                    nachname
                    email
                    geschlecht
                    mitgliedsstatus
                    interessen
                }
            }
        `,
    };
    const requestHeaders = { 'Content-Type': 'application/json' };

    const response = http.post(graphqlUrl, JSON.stringify(body), {
        headers: requestHeaders,
    });

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// POST /graphql query "mitglieder"
export function queryMitglieder() {
    const nachname = nachnameArray[Math.floor(Math.random() * nachnameArray.length)];
    const body = {
        query: `
            {
                mitglieder(input: { nachname: "${nachname}" }) {
                    vorname
                    nachname
                    email
                }
            }
        `,
    };
    const requestHeaders = { 'Content-Type': 'application/json' };

    const response = http.post(graphqlUrl, JSON.stringify(body), {
        headers: requestHeaders,
    });

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}
