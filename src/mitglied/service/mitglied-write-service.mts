// Copyright (C) 2026 - present Jeton Rama & Murat Yahsi, Hochschule Karlsruhe
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
 * Das Modul besteht aus der Klasse {@linkcode MitgliedWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import {
  EmailExistsError,
  NotFoundError,
  VersionInvalidError,
  VersionOutdatedError,
} from './errors.mts';
import { type MitgliedFile, type Prisma } from '../../generated/prisma/client.ts';
import { MitgliedService } from './mitglied-service.mts';
import { getLogger } from '../../logger/logger.mts';
import { prismaClient } from '../../config/prisma-client.mts';

export type MitgliedCreate = Prisma.MitgliedCreateInput;
type MitgliedCreated = Prisma.MitgliedGetPayload<{
  include: {
    ausweis: true;
    ausleihen: true;
  };
}>;

export type MitgliedUpdate = Prisma.MitgliedUpdateInput;
/** Typdefinitionen zum Aktualisieren eines Mitglieds mit `update`. */
export type UpdateParams = {
  /** ID des zu aktualisierenden Mitglieds. */
  readonly id: number | undefined;
  /** Mitglied-Objekt mit den aktualisierten Werten. */
  readonly mitglied: MitgliedUpdate;
  /** Versionsnummer für die zu aktualisierenden Werte. */
  readonly version: string;
};
type MitgliedUpdated = Prisma.MitgliedGetPayload<{}>;

type MitgliedFileCreate = Prisma.MitgliedFileUncheckedCreateInput;
export type MitgliedFileCreated = Prisma.MitgliedFileGetPayload<{}>;

/**
 * Die Klasse `MitgliedWriteService` implementiert den Anwendungskern für das
 * Schreiben von Mitgliedern und greift mit _Prisma_ auf die DB zu.
 */
export class MitgliedWriteService {
  private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

  readonly #readService: MitgliedService;

  readonly #logger = getLogger(MitgliedWriteService.name);

  constructor(readService: MitgliedService) {
    this.#readService = readService;
  }

  /**
   * Ein neues Mitglied soll angelegt werden.
   * @param mitglied Das neu abzulegende Mitglied
   * @returns Die ID des neu angelegten Mitglieds
   * @throws EmailExistsError falls die E-Mail-Adresse bereits existiert
   */
  async create(mitglied: MitgliedCreate) {
    this.#logger.debug('create: mitglied=%o', mitglied);
    await this.#validateCreate(mitglied);

    // Neuer Datensatz mit generierter ID
    let mitgliedDb: MitgliedCreated | undefined;
    await prismaClient.$transaction(async (tx) => {
      mitgliedDb = await tx.mitglied.create({
        data: mitglied,
        include: { ausweis: true, ausleihen: true },
      });
    });

    this.#logger.debug('create: mitgliedDb.id=%s', mitgliedDb?.id);
    return mitgliedDb?.id ?? Number.NaN;
  }

  /**
   * Zu einem vorhandenen Mitglied eine Binärdatei mit z.B. einem Bild abspeichern.
   * @param mitgliedId ID des vorhandenen Mitglieds
   * @param data Bytes der Datei als Buffer Node
   * @param name Dateiname
   * @param size Dateigröße in Bytes
   * @param type MIME-Typ, z.B. image/png
   * @returns Entity-Objekt für `MitgliedFile`
   */
  // oxlint-disable-next-line max-params
  async addFile(
    mitgliedId: number,
    data: Buffer,
    name: string,
    size: number,
    type: string,
  ): Promise<Readonly<MitgliedFile> | undefined> {
    this.#logger.debug('addFile: mitgliedId=%d, filename=%s, size=%d', mitgliedId, name, size);

    let mitgliedFileCreated: MitgliedFileCreated | undefined;
    await prismaClient.$transaction(async (tx) => {
      // Mitglied ermitteln, falls vorhanden
      const mitglied = await tx.mitglied.findUnique({
        where: { id: mitgliedId },
      });
      if (mitglied === null) {
        this.#logger.debug('Es gibt kein Mitglied mit der ID %d', mitgliedId);
        throw new NotFoundError(`Es gibt kein Mitglied mit der ID ${mitgliedId}.`);
      }

      // evtl. vorhandene Datei löschen
      await tx.mitgliedFile.deleteMany({ where: { mitgliedId } });

      const mitgliedFile: MitgliedFileCreate = {
        filename: name,
        data: data as Uint8Array<ArrayBuffer>,
        mimetype: type,
        mitgliedId,
      };
      mitgliedFileCreated = await tx.mitgliedFile.create({ data: mitgliedFile });
    });

    this.#logger.debug(
      'addFile: id=%s, byteLength=%s, filename=%s, mimetype=%s',
      mitgliedFileCreated?.id,
      mitgliedFileCreated?.data.byteLength,
      mitgliedFileCreated?.filename,
      mitgliedFileCreated?.mimetype,
    );
    return mitgliedFileCreated;
  }

  /**
   * Ein vorhandenes Mitglied soll aktualisiert werden. "Destructured" Argument
   * mit id (ID des zu aktualisierenden Mitglieds), mitglied (zu aktualisierendes
   * Mitglied) und version (Versionsnummer für optimistische Synchronisation).
   * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
   * @throws NotFoundException falls kein Mitglied zur ID vorhanden ist
   * @throws VersionInvalidException falls die Versionsnummer ungültig ist
   * @throws VersionOutdatedException falls die Versionsnummer veraltet ist
   */
  // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
  async update({ id, mitglied, version }: UpdateParams) {
    this.#logger.debug('update: id=%s, mitglied=%o, version=%s', id, mitglied, version);
    if (id === undefined) {
      this.#logger.debug('update: Keine gueltige ID');
      throw new NotFoundError(`Es gibt kein Mitglied mit der ID ${id}.`);
    }

    await this.#validateUpdate(id, version);

    mitglied.version = { increment: 1 };
    let mitgliedUpdated: MitgliedUpdated | undefined;
    await prismaClient.$transaction(async (tx) => {
      mitgliedUpdated = await tx.mitglied.update({
        data: mitglied,
        where: { id },
      });
    });
    this.#logger.debug('update: mitgliedUpdated=%s', JSON.stringify(mitgliedUpdated));

    return mitgliedUpdated?.version ?? Number.NaN;
  }

  /**
   * Ein Mitglied wird asynchron anhand seiner ID gelöscht.
   *
   * @param id ID des zu löschenden Mitglieds
   * @returns true, falls das Mitglied vorhanden war und gelöscht wurde. Sonst false.
   */
  async delete(id: number) {
    this.#logger.debug('delete: id=%d', id);

    const mitglied = await prismaClient.mitglied.findUnique({
      where: { id },
    });
    if (mitglied === null) {
      this.#logger.debug('delete: not found');
      return false;
    }

    await prismaClient.$transaction(async (tx) => {
      await tx.mitglied.delete({ where: { id } });
    });

    this.#logger.debug('delete');
    return true;
  }

  async #validateCreate({ email }: Prisma.MitgliedCreateInput): Promise<undefined> {
    this.#logger.debug('#validateCreate: email=%s', email);
    if (email === undefined) {
      this.#logger.debug('#validateCreate: ok');
      return;
    }

    const anzahl = await prismaClient.mitglied.count({ where: { email } });
    if (anzahl > 0) {
      this.#logger.debug('#validateCreate: email existiert: %s', email);
      throw new EmailExistsError(email);
    }
    this.#logger.debug('#validateCreate: ok');
  }

  async #validateUpdate(id: number, versionStr: string) {
    this.#logger.debug('#validateUpdate: id=%d, versionStr=%s', id, versionStr);
    if (!MitgliedWriteService.VERSION_PATTERN.test(versionStr)) {
      throw new VersionInvalidError(versionStr);
    }

    const version = Number.parseInt(versionStr.slice(1, -1), 10);
    const mitgliedDb = await this.#readService.findById({ id });

    if (version < mitgliedDb.version) {
      this.#logger.debug('#validateUpdate: versionDb=%d', version);
      throw new VersionOutdatedError(version);
    }
  }
}
