// oxlint-disable max-lines
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

import {
    type MitgliedCreate,
    type MitgliedUpdate,
} from '../service/mitglied-write-service.mts';
import { type MitgliedMitAusweisUndAusleihen } from '../service/mitglied-service.mts';
import { type Suchparameter } from '../service/suchparameter.mts';

// -----------------------------------------------------------------------------
// I D   u n d   I n t   f u e r   G r a p h Q L
// -----------------------------------------------------------------------------
export type ID = string & { readonly __brand: 'ID' };
export type Int = number & { readonly __brand: 'Int' };

export const toID = (value: string | number): ID => {
    if (typeof value === 'string') {
        return value as ID;
    }
    return value.toString() as ID;
};
export const toInt = (num: number): Int =>
    (Number.isInteger(num) ? num : Math.round(num)) as Int;
export const toNumber = (id: ID): number => Number.parseInt(id, 10);
const toDateOrNull = (dateStr?: string | null): Date | null =>
    typeof dateStr === 'undefined' || dateStr === null
        ? null
        : new Date(dateStr);

// -----------------------------------------------------------------------------
// G r a p h Q L   S c h e m a
// -----------------------------------------------------------------------------
export const typeDefs = /* GraphQL */ `
    "Mitgliederdaten lesen"
    type Query {
        mitglied(id: ID!): Mitglied!
        mitglieder(input: SuchParameterInput): [Mitglied!]!
    }

    "Mitglieder neu anlegen, aktualisieren oder loeschen"
    type Mutation {
        create(input: MitgliedNeuInput!): CreatePayload!
        update(input: MitgliedUpdateInput!): UpdatePayload
        delete(id: ID!): DeletePayload
        token(username: String!, password: String!): TokenPayload
    }

    "Datenschema zu einem Mitglied, das gelesen wird"
    type Mitglied {
        id: ID!
        version: Int!
        vorname: String!
        nachname: String!
        email: String!
        geburtsdatum: String
        telefonnummer: String
        geschlecht: Geschlecht
        mitgliedsstatus: Mitgliedsstatus
        beitrittsdatum: String
        interessen: [String!]
        ausweis: Ausweis
    }

    "Daten zum Ausweis eines Mitglieds"
    type Ausweis {
        ausstellungsdatum: String!
        ablaufdatum: String!
    }

    "Generierte ID bei erfolgreichem Neuanlegen"
    type CreatePayload {
        id: ID!
    }

    "Neue Versionsnummer als Resultat bei erfolgreichem Aktualisieren"
    type UpdatePayload {
        version: Int
    }

    "Flag, ob das Loeschen durchgefuehrt wurde"
    type DeletePayload {
        success: Boolean
    }

    "Access- und Refresh-Token einschliesslich Ablauf-Zeitstempel"
    type TokenPayload {
        access_token: String!
        expires_in: Int!
        refresh_token: String!
        refresh_expires_in: Int!
    }

    "Suchparameter fuer Mitglieder"
    input SuchParameterInput {
        nachname: String
        email: String
        geschlecht: Geschlecht
        mitgliedsstatus: Mitgliedsstatus
    }

    "Daten fuer ein neues Mitglied"
    input MitgliedNeuInput {
        vorname: String!
        nachname: String!
        email: String!
        geburtsdatum: String
        telefonnummer: String
        geschlecht: Geschlecht
        mitgliedsstatus: Mitgliedsstatus
        beitrittsdatum: String
        interessen: [String!]
        ausweis: AusweisInput
        ausleihen: [AusleiheInput!]
    }

    "Daten zum Ausweis eines neuen Mitglieds"
    input AusweisInput {
        ausstellungsdatum: String!
        ablaufdatum: String!
    }

    "Daten zu einer Ausleihe"
    input AusleiheInput {
        ausleihdatum: String!
        rueckgabedatum: String!
    }

    "Daten fuer ein zu aenderndes Mitglied"
    input MitgliedUpdateInput {
        id: ID!
        version: Int!
        vorname: String
        nachname: String
        email: String
        geburtsdatum: String
        telefonnummer: String
        geschlecht: Geschlecht
        mitgliedsstatus: Mitgliedsstatus
        beitrittsdatum: String
        interessen: [String]
    }

    enum Geschlecht {
        MAENNLICH
        WEIBLICH
        DIVERS
    }

    enum Mitgliedsstatus {
        AKTIV
        INAKTIV
    }
`;

// -----------------------------------------------------------------------------
// S u c h e
// -----------------------------------------------------------------------------
export type MitgliedType = {
    id: ID;
    version: number;
    vorname: string;
    nachname: string;
    email: string;
    geburtsdatum?: string;
    telefonnummer?: string;
    geschlecht?: 'MAENNLICH' | 'WEIBLICH' | 'DIVERS';
    mitgliedsstatus?: 'AKTIV' | 'INAKTIV';
    beitrittsdatum?: string;
    interessen?: string[];
    ausweis?: { ausstellungsdatum: string; ablaufdatum: string };
};

