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

import { type PrismaClient } from '../../generated/prisma/client.ts';
import { type MitgliedService } from './mitglied-service.mts';

export type MitgliedCreate = {
    version: number;
    vorname: string;
    nachname: string;
    email: string;
    geburtsdatum?: Date | null;
    telefonnummer?: string | null;
    geschlecht?: string | null;
    mitgliedsstatus?: string | null;
    beitrittsdatum?: Date | null;
    interessen?: string[];
    ausweis?: {
        create: { ausstellungsdatum: Date; ablaufdatum: Date };
    } | undefined;
    ausleihen: {
        create: { ausleihdatum: Date; rueckgabedatum: Date }[];
    };
};

export type MitgliedUpdate = {
    version: number;
    vorname: string;
    nachname: string;
    email: string;
    geburtsdatum?: Date | null;
    telefonnummer?: string | null;
    geschlecht?: string | null;
    mitgliedsstatus?: string | null;
    beitrittsdatum?: Date | null;
    interessen?: string[];
};

export type MitgliedFileCreated = {
    id: number;
    data: Buffer;
    filename: string;
    mimetype: string;
};

export class MitgliedWriteService {
    readonly #prisma: PrismaClient;
    readonly #mitgliedService: MitgliedService;

    constructor(prisma: PrismaClient, mitgliedService: MitgliedService) {
        this.#prisma = prisma;
        this.#mitgliedService = mitgliedService;
    }

    async create(mitglied: MitgliedCreate): Promise<number> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const created = await this.#prisma.mitglied.create({ data: mitglied as any });
        return created.id;
    }

    async update({
        id,
        mitglied,
        version,
    }: {
        id: number;
        mitglied: MitgliedUpdate;
        version: string;
    }): Promise<number> {
        const versionNumber = Number.parseInt(
            version.replaceAll('"', ''),
            10,
        );
        if (Number.isNaN(versionNumber)) {
            throw new Error(`Ungültige Version: ${version}`);
        }

        const existing = await this.#prisma.mitglied.findUniqueOrThrow({
            where: { id },
            select: { version: true },
        });
        if (existing.version !== versionNumber) {
            throw new Error(
                `Versionskonflikt: erwartet ${versionNumber}, gefunden ${existing.version}`,
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = {
            version: { increment: 1 },
            vorname: mitglied.vorname,
            nachname: mitglied.nachname,
            email: mitglied.email,
            geburtsdatum: mitglied.geburtsdatum,
            telefonnummer: mitglied.telefonnummer,
            geschlecht: mitglied.geschlecht,
            mitgliedsstatus: mitglied.mitgliedsstatus,
            beitrittsdatum: mitglied.beitrittsdatum,
            interessen: mitglied.interessen,
        };

        const updated = await this.#prisma.mitglied.update({
            where: { id },
            data,
        });
        return updated.version;
    }

    async delete(id: number): Promise<void> {
        await this.#prisma.mitglied.delete({ where: { id } });
    }

    async addFile(
        id: number,
        data: Buffer,
        filename: string,
        _size: number,
        mimetype: string,
    ): Promise<MitgliedFileCreated | undefined> {
        const exists = await this.#prisma.mitglied.findUnique({
            where: { id },
            select: { id: true },
        });
        if (exists === null) {
            return undefined;
        }

        this.#mitgliedService.storeFile(id, { data, mimetype });
        return { id, data, filename, mimetype };
    }
}
