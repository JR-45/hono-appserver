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
// along with this program. If not, see <http://www.gnu.org/licenses/\>.

import { z } from 'zod';

const MitgliedComplete = z.strictObject({
    id: z.union([z.number().int().gt(0), z.string().regex(/^[1-9]\d*$/u)]),
    version: z.int().gte(0),
    vorname: z.string().regex(/^\w.*/u).max(40),
    nachname: z.string().regex(/^\w.*/u).max(40),
    email: z.string().email({ message: 'Ungültige E-Mail-Adresse' }),
    geburtsdatum: z.coerce.date().optional(),
    telefonnummer: z.string().max(20).optional(),
    geschlecht: z.enum(['MAENNLICH', 'WEIBLICH', 'DIVERS']).optional(),
    mitgliedsstatus: z.enum(['AKTIV', 'INAKTIV', 'GESPERRT']).optional(),
    beitrittsdatum: z.coerce.date().optional(),
    interessen: z.array(z.string()).optional(),

    ausweis: z
        .strictObject({
            ausstellungsdatum: z.coerce.date(),
            ablaufdatum: z.coerce.date(),
        })
        .optional(),
    ausleihen: z
        .array(
            z.strictObject({
                ausleihdatum: z.coerce.date(),
                rueckgabedatum: z.coerce.date(),
            }),
        )
        .optional(),
});

export const MitgliedNeuSchema = MitgliedComplete.omit({
    id: true,
    version: true,
}).readonly();

export const MitgliedUpdateSchema = MitgliedComplete.omit({
    id: true,
    version: true,
    ausweis: true,
    ausleihen: true,
}).readonly();

export const MitgliedUpdateGraphQLSchema = MitgliedComplete.omit({
    ausweis: true,
    ausleihen: true,
}).readonly();

export type MitgliedNeuType = z.infer<typeof MitgliedNeuSchema>;
export type MitgliedUpdateType = z.infer<typeof MitgliedUpdateSchema>;