export const toMitgliedType = (mitglied: MitgliedMitAusweisUndAusleihen): MitgliedType => {
    const result: MitgliedType = {
        id: toID(mitglied.id),
        version: mitglied.version,
        vorname: mitglied.vorname,
        nachname: mitglied.nachname,
        email: mitglied.email,
        interessen: (mitglied.interessen as string[]) ?? [],
    };

    if (mitglied.geschlecht !== null) {
        result.geschlecht = mitglied.geschlecht;
    }
    if (mitglied.mitgliedsstatus !== null) {
        result.mitgliedsstatus = mitglied.mitgliedsstatus;
    }

    const { geburtsdatum, telefonnummer, beitrittsdatum, ausweis } = mitglied;
    if (geburtsdatum !== null) {
        result.geburtsdatum = geburtsdatum.toISOString();
    }
    if (telefonnummer !== null) {
        result.telefonnummer = telefonnummer;
    }
    if (beitrittsdatum !== null) {
        result.beitrittsdatum = beitrittsdatum.toISOString();
    }
    if (ausweis !== null && ausweis !== undefined) {
        result.ausweis = {
            ausstellungsdatum: ausweis.ausstellungsdatum.toISOString(),
            ablaufdatum: ausweis.ablaufdatum.toISOString(),
        };
    }

    return result;
};

export type SuchParameterInput = {
    nachname?: string;
    email?: string;
    geschlecht?: 'MAENNLICH' | 'WEIBLICH' | 'DIVERS';
    mitgliedsstatus?: 'AKTIV' | 'INAKTIV';
};

export const toSuchparameter = (param?: SuchParameterInput) => {
    if (typeof param === 'undefined') {
        return null;
    }

    const { nachname, email, geschlecht, mitgliedsstatus } = param;
    const suchparameter: Record<string, any> = {};
    if (typeof nachname !== 'undefined') {
        suchparameter['nachname'] = nachname;
    }
    if (typeof email !== 'undefined') {
        suchparameter['email'] = email;
    }
    if (typeof geschlecht !== 'undefined') {
        suchparameter['geschlecht'] = geschlecht;
    }
    if (typeof mitgliedsstatus !== 'undefined') {
        suchparameter['mitgliedsstatus'] = mitgliedsstatus;
    }
    return suchparameter as Suchparameter;
};

// -----------------------------------------------------------------------------
// N e u a n l e g e n
// -----------------------------------------------------------------------------
export type MitgliedNeuInput = {
    vorname: string;
    nachname: string;
    email: string;
    geburtsdatum?: string;
    telefonnummer?: string;
    geschlecht?: 'MAENNLICH' | 'WEIBLICH' | 'DIVERS';
    mitgliedsstatus?: 'AKTIV' | 'INAKTIV';
    beitrittsdatum?: string;
    interessen?: string[];
    ausweis?: { ausstellungsdatum: string; ablaufdatum: string };
    ausleihen?: { ausleihdatum: string; rueckgabedatum: string }[];
};

export const toCreate = (mitglied: MitgliedNeuInput): MitgliedCreate => {
    const {
        vorname,
        nachname,
        email,
        geburtsdatum,
        telefonnummer,
        geschlecht,
        mitgliedsstatus,
        beitrittsdatum,
        interessen,
        ausweis,
        ausleihen,
    } = mitglied;
    const mitgliedCreate: MitgliedCreate = {
        version: 0,
        vorname,
        nachname,
        email,
        geburtsdatum: toDateOrNull(geburtsdatum),
        telefonnummer: telefonnummer ?? null,
        geschlecht: geschlecht ?? null,
        mitgliedsstatus: mitgliedsstatus ?? null,
        beitrittsdatum: toDateOrNull(beitrittsdatum),
        interessen: interessen ?? [],
        ...(ausweis
            ? {
                  ausweis: {
                      create: {
                          ausstellungsdatum: new Date(ausweis.ausstellungsdatum),
                          ablaufdatum: new Date(ausweis.ablaufdatum),
                      },
                  },
              }
            : {}),
        ausleihen: {
            create: (ausleihen ?? []).map((a) => ({
                ausleihdatum: new Date(a.ausleihdatum),
                rueckgabedatum: new Date(a.rueckgabedatum),
            })),
        },
    };
    return mitgliedCreate;
};

export type CreatePayload = {
    readonly id: ID;
};

// -----------------------------------------------------------------------------
// A e n d e r n
// -----------------------------------------------------------------------------
export type MitgliedUpdateInput = Omit<MitgliedNeuInput, 'ausweis' | 'ausleihen'> & {
    id: ID;
    version: Int;
};

export const toUpdate = (mitglied: MitgliedUpdateInput): MitgliedUpdate => {
    const {
        version,
        vorname,
        nachname,
        email,
        geburtsdatum,
        telefonnummer,
        geschlecht,
        mitgliedsstatus,
        beitrittsdatum,
        interessen,
    } = mitglied;
    const mitgliedUpdate: MitgliedUpdate = {
        version,
        vorname,
        nachname,
        email,
        geburtsdatum: toDateOrNull(geburtsdatum),
        telefonnummer: telefonnummer ?? null,
        geschlecht: geschlecht ?? null,
        mitgliedsstatus: mitgliedsstatus ?? null,
        beitrittsdatum: toDateOrNull(beitrittsdatum),
        interessen: interessen ?? [],
    };
    return mitgliedUpdate;
};

export type UpdatePayload = {
    readonly version: Int;
};

// -----------------------------------------------------------------------------
// L o e s c h e n
// -----------------------------------------------------------------------------
export type DeletePayload = {
    readonly success: boolean;
};

// -----------------------------------------------------------------------------
// S e c u r i t y
// -----------------------------------------------------------------------------
export type TokenPayload = {
    readonly access_token: string;
    readonly expires_in: Int;
    readonly refresh_token: string;
    readonly refresh_expires_in: Int;
};
