import { db } from '@/server/fake-db/apps/client/index'
import { destr } from 'destr'
import { defineEventHandler, getQuery } from 'h3'

export default defineEventHandler((event) => {
  const { q } = getQuery(event)
  const query = (destr(q) as string)?.toLowerCase() ?? ''

  const filtered = db.mockClients.filter(client =>
    client.name?.toLowerCase().includes(query)
  )

  return filtered.map(c => ({
    id: c.id,
    name: c.name,
  }))
})
