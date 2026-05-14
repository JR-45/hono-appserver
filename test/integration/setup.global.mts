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
// along with this program. If not, see <https://www.gnu.org/licenses/\>.

// https://vitest.dev/config/\#globalsetup

import axios from 'axios';
import { AUTHORIZATION, BEARER, baseURL } from './constants.mjs';
import { getToken } from './token.mjs';

const dbPopulate = async (token: string) => {
  const url = `${baseURL}/dev/db_populate`;

  const response = await axios.post(url, undefined, {
    headers: {
      [AUTHORIZATION]: `${BEARER} ${token}`,
    },
  });

  if (response.data.db_populate !== 'ok') {
    throw new Error('Fehler bei POST /dev/db_populate');
  }
  console.log('DB wurde neu geladen');
};

// https://vitest.dev/config/\#globalsetup
// oxlint-disable-next-line import/no-default-export
export default async function setup() {
  const token = await getToken('admin', 'p');
  console.log(`setup: token=${token}`);
  await dbPopulate(token);
}
