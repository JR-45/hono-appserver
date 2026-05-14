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

import https from 'node:https';
import process from 'node:process';
import axios from 'axios';

const TOKEN_URL =
    process.env['KEYCLOAK_TOKEN_URL'] ??
    'https://localhost:8843/realms/javascript/protocol/openid-connect/token';
const CLIENT_ID =
    process.env['KEYCLOAK_CLIENT_ID'] ?? 'javascript-client';
const CLIENT_SECRET =
    process.env['CLIENT_SECRET'] ??
    'ERROR: Umgebungsvariable CLIENT_SECRET nicht gesetzt!';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export const getToken = async (
    username: string,
    password: string,
): Promise<string> => {
    const body = new URLSearchParams({
        username,
        password,
        grant_type: 'password',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
    });

    const response = await axios.post<{ access_token: string }>(
        TOKEN_URL,
        body.toString(),
        {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            httpsAgent,
        },
    );

    return response.data.access_token;
};
