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

import { type Context } from 'hono';
import { type ContentfulStatusCode } from 'hono/utils/http-status';

export const badRequest = 400 as const;
export const unauthorized = 401 as const;
export const forbidden = 403 as const;
export const preconditionFailed = 412 as const;
export const preconditionRequired = 428 as const;
export const unprocessableContent = 422 as const;

export const createProblemDetails = (
    c: Context,
    status: number,
    detail: unknown,
) => {
    return c.json(
        {
            type: 'about:blank',
            status,
            detail,
        },
        status as ContentfulStatusCode,
    );
};
