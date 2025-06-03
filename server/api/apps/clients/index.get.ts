import { db } from '@/server/fake-db/apps/client'
import is from '@sindresorhus/is'
import { destr } from 'destr'
import { defineEventHandler, getQuery } from 'h3'
import { paginateArray } from '~/server/utils/paginateArray'

export default defineEventHandler((event) => {
  const { itemsPerPage = 10, page = 1 } = getQuery(event)
    const allClients = db.mockClients;

  const parsedItemsPerPage = destr(itemsPerPage)
  const parsedPage = destr(page)

  const itemsPerPageLocal = is.number(parsedItemsPerPage) ? parsedItemsPerPage : 10
  const pageLocal = is.number(parsedPage) ? parsedPage : 1
  const paginatedClients = paginateArray(allClients, itemsPerPageLocal, pageLocal)
  return {
    markings: paginatedClients,
    total: allClients.length
  }
})
