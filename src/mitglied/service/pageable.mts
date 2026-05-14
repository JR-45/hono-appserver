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

export type Pageable = {
    readonly number: number;
    readonly size: number;
};

const DEFAULT_PAGE_SIZE = 20;

export const createPageable = ({
    number,
    size,
}: {
    number?: string | undefined;
    size?: string | undefined;
}): Pageable => {
    const pageNumber =
        typeof number === 'undefined' ? 0 : Number.parseInt(number, 10);
    const pageSize =
        typeof size === 'undefined'
            ? DEFAULT_PAGE_SIZE
            : Number.parseInt(size, 10);
    return {
        number: Number.isNaN(pageNumber) ? 0 : pageNumber,
        size: Number.isNaN(pageSize) ? DEFAULT_PAGE_SIZE : pageSize,
    };
};
