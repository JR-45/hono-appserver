// Copyright (C) 2026 - present Murat Yahsi, Hochschule Karlsruhe
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

/**
 * Das Modul besteht aus der Funktion {@linkcode buildWhere}.
 * @packageDocumentation
 */

import { type Geschlecht, type Mitgliedsstatus, Prisma } from '../../generated/prisma/client.ts';
import { type MitgliedWhereInput } from '../../generated/prisma/models/Mitglied.ts';
import { type Suchparameter } from './suchparameter.mts';
import { getLogger } from '../../logger/logger.mts';

/** Typdefinitionen für die Suche mit der Mitglied-ID. */
export type BuildIdParams = {
    /** ID des gesuchten Mitglieds. */
    readonly id: number;
    /** Sollen die Ausleihen mitgeladen werden? */
    readonly mitAusleihen?: boolean;
};

const logger = getLogger('buildWhere', 'func');

/**
 * WHERE-Klausel für die flexible Suche nach Mitgliedern bauen.
 * @param suchparameter JSON-Objekt mit Suchparameter. Bei "vorname" und
 * "nachname" wird mit einem Teilstring gesucht, bei "beitrittsdatum"
 * mit einem Mindestwert.
 * @returns MitgliedWhereInput
 */
// oxlint-disable-next-line max-lines-per-function
export const buildWhere = (suchparameter: Suchparameter) => {
    logger.debug('build: suchparameter=%o', suchparameter);

    const where: MitgliedWhereInput = {};

    Object.entries(suchparameter).forEach(([key, value]) => {
        switch (key) {
            case 'vorname':
                where.vorname = {
                    contains: value as string,
                    mode: Prisma.QueryMode.insensitive,
                };
                break;
            case 'nachname':
                where.nachname = {
                    contains: value as string,
                    mode: Prisma.QueryMode.insensitive,
                };
                break;
            case 'email':
                where.email = { equals: value as string };
                break;
            case 'geschlecht':
                where.geschlecht = { equals: value as Geschlecht };
                break;
            case 'mitgliedsstatus':
                where.mitgliedsstatus = { equals: value as Mitgliedsstatus };
                break;
            case 'beitrittsdatum':
                where.beitrittsdatum = { gte: new Date(value as string) };
                break;
            default:
                break;
        }
    });

    logger.debug('build: where=%o', where);
    return where;
};
