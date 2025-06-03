import { db } from '@/server/fake-db/apps/marking';

export default defineEventHandler(event => {
  const markingId = getIntId(event, 'Идентификатор клиента обязателен для получения информации о клиенте.')

  const id = Number(markingId)
  const markingIndex = db.mockMarkings.findIndex(e => e.id === id)

  const marking = db.mockMarkings[markingIndex]

  if (marking)
    return marking
  else
    setResponseStatus(event, 404)
})
