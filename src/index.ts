import { OpenAPIHono as Hono, createRoute } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import { cache } from 'hono/cache'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { ZodError } from 'zod'
import { app as games } from './api/games'
import { app as users } from './api/users'
import type { Bindings } from './utils/bindings'
import { reference, specification } from './utils/docs'
import { scheduled } from './utils/handler/scheduled'

const app = new Hono<{ Bindings: Bindings }>()

app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
  type: 'http',
  scheme: 'bearer',
  in: 'header',
  description: 'Bearer Token'
})

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault('Asia/Tokyo')

app.use('*', (c, next) => {
  if (new URL(c.req.url).hostname !== 'localhost') {
    cache({ cacheName: 'dk_proxy_api', cacheControl: 'public, max-age=3600' })
  }
  return next()
})
app.use(logger())
app.use(csrf())
app.use(compress({ encoding: 'deflate' }))
app.use('*', cors())
app.doc('/specification', specification)
app.get('/docs', apiReference(reference))
app.onError(async (error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ message: error.message }, error.status)
  }
  if (error instanceof ZodError) {
    return c.json({ message: JSON.parse(error.message), description: error.cause }, 400)
  }
  return c.json({ message: error.message }, 500)
})
app.notFound((c) => c.redirect('/docs'))

app.route('/api/users', users)
app.route('/api/games', games)

export default {
  fetch: app.fetch,
  scheduled: scheduled
}
