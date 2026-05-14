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

import {
    type Geschlecht,
    type Mitgliedsstatus,
} from '../../generated/prisma/enums.ts';
import {
    type Prisma,
    type PrismaClient,
} from '../../generated/prisma/client.ts';
import { type Pageable } from './pageable.mts';
import { type Slice } from './slice.mts';

export type MitgliedFile = {
    data: Buffer;
    mimetype: string | undefined;
};

type MitgliedWithRelations = Prisma.MitgliedGetPayload<{
    include: { ausweis: true; ausleihen: true };
}>;

export class MitgliedService {
    static readonly ID_PATTERN = /^\d+$/u;

    readonly #fileStore = new Map<number, MitgliedFile>();
    readonly #prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.#prisma = prisma;
    }

    async findById({ id }: { id: number }): Promise<MitgliedWithRelations> {
        return this.#prisma.mitglied.findUniqueOrThrow({
            where: { id },
            include: { ausweis: true, ausleihen: true },
        });
    }

    async count(): Promise<number> {
        return this.#prisma.mitglied.count();
    }

    async find(
        queryParams: Record<string, string>,
        pageable: Pageable,
    ): Promise<Slice<MitgliedWithRelations>> {
        const { number, size } = pageable;
        const where: Prisma.MitgliedWhereInput = {};

        const { vorname, nachname, email, geschlecht, mitgliedsstatus } =
            queryParams;

        if (vorname !== undefined) {
            where.vorname = { contains: vorname };
        }
        if (nachname !== undefined) {
            where.nachname = { contains: nachname };
        }
        if (email !== undefined) {
            where.email = { contains: email };
        }
        if (geschlecht !== undefined) {
            where.geschlecht = geschlecht as Geschlecht;
        }
        if (mitgliedsstatus !== undefined) {
            where.mitgliedsstatus = mitgliedsstatus as Mitgliedsstatus;
        }

        const [content, totalElements] = await Promise.all([
            this.#prisma.mitglied.findMany({
                where,
                include: { ausweis: true, ausleihen: true },
                skip: number * size,
                take: size,
                orderBy: { nachname: 'asc' },
            }),
            this.#prisma.mitglied.count({ where }),
        ]);

        return { content, totalElements };
    }

    findFileByMitgliedId(id: number): MitgliedFile | undefined {
        return this.#fileStore.get(id);
    }

    storeFile(id: number, file: MitgliedFile): void {
        this.#fileStore.set(id, file);
    }
}
