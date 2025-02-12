import { OpenAPIHono as Hono } from '@hono/zod-openapi'
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
import { app as oauth } from './api/oauth'
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

app.basePath('/api')
app.use('*', (c, next) => {
  if (new URL(c.req.url).hostname !== 'localhost') {
    cache({ cacheName: 'wars_kif_search', cacheControl: 'public, max-age=3600' })
  }
  return next()
})
app.use(logger())
app.use(csrf())
app.use(compress({ encoding: 'deflate' }))
app.use(
  '*',
  cors({
    origin: 'http://localhost:5173',
    credentials: true
  })
)
if (!process.env.DEV) {
  app.doc('/api/specification', specification)
  app.get('/api/docs', apiReference(reference))
  app.notFound((c) => c.redirect('/api/docs'))
}
app.onError(async (error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ message: error.message }, error.status)
  }
  if (error instanceof ZodError) {
    return c.json({ message: JSON.parse(error.message), description: error.cause }, 400)
  }
  return c.json({ message: error.message }, 500)
})
app.route('/api/users', users)
app.route('/api/games', games)
app.route('/api/oauth', oauth)

export default {
  fetch: app.fetch,
  scheduled: scheduled
}
