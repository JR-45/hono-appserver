// Copyright (C) 2025 - present Juergen Zimmermann, Hochschule Karlsruhe
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
// along with this program. If not, see <http://www.gnu.org/licenses/>.

// Aufruf:   bun i
//           bun --env-file=.env prisma generate
//
//           bun --env-file=.env src\beispiele-write.mts

import process from 'node:process';
import { styleText } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { prismaQueryInsights } from '@prisma/sqlcommenter-query-insights';
import { PrismaClient, type Prisma } from './generated/prisma/client.ts';

let message = styleText(
    'yellow',
    `process.env['DATABASE_URL']=${process.env['DATABASE_URL']}`,
);
console.log(message);
console.log();

const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL_ADMIN'],
});

const log: (Prisma.LogLevel | Prisma.LogDefinition)[] = [
    {
        emit: 'event',
        level: 'query',
    },
    'info',
    'warn',
    'error',
];

// PrismaClient fuer DB "mitglied" (siehe Umgebungsvariable DATABASE_URL_ADMIN in ".env")
// d.h. mit PostgreSQL-User "postgres" (Admin) und Schema "mitglied"
const prisma = new PrismaClient({
    adapter,
    errorFormat: 'pretty',
    log,
    // Kommentar zu Log-Ausgabe
    comments: [prismaQueryInsights()],
});
prisma.$on('query', (e) => {
    message = styleText('green', `Query: ${e.query}`);
    console.log(message);
    message = styleText('cyan', `Duration: ${e.duration} ms`);
    console.log(message);
});

const neuesMitglied: Prisma.MitgliedCreateInput = {
    // Spaltentyp "text"
    vorname: 'Max',
    nachname: 'Mustermann',
    email: 'abc@gmail.com',
    // Spaltentyp "integer"
    geburtsdatum: '2025-02-28T00:00:00Z',
    // Spaltentyp "geschlecht('MAENNLICH', 'WEIBLICH', 'DIVERS')"
    geschlecht: 'MAENNLICH',
    // Spaltentyp "text"
    telefonnummer: '1234567890',
    mitgliedsstatus: 'AKTIV',
    // Datum im Format ISO8601 fuer Spaltentyp "date"
    beitrittsdatum: '2025-02-28T00:00:00Z',
    // Spaltentyp "jsonb"
    interessen: ['ROMAN', 'KRIMI'],
    // 1:1-Beziehung
    ausweis: {
        create: {
            ausstellungsdatum: '2025-02-28T00:00:00Z',
            ablaufdatum: '2025-02-28T00:00:00Z',
        },
    },
    // 1:N-Beziehung
    ausleihen: {
        create: [
            {
                ausleihdatum: '2025-02-28T00:00:00Z',
                rueckgabedatum: '2025-02-28T00:00:00Z',
            },
        ],
    },
};
type MitgliedCreated = Prisma.MitgliedGetPayload<{
    include: {
        ausweis: true;
        ausleihen: true;
    };
}>;

const geaendertesMitglied: Prisma.MitgliedUpdateInput = {
    version: { increment: 1 },
    vorname: 'Max',
    nachname: 'Mustermann-Updated',
    email: 'max.updated@gmail.com',
    geburtsdatum: '2025-02-28T00:00:00Z',
    geschlecht: 'MAENNLICH',
    telefonnummer: '0987654321',
    mitgliedsstatus: 'AKTIV',
    beitrittsdatum: '2025-02-28T00:00:00Z',
    interessen: ['ROMAN', 'KRIMI'],
};
type MitgliedUpdated = Prisma.MitgliedGetPayload<{}>; // eslint-disable-line @typescript-eslint/no-empty-object-type

// Schreib-Operationen mit dem Model "Mitglied"
try {
    await prisma.$connect();
    await prisma.$transaction(async (tx) => {
        // Neuer Datensatz mit generierter ID
        const mitgliedDb: MitgliedCreated = await tx.mitglied.create({
            data: neuesMitglied,
            include: { ausweis: true, ausleihen: true },
        });
        message = styleText(['black', 'bgWhite'], 'Generierte ID:');
        console.log(`${message} ${mitgliedDb.id}`);
        console.log();

        // Version +1 wegen "Optimistic Locking" bzw. Vermeidung von "Lost Updates"
        // Neu erstelltes Mitglied aktualisieren
        const mitgliedUpdated: MitgliedUpdated = await tx.mitglied.update({
            data: geaendertesMitglied,
            where: { id: mitgliedDb.id },
        });
        // eslint-disable-next-line require-atomic-updates
        message = styleText(['black', 'bgWhite'], 'Aktualisierte Version:');
        console.log(`${message} ${mitgliedUpdated.version}`);
        console.log();

        // https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions#referential-action-defaults
        // https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/relation-mode
        // Neu erstelltes Mitglied loeschen
        const geloescht = await tx.mitglied.delete({ where: { id: mitgliedDb.id } });
        // eslint-disable-next-line require-atomic-updates
        message = styleText(['black', 'bgWhite'], 'Geloescht:');
        console.log(`${message} ${geloescht.id}`);
    });
} finally {
    await prisma.$disconnect();
}
