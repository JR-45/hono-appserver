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

/**
 * Das Modul besteht aus Router für die Verwaltung von Mitgliedern.
 * @packageDocumentation
 */

import { Hono } from 'hono';
import { container } from '../../container.mts';
import { createPage } from './page.mts';
import { createPageable } from '../service/pageable.mts';
import { getLogger } from '../../logger/logger.mts';

const { mitgliedService } = container;

/**
 * Router für die Verwaltung von Mitgliedern.
 */
export const router = new Hono();

const logger = getLogger('mitglied-router', 'file');

// -----------------------------------------------------------------------------
// S u c h e   m i t   P f a d - P a r a m e t e r
// -----------------------------------------------------------------------------
router.get('/:id', async (c) => {
  const { req } = c;
  const accept = req.header('Accept')?.toLowerCase() ?? '*/*';
  if (accept !== '*/*' && !/(json|html)/u.test(accept)) {
    logger.debug('get: Accept=%s', accept);
    return c.body(null, 406);
  }

  const id = req.param('id');
  logger.debug('get: id=%s', id);
  const idNumber = Number.parseInt(id, 10);
  if (Number.isNaN(idNumber)) {
    return c.notFound();
  }

  const mitglied = await mitgliedService.findById({ id: idNumber });

  // ETags
  const ifNonMatch = req.header('If-None-Match');
  const { version } = mitglied;
  if (ifNonMatch === `"${version}"`) {
    logger.debug('get: Not Modified');
    return c.body(null, 304);
  }

  logger.debug('get: version=%d', version);
  const { header, json } = c;
  header('ETag', `"${version}"`);

  logger.debug('get: %o', mitglied);
  return json(mitglied);
});

// -----------------------------------------------------------------------------
// S u c h e   m i t   Q u e r y - P a r a m e t e r
// -----------------------------------------------------------------------------
router.get('/', async (c) => {
  const { req } = c;
  const accept = req.header('Accept')?.toLowerCase() ?? '*/*';
  if (accept !== '*/*' && !/(json|html)/u.test(accept)) {
    logger.debug('get: Accept=%s', accept);
    return c.body(null, 406);
  }

  const queryParams = req.query();
  logger.debug('get: queryParams=%o', queryParams);
  const countOnly = queryParams['count-only'];
  if (typeof countOnly !== 'undefined') {
    const count = await mitgliedService.count();
    logger.debug('get: count=%d', count);
    return c.json({ count });
  }

  const { page, size } = queryParams;
  delete queryParams['page'];
  delete queryParams['size'];
  logger.debug('get: page=%s, size=%s, queryParams=%o', page, size, queryParams);

  const pageable = createPageable({ number: page, size });
  const mitgliederSlice = await mitgliedService.find(queryParams, pageable);
  const mitgliedPage = createPage(mitgliederSlice, pageable);
  logger.debug('get: mitgliedPage=%o', mitgliedPage);
  return c.json(mitgliedPage);
});

// -----------------------------------------------------------------------------
// D o w n l o a d
// -----------------------------------------------------------------------------
router.get('/file/:id', async (c) => {
  const id = c.req.param('id');
  logger.debug('download: id=%s', id);
  const idNumber = Number.parseInt(id, 10);
  if (Number.isNaN(idNumber)) {
    return c.notFound();
  }

  const mitgliedFile = await mitgliedService.findFileByMitgliedId(idNumber);
  if (typeof mitgliedFile === 'undefined') {
    return c.notFound();
  }

  return c.body(mitgliedFile.data, {
    headers: { 'Content-Type': mitgliedFile.mimetype ?? '' },
  });
});
