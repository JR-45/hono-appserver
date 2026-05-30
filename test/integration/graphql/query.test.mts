// oxlint-disable max-lines, max-lines-per-function, no-magic-numbers
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

import {
    ACCEPT,
    APPLICATION_JSON,
    CONTENT_TYPE,
    GRAPHQL_RESPONSE_JSON,
    POST,
    graphqlURL,
} from '../constants.mts';
import { beforeAll, describe, expect, test } from 'vitest';
import { type GraphQLQuery } from './graphql.mts';

// -----------------------------------------------------------------------------
// T y p e n
// -----------------------------------------------------------------------------
type MitgliedDTO = {
    id?: string;
    version: number;
    vorname: string;
    nachname: string;
    email: string;
    geschlecht?: string;
    mitgliedsstatus?: string;
    interessen?: string[];
    ausweis?: { ausstellungsdatum: string; ablaufdatum: string };
};

export type ErrorsType = {
    message: string;
    path: string[];
    extensions: { code: string };
}[];

type MitgliedSuccessType = {
    data: { mitglied: MitgliedDTO };
    errors?: undefined;
};
type MitgliederSuccessType = {
    data: { mitglieder: MitgliedDTO[] };
    errors?: undefined;
};
type MitgliedErrorsType = { data: { mitglied: null }; errors: ErrorsType };
type MitgliederErrorsType = { data: { mitglieder: null }; errors: ErrorsType };

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const ids = [1, 20];
const nachnameArray = ['A', 'M', 'S'];
const nachnameNichtVorhanden = ['xxx', 'yyy', 'zzz'];
const emails = ['admin@acme.com'];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('GraphQL Queries', () => {
    let headers: Headers;

    beforeAll(() => {
        headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
    });

    test.concurrent.each(ids)('Mitglied zu ID %i', async (id) => {
        // given
        const query: GraphQLQuery = {
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
                        ausweis {
                            ausstellungsdatum
                            ablaufdatum
                        }
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        expect(response.status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as MitgliedSuccessType;

        expect(errors).toBeUndefined();
        expect(data).toBeDefined();

        const { mitglied } = data;

        expect(mitglied.vorname).toMatch(/^\w/u);
        expect(mitglied.nachname).toMatch(/^\w/u);
        expect(mitglied.email).toMatch(/.+@.+/u);
        expect(mitglied.version).toBeGreaterThan(-1);
        expect(mitglied.id).toBeUndefined();
    });

    test.concurrent('Mitglied zu nicht-vorhandener ID', async () => {
        // given
        const id = '999999';
        const query: GraphQLQuery = {
            query: `
                {
                    mitglied(id: "${id}") {
                        vorname
                        nachname
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        expect(response.status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } =
            (await response.json()) as MitgliedErrorsType;

        expect(data).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors;
        const { path, extensions } = error!;

        expect(path).toBeDefined();
        expect(path![0]).toBe('mitglied');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    test.concurrent('Mitglied zu ungueltiger ID', async () => {
        // given
        const query: GraphQLQuery = {
            query: `
                {
                    mitglied(id: "UNGUELTIG") {
                        vorname
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        expect(response.status).toBe(200);

        const { data, errors } =
            (await response.json()) as MitgliedErrorsType;

        expect(data).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors;
        expect(error!.extensions.code).toBe('BAD_USER_INPUT');
    });

    test.concurrent('Alle Mitglieder', async () => {
        // given
        const query: GraphQLQuery = {
            query: `
                {
                    mitglieder {
                        id
                        version
                        vorname
                        nachname
                        email
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        expect(response.status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } =
            (await response.json()) as MitgliederSuccessType;

        expect(errors).toBeUndefined();
        expect(data).toBeDefined();

        const { mitglieder } = data;

        expect(mitglieder).not.toHaveLength(0);

        mitglieder.forEach((mitglied) => {
            expect(parseInt(mitglied.id!, 10)).toBeGreaterThan(0);
            expect(mitglied.version).toBeGreaterThan(-1);
            expect(mitglied.vorname).toMatch(/^\w/u);
            expect(mitglied.nachname).toMatch(/^\w/u);
            expect(mitglied.email).toMatch(/.+@.+/u);
        });
    });

    test.concurrent.each(nachnameArray)(
        'Mitglieder mit Teil-Nachname %s',
        async (nachname) => {
            // given
            const query: GraphQLQuery = {
                query: `
                    {
                        mitglieder(input: { nachname: "${nachname}" }) {
                            vorname
                            nachname
                        }
                    }
                `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            expect(response.status).toBe(200);

            const { data, errors } =
                (await response.json()) as MitgliederSuccessType;

            expect(errors).toBeUndefined();
            expect(data.mitglieder).not.toHaveLength(0);

            data.mitglieder
                .map((mitglied) => mitglied.nachname)
                .forEach((nachnameValue) =>
                    expect(nachnameValue.toLowerCase()).toStrictEqual(
                        expect.stringContaining(nachname.toLowerCase()),
                    ),
                );
        },
    );

    test.concurrent.each(nachnameNichtVorhanden)(
        'Mitglieder zu nicht-vorhandenem Nachname %s',
        async (nachname) => {
            // given
            const query: GraphQLQuery = {
                query: `
                    {
                        mitglieder(input: { nachname: "${nachname}" }) {
                            vorname
                            nachname
                        }
                    }
                `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            expect(response.status).toBe(200);

            const { data, errors } =
                (await response.json()) as MitgliederErrorsType;

            expect(data).toBeNull();
            expect(errors).toHaveLength(1);
            expect(errors[0]!.extensions.code).toBe('BAD_USER_INPUT');
        },
    );

    test.concurrent.each(emails)(
        'Mitglied mit Email %s',
        async (email) => {
            // given
            const query: GraphQLQuery = {
                query: `
                    {
                        mitglieder(input: { email: "${email}" }) {
                            email
                            vorname
                            nachname
                        }
                    }
                `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            expect(response.status).toBe(200);

            const { data, errors } =
                (await response.json()) as MitgliederSuccessType;

            expect(errors).toBeUndefined();
            expect(data.mitglieder).toHaveLength(1);
            expect(data.mitglieder[0]!.email).toBe(email);
        },
    );

    test.concurrent('Mitglieder mit Geschlecht MAENNLICH', async () => {
        // given
        const query: GraphQLQuery = {
            query: `
                {
                    mitglieder(input: { geschlecht: MAENNLICH }) {
                        vorname
                        nachname
                        geschlecht
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        expect(response.status).toBe(200);

        const { data, errors } =
            (await response.json()) as MitgliederSuccessType;

        expect(errors).toBeUndefined();
        expect(data.mitglieder).not.toHaveLength(0);

        data.mitglieder.forEach((mitglied) =>
            expect(mitglied.geschlecht).toBe('MAENNLICH'),
        );
    });

    test.concurrent('Mitglieder mit ungueltiger Enum-Art', async () => {
        // given
        const query: GraphQLQuery = {
            query: `
                {
                    mitglieder(input: { geschlecht: UNGUELTIG }) {
                        vorname
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        expect(response.status).toBe(400);

        const { errors } = (await response.json()) as MitgliederErrorsType;

        expect(errors).toHaveLength(1);
        expect(errors[0]!.extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
    });
});
