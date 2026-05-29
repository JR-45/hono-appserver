// oxlint-disable max-lines, max-lines-per-function
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
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    GRAPHQL_RESPONSE_JSON,
    POST,
    graphqlURL,
} from '../constants.mts';
import { beforeAll, describe, expect, test } from 'vitest';
import { type ErrorsType } from './query.test.mts';
import { type GraphQLQuery } from './graphql.mts';
import { getToken } from './token.mts';

// -----------------------------------------------------------------------------
// T y p e n
// -----------------------------------------------------------------------------
type CreateSuccessType = {
    data: { create: { id: string } };
    errors?: undefined;
};
type CreateErrorsType = { data: { create: null }; errors: ErrorsType };

type UpdateSuccessType = {
    data: { update: { version: number } };
    errors?: undefined;
};
type UpdateErrorsType = { data: { update: null }; errors: ErrorsType };

type DeleteSuccessType = {
    data: { delete: { success: boolean } };
    errors?: undefined;
};
type DeleteErrorsType = { data: { delete: null }; errors: ErrorsType };

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idLoeschen = '50';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('GraphQL Mutations', () => {
    let token: string;
    let tokenUser: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
        tokenUser = await getToken('user', 'p');
    });

    // -------------------------------------------------------------------------
    test('Neues Mitglied', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            vorname: "Francis Gary",
                            nachname: "Powers",
                            email: "gary.powers@cia.gov",
                            geburtsdatum: "1929-08-17",
                            telefonnummer: "+1 202 5551960",
                            geschlecht: MAENNLICH,
                            mitgliedsstatus: AKTIV,
                            beitrittsdatum: "2026-01-01",
                            interessen: ["SACHBUCH", "BIOGRAFIE"],
                            ausweis: {
                                ausstellungsdatum: "2026-01-01",
                                ablaufdatum: "2028-01-01"
                            }
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        expect(response.status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as CreateSuccessType;

        expect(errors).toBeUndefined();
        expect(data).toBeDefined();
        expect(parseInt(data.create.id, 10)).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    test('Neues Mitglied mit ungueltigen Daten', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            vorname: "",
                            nachname: "",
                            email: "keine-email",
                            geschlecht: MAENNLICH,
                            mitgliedsstatus: AKTIV
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        expect(response.status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as CreateErrorsType;

        expect(data).toBeNull();
        expect(errors).toHaveLength(1);
        expect(errors[0]!.extensions.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('Neues Mitglied ohne Token', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            vorname: "Test",
                            nachname: "User",
                            email: "test.notoken@example.com",
                            mitgliedsstatus: AKTIV
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        expect(response.status).toBe(200);

        const { data, errors } = (await response.json()) as CreateErrorsType;

        expect(data).toBeNull();
        expect(errors).toHaveLength(1);
        expect(errors[0]!.extensions.code).toBe('UNAUTHENTICATED');
    });

    // -------------------------------------------------------------------------
    test('Neues Mitglied mit bereits existierender E-Mail', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            vorname: "Duplikat",
                            nachname: "Email",
                            email: "admin@acme.com",
                            mitgliedsstatus: AKTIV
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        expect(response.status).toBe(200);

        const { data, errors } = (await response.json()) as CreateErrorsType;

        expect(data).toBeNull();
        expect(errors).toHaveLength(1);
        expect(errors[0]!.extensions.code).toBe('BAD_USER_INPUT');
        expect(errors[0]!.message).toStrictEqual(
            expect.stringContaining('E-Mail'),
        );
    });

    // -------------------------------------------------------------------------
    test('Mitglied aktualisieren', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "30",
                            version: 0,
                            vorname: "Victor",
                            nachname: "Osimhen",
                            email: "gala1905.updated@acme.edu",
                            geschlecht: MAENNLICH,
                            mitgliedsstatus: AKTIV
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        expect(response.status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as UpdateSuccessType;

        expect(errors).toBeUndefined();
        expect(data.update.version).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    test('Nicht-vorhandenes Mitglied aktualisieren', async () => {
        // given
        const id = '999999';
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${id}",
                            version: 0,
                            vorname: "Ghost",
                            nachname: "User",
                            email: "ghost@example.com",
                            mitgliedsstatus: AKTIV
                        }
                    ) {
                        version
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        expect(response.status).toBe(200);

        const { data, errors } = (await response.json()) as UpdateErrorsType;

        expect(data.update).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors;
        expect(error!.path![0]).toBe('update');
        expect(error!.extensions.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('Mitglied loeschen', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}") {
                        success
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        expect(response.status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as DeleteSuccessType;

        expect(errors).toBeUndefined();
        expect(data.delete.success).toBe(true);
    });

    // -------------------------------------------------------------------------
    test('Mitglied loeschen als "user" (FORBIDDEN)', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}") {
                        success
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${tokenUser}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        expect(response.status).toBe(200);

        const { data, errors } = (await response.json()) as DeleteErrorsType;

        expect(data.delete).toBeNull();
        expect(errors).toHaveLength(1);
        expect(errors[0]!.extensions.code).toBe('FORBIDDEN');
    });
});
