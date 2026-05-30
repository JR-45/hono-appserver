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
// along with this program. If not, see <https://www.gnu.org/licenses/\>.

import {
    type ID,
    type MitgliedNeuInput,
    type MitgliedUpdateInput,
    type SuchParameterInput,
    typeDefs,
} from './types.mts';
import {
    createHandler,
    deleteHandler,
    tokenHandler,
    updateHandler,
} from './mutation-handler.mts';
import { createSchema, createYoga } from 'graphql-yoga';
import { mitgliedHandler, mitgliederHandler } from './query-handler.mts';
import { Hono } from 'hono';
import { getLogger } from '../../logger/logger.mts';
import { rolesRequired } from './roles-required.mts';

const logger = getLogger('graphql-app', 'file');
type GraphqlContext = {
    request: Request;
};

// -----------------------------------------------------------------------------
// R e s o l v e r   p a s s e n d   z u m   G r a p h Q L   S c h e m a
// -----------------------------------------------------------------------------
const resolvers = {
    Query: {
        mitglied: (_: unknown, { id }: { id: ID }) => mitgliedHandler(id),
        mitglieder: (_: unknown, { input }: { input?: SuchParameterInput }) =>
            mitgliederHandler(input),
    },
    Mutation: {
        create: async (
            _: unknown,
            { input }: { input: MitgliedNeuInput },
            { request }: GraphqlContext,
        ) => {
            await rolesRequired(request, 'admin', 'user');
            return createHandler(input);
        },
        update: async (
            _: unknown,
            { input }: { input: MitgliedUpdateInput },
            { request }: GraphqlContext,
        ) => {
            await rolesRequired(request, 'admin', 'user');
            return updateHandler(input);
        },
        delete: async (
            _: unknown,
            { id }: { id: ID },
            { request }: GraphqlContext,
        ) => {
            await rolesRequired(request, 'admin');
            return deleteHandler(id);
        },
        token: (
            _: unknown,
            { username, password }: { username: string; password: string },
        ) => tokenHandler({ username, password }),
    },
};

// -----------------------------------------------------------------------------
// Y o g a   S e r v e r   m i t   S c h e m a   e i n s c h l.  R e s o l v e r
// -----------------------------------------------------------------------------
const yogaServer = createYoga({
    schema: createSchema({ typeDefs, resolvers }),
});

// -----------------------------------------------------------------------------
// H o n o   A p p   m i t   Y o g a   S e r v e r
// -----------------------------------------------------------------------------
export const app = new Hono();

app.post('/graphql', async (c) => {
    logger.debug('/graphql');
    const { raw } = c.req;
    const { body } = raw;

    const response = await yogaServer.fetch(raw, { body });

    return c.newResponse(response.body, response);
});

export const graphqlApp = app;
