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
    type MitgliedType,
    type ID,
    type SuchParameterInput,
    toMitgliedType,
    toSuchparameter,
} from './types.mts';
import {
    type MitgliedMitAusweis,
    type MitgliedMitAusweisUndAusleihen,
} from '../service/mitglied-service.mts';
import { GraphQLError } from 'graphql';
import { NotFoundError } from '../service/errors.mts';
import { type Slice } from '../service/slice.mts';
import { container } from '../../container.mts';
import { createPageable } from '../service/pageable.mts';
import { getLogger } from '../../logger/logger.mts';

const logger = getLogger('query-handler', 'file');

export const mitgliedHandler = async (id: ID) => {
    logger.debug('mitgliedHandler: id=%s', id);
    const idNumber = Number.parseInt(id, 10);
    if (Number.isNaN(idNumber)) {
        throw new GraphQLError(`Ungueltige ID: ${id}`, {
            extensions: { code: 'BAD_USER_INPUT' },
        });
    }
    let mitglied: MitgliedType;
    try {
        const mitgliedDB: MitgliedMitAusweisUndAusleihen =
            await container.mitgliedService.findById({
                id: idNumber,
            });
        mitglied = toMitgliedType(mitgliedDB);
    } catch (err) {
        if (err instanceof NotFoundError) {
            logger.debug('mitgliedHandler: Kein Mitglied gefunden.');
            throw new GraphQLError(err.message, {
                extensions: {
                    code: 'BAD_USER_INPUT',
                },
            });
        }
        const { message } = err as Error;
        throw new GraphQLError(message, {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
            },
        });
    }
    logger.debug('mitgliedHandler: result=%o', mitglied);
    return mitglied;
};

export const mitgliederHandler = async (
    input?: SuchParameterInput | undefined,
) => {
    logger.debug('mitgliederHandler: input=%o', input ?? 'undefined');
    const pageable = createPageable({});
    const suchparameter = toSuchparameter(input);
    let mitgliederSlice: Readonly<Slice<Readonly<MitgliedMitAusweis>>>;
    try {
        mitgliederSlice = await container.mitgliedService.find(
            suchparameter,
            pageable,
        );
    } catch (err) {
        if (err instanceof NotFoundError) {
            logger.debug('Keine Mitglieder gefunden.');
            throw new GraphQLError(err.message, {
                extensions: {
                    code: 'BAD_USER_INPUT',
                },
            });
        }
        const { message } = err as Error;
        throw new GraphQLError(message, {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
            },
        });
    }
    logger.debug('mitgliederHandler: mitgliederSlice=%o', mitgliederSlice);
    const result = mitgliederSlice.content.map((m) =>
        toMitgliedType(m as MitgliedMitAusweisUndAusleihen),
    );
    logger.debug('mitgliederHandler: result=%o', result);
    return result;
};
