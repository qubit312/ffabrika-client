import { db } from '@/server/fake-db/apps/client';

export default defineEventHandler(event => {
  const clientId = getIntId(event, 'Идентификатор клиента обязателен для получения информации о клиенте.')

  const id = clientId
  const clientIndex = db.mockClients.findIndex(e => e.id === id)

  const client = db.mockClients[clientIndex]

  if (client)
    return client
  else
    setResponseStatus(event, 404)
})
