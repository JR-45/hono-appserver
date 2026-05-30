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

import { createRemoteJWKSet, jwtVerify } from 'jose';
import { GraphQLError } from 'graphql';
import { JOSEError } from 'jose/errors';
import { getLogger } from '../../logger/logger.mts';
import { keycloakConfig } from '../../config/keycloak.mts';

const { issuer, jwksUri, clientId, audience } = keycloakConfig;
const jwks = createRemoteJWKSet(new URL(jwksUri));
const logger = getLogger('graphql/roles-required', 'file');

const getToken = (headers: Headers) => {
    const auth = headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
        throw new GraphQLError('Authorization im Header ist falsch', {
            extensions: {
                code: 'UNAUTHENTICATED',
            },
        });
    }
    const BEARER_PREFIX_LENGTH = 7;
    const token = auth.slice(BEARER_PREFIX_LENGTH);
    logger.debug('getToken: token=%s', token);
    return token;
};

const verifyToken = async (token: string) => {
    try {
        return await jwtVerify(token, jwks, {
            issuer,
            audience,
        });
    } catch (err) {
        logger.debug('verifyToken: verifyResult err=%o', err as any);
        if (err instanceof JOSEError) {
            throw new GraphQLError('Token nicht (mehr) gueltig', {
                extensions: {
                    code: 'UNAUTHENTICATED',
                },
            });
        }

        throw new GraphQLError((err as any).message ?? 'Unbekannter Fehler', {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
            },
        });
    }
};

const getRollen = (payload: any) => {
    const roles = payload?.resource_access?.[clientId]?.roles;
    if (!Array.isArray(roles)) {
        throw new GraphQLError('Erforderliche Rolle nicht vorhanden', {
            extensions: {
                code: 'FORBIDDEN',
            },
        });
    }
    logger.debug('getRollen: roles=%o', roles);
    return roles;
};

export const rolesRequired = async (request: Request, ...roles: string[]) => {
    const token = getToken(request.headers);
    const jwt = await verifyToken(token);

    const { payload } = jwt;
    logger.debug('rolesRequired: payload=%o', payload);

    const rollenToken = getRollen(payload);

    const rolleVorhanden = roles.some((role) => rollenToken.includes(role));
    if (!rolleVorhanden) {
        throw new GraphQLError('Erforderliche Rolle nicht vorhanden', {
            extensions: {
                code: 'FORBIDDEN',
            },
        });
    }

    (request as any).tokenPayload = payload;
};
