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
    type MitgliedNeuInput,
    type MitgliedUpdateInput,
    type CreatePayload,
    type DeletePayload,
    type ID,
    type UpdatePayload,
    toCreate,
    toID,
    toInt,
    toNumber,
    toUpdate,
} from './types.mts';
import {
    MitgliedNeuSchema,
    MitgliedUpdateGraphQLSchema,
} from '../router/mitglied-validation.mts';
import { GraphQLError } from 'graphql';
import { EmailExistsError, NotFoundError } from '../service/errors.mts';
import { container } from '../../container.mts';
import { getLogger } from '../../logger/logger.mts';

const logger = getLogger('mutation-handler', 'file');
const { mitgliedWriteService, keycloakService } = container;

// -----------------------------------------------------------------------------
// N e u a n l e g e n
// -----------------------------------------------------------------------------
const validateMitgliedNeu = (mitglied: MitgliedNeuInput) => {
    try {
        MitgliedNeuSchema.parse(mitglied);
    } catch (err) {
        if (err instanceof Error) {
            const { message } = err;
            if (err.name === 'ZodError') {
                throw new GraphQLError(message, {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                    },
                });
            } else {
                throw new GraphQLError(message, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                    },
                });
            }
        } else {
            throw new GraphQLError('Unbekannter Fehler', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                },
            });
        }
    }

    logger.debug('validateMitgliedNeu: ok');
};

export const createHandler = async (
    input: MitgliedNeuInput,
): Promise<CreatePayload> => {
    logger.debug('createHandler: input=%o', input);

    validateMitgliedNeu(input);

    const mitgliedCreate = toCreate(input);
    logger.debug('createHandler: mitgliedCreate=%o', mitgliedCreate);

    let id: number;
    try {
        id = await mitgliedWriteService.create(mitgliedCreate);
    } catch (err) {
        if (err instanceof EmailExistsError) {
            throw new GraphQLError(err.message, {
                extensions: { code: 'BAD_USER_INPUT' },
            });
        }
        throw new GraphQLError((err as Error).message ?? 'Fehler beim Anlegen', {
            extensions: { code: 'INTERNAL_SERVER_ERROR' },
        });
    }

    logger.debug('createHandler: id=%d', id);
    return { id: toID(id) };
};

// -----------------------------------------------------------------------------
// A e n d e r n
// -----------------------------------------------------------------------------
const validateMitgliedUpdate = (mitglied: MitgliedUpdateInput) => {
    try {
        MitgliedUpdateGraphQLSchema.parse(mitglied);
    } catch (err) {
        if (err instanceof Error) {
            const { message } = err;
            if (err.name === 'ZodError') {
                throw new GraphQLError(message, {
                    extensions: {
                        code: 'BAD_USER_INPUT',
                    },
                });
            } else {
                throw new GraphQLError(message, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                    },
                });
            }
        } else {
            throw new GraphQLError('Unbekannter Fehler', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                },
            });
        }
    }

    logger.debug('validateMitgliedUpdate: ok');
};

export const updateHandler = async (
    input: MitgliedUpdateInput,
): Promise<UpdatePayload> => {
    logger.debug('updateHandler: input=%o', input);

    validateMitgliedUpdate(input);

    const mitgliedUpdate = toUpdate(input);
    logger.debug('updateHandler: mitgliedUpdate=%o', mitgliedUpdate);

    let version: number | undefined;
    try {
        version = await mitgliedWriteService.update({
            id: toNumber(input.id),
            mitglied: mitgliedUpdate,
            version: `"${input.version}"`,
        });
    } catch (err) {
        if (err instanceof NotFoundError) {
            logger.debug('updateHandler: Kein Mitglied gefunden.');
            throw new GraphQLError(err.message, {
                extensions: {
                    code: 'BAD_USER_INPUT',
                },
            });
        }
        throw new GraphQLError((err as Error).message, {
            extensions: {
                code: 'BAD_USER_INPUT',
            },
        });
    }

    logger.debug('updateHandler: version=%s', version);
    return { version: toInt(version ?? 0) };
};

// -----------------------------------------------------------------------------
// L o e s c h e n
// -----------------------------------------------------------------------------
export const deleteHandler = async (id: ID) => {
    logger.debug('deleteHandler: id=%s', id);
    const success = await mitgliedWriteService.delete(toNumber(id));
    const payload: DeletePayload = { success };
    return payload;
};

// -----------------------------------------------------------------------------
// S e c u r i t y
// -----------------------------------------------------------------------------
export const tokenHandler = async ({
    username,
    password,
}: {
    username: string;
    password: string;
}) => {
    logger.debug('tokenHandler: username=%s', username);
    const token = await keycloakService.token({ username, password });
    if (typeof token === 'undefined') {
        throw new GraphQLError('Fehler bei username und/oder Passwort', {
            extensions: {
                code: 'BAD_USER_INPUT',
            },
        });
    }
    logger.debug('tokenHandler: token=%o', token);
    return token;
};
