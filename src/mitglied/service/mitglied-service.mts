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

import { type MitgliedFile, type Prisma } from '../../generated/prisma/client.ts';
import { type Suchparameter, suchparameterNamen } from './suchparameter.mts';
import { type MitgliedInclude } from '../../generated/prisma/models/Mitglied.ts';
import { NotFoundError } from './errors.mts';
import { type Pageable } from './pageable.mts';
import { type Slice } from './slice.mts';
import { buildWhere } from './where-builder.mts';
import { getLogger } from '../../logger/logger.mts';
import { prismaClient } from '../../config/prisma-client.mts';

// Typdefinition für `findById`
type FindByIdParams = {
  readonly id: number;
  readonly mitAusleihen?: boolean;
};

export type MitgliedMitAusweis = Prisma.MitgliedGetPayload<{
  include: { ausweis: true };
}>;

export type MitgliedMitAusweisUndAusleihen = Prisma.MitgliedGetPayload<{
  include: {
    ausweis: true;
    ausleihen: true;
  };
}>;

export class MitgliedService {
  static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

  readonly #includeAusweis: MitgliedInclude = { ausweis: true };
  readonly #includeAusweisUndAusleihen: MitgliedInclude = {
    ausweis: true,
    ausleihen: true,
  };

  readonly #logger = getLogger(MitgliedService.name);

  // Rueckgabetyp Promise bei asynchronen Funktionen
  //    ab ES2015
  //    vergleiche Task<> bei C#
  // Status eines Promise:
  //    Pending: das Resultat ist noch nicht vorhanden, weil die asynchrone
  //             Operation noch nicht abgeschlossen ist
  //    Fulfilled: die asynchrone Operation ist abgeschlossen und
  //               das Promise-Objekt hat einen Wert
  //    Rejected: die asynchrone Operation ist fehlgeschlagen and das
  //              Promise-Objekt wird nicht den Status "fulfilled" erreichen.
  //              Im Promise-Objekt ist dann die Fehlerursache enthalten.

  /**
   * Ein Mitglied asynchron anhand seiner ID suchen
   * @param id ID des gesuchten Mitglieds
   * @returns Das gefundene Mitglied in einem Promise aus ES2015.
   * @throws NotFoundError falls kein Mitglied mit der ID existiert
   */
  // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
  async findById({
    id,
    mitAusleihen,
  }: FindByIdParams): Promise<Readonly<MitgliedMitAusweisUndAusleihen>> {
    this.#logger.debug('findById: id=%d', id);

    // Das Resultat ist null, falls kein Datensatz gefunden
    // Lesen: Keine Transaktion erforderlich
    // "include":
    // - referenzierte Daten werden mitgeladen
    // - keine Konfiguration fuer Eager- oder Lazy-Fetching
    // - keine Proxy-Objekte durch evtl. Lazy-Fetching
    // - keine DTO-Klassen mit weggelassenen nicht geladenen Properties
    const include = mitAusleihen ? this.#includeAusweisUndAusleihen : this.#includeAusweis;
    const mitglied: MitgliedMitAusweisUndAusleihen | null = await prismaClient.mitglied.findUnique({
      where: { id },
      include,
    });
    if (mitglied === null) {
      this.#logger.debug('Es gibt kein Mitglied mit der ID %d', id);
      throw new NotFoundError(`Es gibt kein Mitglied mit der ID ${id}.`);
    }

    this.#logger.debug('findById: mitglied=%o', mitglied);
    return mitglied;
  }

  /**
   * Binärdatei zu einem Mitglied suchen.
   * @param mitgliedId ID des zugehörigen Mitglieds.
   * @returns Binärdatei oder undefined als Promise.
   */
  async findFileByMitgliedId(mitgliedId: number): Promise<Readonly<MitgliedFile> | undefined> {
    this.#logger.debug('findFileByMitgliedId: mitgliedId=%d', mitgliedId);
    const mitgliedFile: MitgliedFile | null = await prismaClient.mitgliedFile.findUnique({
      where: { mitgliedId },
    });
    if (mitgliedFile === null) {
      this.#logger.debug('findFileByMitgliedId: Keine Datei gefunden');
      return;
    }

    this.#logger.debug(
      'findFileByMitgliedId: id=%s, byteLength=%d, filename=%s, mimetype=%s, mitgliedId=%d',
      mitgliedFile.id,
      mitgliedFile.data.byteLength,
      mitgliedFile.filename,
      mitgliedFile.mimetype,
      mitgliedFile.mitgliedId,
    );

    return mitgliedFile;
  }

  /**
   * Mitglieder asynchron suchen.
   * @param suchparameter JSON-Objekt mit Suchparameter.
   * @param pageable Maximale Anzahl an Datensätzen und Seitennummer.
   * @returns Ein JSON-Array mit den gefundenen Mitgliedern.
   * @throws NotFoundError falls keine Mitglieder gefunden wurden.
   */
  async find(
    suchparameter: Suchparameter | null,
    pageable: Pageable,
  ): Promise<Readonly<Slice<Readonly<MitgliedMitAusweis>>>> {
    this.#logger.debug(
      'find: suchparameter=%s, pageable=%o',
      JSON.stringify(suchparameter),
      pageable,
    );

    // Keine Suchparameter?
    if (suchparameter === null) {
      return await this.#findAll(pageable);
    }
    const keys = Object.keys(suchparameter);
    if (keys.length === 0) {
      return await this.#findAll(pageable);
    }

    // Falsche Namen fuer Suchparameter?
    if (!this.#checkKeys(keys) || !this.#checkEnums(suchparameter)) {
      this.#logger.debug('Ungueltige Suchparameter');
      throw new NotFoundError('Ungueltige Suchparameter');
    }

    // Das Resultat ist eine leere Liste, falls nichts gefunden
    // Lesen: Keine Transaktion erforderlich
    const where = buildWhere(suchparameter);
    const { number, size } = pageable;
    const mitglieder: MitgliedMitAusweis[] = await prismaClient.mitglied.findMany({
      where,
      skip: number * size,
      take: size,
      include: this.#includeAusweis,
    });
    if (mitglieder.length === 0) {
      this.#logger.debug('find: Keine Mitglieder gefunden');
      throw new NotFoundError(
        `Keine Mitglieder gefunden: ${JSON.stringify(suchparameter)}, Seite ${pageable.number}}`,
      );
    }
    const totalElements = await this.count(where);
    return this.#createSlice(mitglieder, totalElements);
  }

  /**
   * Anzahl der gefundenen Mitglieder zurückliefern.
   * @param WHERE-Klausel der eigentlichen Suche.
   * @returns Anzahl der gefundenen Mitglieder.
   */
  async count(where?: Prisma.MitgliedWhereInput) {
    this.#logger.debug('count: where=%o', where ?? 'undefined');
    const { count } = prismaClient.mitglied;
    const anzahl = where === undefined ? await count() : await count({ where });
    this.#logger.debug('count: %d', anzahl);
    return anzahl;
  }

  async #findAll(pageable: Pageable): Promise<Readonly<Slice<MitgliedMitAusweis>>> {
    const { number, size } = pageable;
    const mitglieder: MitgliedMitAusweis[] = await prismaClient.mitglied.findMany({
      skip: number * size,
      take: size,
      include: this.#includeAusweis,
    });
    if (mitglieder.length === 0) {
      this.#logger.debug('#findAll: Keine Mitglieder gefunden');
      throw new NotFoundError(`Ungueltige Seite "${number}"`);
    }
    const totalElements = await this.count();
    return this.#createSlice(mitglieder, totalElements);
  }
  #createSlice(
    mitglieder: MitgliedMitAusweis[],
    totalElements: number,
  ): Readonly<Slice<MitgliedMitAusweis>> {
    const mitgliedSlice: Slice<MitgliedMitAusweis> = {
      content: mitglieder,
      totalElements,
    };
    this.#logger.debug('createSlice: mitgliedSlice=%o', mitgliedSlice);
    return mitgliedSlice;
  }
  #checkKeys(keys: string[]) {
    this.#logger.debug('#checkKeys: keys=%o', keys);
    let validKeys = true;
    keys.forEach((key) => {
      if (!suchparameterNamen.includes(key)) {
        this.#logger.debug('#checkKeys: ungueltiger Suchparameter "%s"', key);
        validKeys = false;
      }
    });
    return validKeys;
  }
  #checkEnums(suchparameter: Suchparameter) {
    const { geschlecht, mitgliedsstatus } = suchparameter;
    this.#logger.debug(
      '#checkEnums: geschlecht=%s, mitgliedsstatus=%s',
      geschlecht,
      mitgliedsstatus,
    );
    const validGeschlecht =
      geschlecht === undefined ||
      geschlecht === 'MAENNLICH' ||
      geschlecht === 'WEIBLICH' ||
      geschlecht === 'DIVERS';
    const validMitgliedsstatus =
      mitgliedsstatus === undefined || mitgliedsstatus === 'AKTIV' || mitgliedsstatus === 'INAKTIV';
    return validGeschlecht && validMitgliedsstatus;
  }
}
