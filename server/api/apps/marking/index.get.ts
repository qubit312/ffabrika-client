import { db } from '@/server/fake-db/apps/marking'
import is from '@sindresorhus/is'
import { destr } from 'destr'
import { defineEventHandler, getQuery } from 'h3'
import { paginateArray } from '~/server/utils/paginateArray'

export default defineEventHandler((event) => {
  const { itemsPerPage = 10, page = 1 } = getQuery(event)
    const allMarkings = db.mockMarkings;

  const parsedItemsPerPage = destr(itemsPerPage)
  const parsedPage = destr(page)

  const itemsPerPageLocal = is.number(parsedItemsPerPage) ? parsedItemsPerPage : 10
  const pageLocal = is.number(parsedPage) ? parsedPage : 1
  const paginatedMarkings = paginateArray(allMarkings, itemsPerPageLocal, pageLocal)
  return {
    markings: paginatedMarkings,
    total: allMarkings.length
  }
})
