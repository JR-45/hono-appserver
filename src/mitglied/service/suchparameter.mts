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
 * Das Modul besteht aus Typdefinitionen für die Suche in `MitgliedService`.
 * @packageDocumentation
 */

import { type Geschlecht, type Mitgliedsstatus } from '../../generated/prisma/enums.ts';

export type Suchparameter = {
  readonly vorname?: string;
  readonly nachname?: string;
  readonly email?: string;
  readonly geschlecht?: Geschlecht;
  readonly mitgliedsstatus?: Mitgliedsstatus;
  readonly beitrittsdatum?: string;
};

export const suchparameterNamen = [
  'vorname',
  'nachname',
  'email',
  'geschlecht',
  'mitgliedsstatus',
  'beitrittsdatum',
];
