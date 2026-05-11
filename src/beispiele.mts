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

// Aufruf:  bun i
//          bun --env-file=.env prisma generate
//
//          bun --env-file=.env src\beispiele.mts

import process from 'node:process';
import { styleText } from 'node:util';
import { PrismaPg } from '@prisma/adapter-pg';
import { prismaQueryInsights } from '@prisma/sqlcommenter-query-insights';
import {
    PrismaClient,
    type Mitglied,
    type Prisma,
} from './generated/prisma/client.ts';

let message = styleText(['black', 'bgWhite'], 'Node version');
console.log(`${message}=${process.version}`);
message = styleText(['black', 'bgWhite'], 'DATABASE_URL');
console.log(`${message}=${process.env['DATABASE_URL']}`);
console.log();

// "named parameter" durch JSON-Objekt
const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL'],
});

// union type
const log: (Prisma.LogLevel | Prisma.LogDefinition)[] = [
    {
        // siehe unten: prisma.$on('query', ...);
        emit: 'event',
        level: 'query',
    },
    'info',
    'warn',
    'error',
];

// PrismaClient passend zur Umgebungsvariable DATABASE_URL in ".env"
// d.h. mit PostgreSQL-User "mitglied" und Schema "mitglied"
const prisma = new PrismaClient({
    // shorthand property
    adapter,
    errorFormat: 'pretty',
    log,
    // Kommentar zu Log-Ausgabe:
    // /*prismaQuery='Mitglied.findMany%3A...
    comments: [prismaQueryInsights()],
});
prisma.$on('query', (e) => {
    message = styleText('green', `Query: ${e.query}`);
    console.log(message);
    message = styleText('cyan', `Duration: ${e.duration} ms`);
    console.log(message);
});

export type MitgliedMitAusweisUndAusleihen = Prisma.MitgliedGetPayload<{
    include: {
        ausweis: true;
        ausleihen: true;
    };
}>;

// Operationen mit dem Model "Mitglied"
try {
    await prisma.$connect();

    // Das Resultat ist null, falls kein Datensatz gefunden
    const mitglied: Mitglied | null = await prisma.mitglied.findUnique({
        where: { id: 1 },
    });
    message = styleText(['black', 'bgWhite'], 'mitglied');
    console.log(`${message} = %j`, mitglied);
    console.log();

    // SELECT *
    // FROM   mitglied
    // JOIN   ausweis ON mitglied.id = ausweis.mitglied_id
    // WHERE  ausweis.ablaufdatum >= '2027-01-01' AND ausweis.ablaufdatum <= '2027-12-31'
    const mitglieder: MitgliedMitAusweisUndAusleihen[] = await prisma.mitglied.findMany({
        where: {
            ausweis: {
                // https://www.prisma.io/docs/orm/prisma-client/queries/filtering-and-sorting#filter-on-relations
                ablaufdatum: {
                    // https://www.prisma.io/docs/orm/reference/prisma-client-reference#filter-conditions-and-operators
                    gte: new Date('2027-01-01'),
                    lte: new Date('2027-12-31'),
                },
            },
        },
        // Fetch-Join mit Ausweis und Ausleihen
        include: {
            ausweis: true,
            ausleihen: true,
        },
    });
    message = styleText(['black', 'bgWhite'], 'mitglieder');
    console.log(`${message} = %j`, mitglieder);
    console.log();

    // higher-order function und arrow function
    const ausleihen = mitglieder.map((b) => b.ausleihen);
    message = styleText(['black', 'bgWhite'], 'ausleihen');
    console.log(`${message} = %j`, ausleihen);
    console.log();

    // union type
    const ausweis = mitglieder.map((b) => b.ausweis?.ablaufdatum);
    message = styleText(['black', 'bgWhite'], 'ausweis');
    console.log(`${message} = %j`, ausweis);
    console.log();

    // Pagination
    const mitgliederPage2: Mitglied[] = await prisma.mitglied.findMany({
        skip: 2,
        take: 2,
    });
    message = styleText(['black', 'bgWhite'], 'mitgliederPage2');
    console.log(`${message} = %j`, mitgliederPage2);
    console.log();
} finally {
    await prisma.$disconnect();
}

// PrismaClient mit PostgreSQL-User "postgres", d.h. mit Administrationsrechten
const adapterAdmin = new PrismaPg({
    connectionString: process.env['DATABASE_URL_ADMIN'],
});
const prismaAdmin = new PrismaClient({ adapter: adapterAdmin });
try {
    await prismaAdmin.$connect();

    const mitgliederAdmin: Mitglied[] = await prismaAdmin.mitglied.findMany({
        where: {
            ausweis: {
                ablaufdatum: {
                    gte: new Date('2027-01-01'),
                    lte: new Date('2027-12-31'),
                },
            },
        },
    });
    message = styleText(['black', 'bgWhite'], 'mitgliederAdmin');
    console.log(`${message} = ${JSON.stringify(mitgliederAdmin)}`);
} finally {
    await prismaAdmin.$disconnect();
}
