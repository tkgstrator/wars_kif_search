import { WorkersKVStore } from '@hono-rate-limiter/cloudflare'
import { OpenAPIHono as Hono } from '@hono/zod-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import type { Context, Next } from 'hono'
import { rateLimiter } from 'hono-rate-limiter'
import { cache } from 'hono/cache'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { ZodError } from 'zod'
import { app as forms } from './api/forms'
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

// app.use('*', timeout(5000))
app.use(logger())
app.use(compress({ encoding: 'deflate' }))
app.use(
  '*',
  cors({
    origin: ['http://localhost:5173', 'https://dev.mito-shogi.com', 'https://mito-shogi.com'],
    credentials: true,
    maxAge: 86400
  })
)
// app.use(csrf())
app.use('*', (c, next) => {
  if (new URL(c.req.url).hostname !== 'localhost') {
    cache({ cacheName: 'wars_kif_search', cacheControl: 'public, max-age=3600' })
  }
  return next()
})
app.use((c: Context, next: Next) =>
  rateLimiter<{ Bindings: Bindings }>({
    windowMs: 5 * 60 * 1000,
    limit: 100,
    standardHeaders: 'draft-7',
    keyGenerator: (c) =>
      c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown',
    store: new WorkersKVStore({ namespace: c.env.CACHE })
  })(c, next)
)
if (!process.env.DEV) {
  app.doc('/specification', specification)
  app.get('/docs', apiReference(reference))
  app.notFound((c) => c.redirect('/docs'))
}
app.onError(async (error, c) => {
  if (error instanceof HTTPException) {
    return c.json({ message: error.message }, error.status)
  }
  if (error instanceof ZodError) {
    return c.json({ message: JSON.parse(error.message), description: error.cause }, 400)
  }
  console.error(error)
  return c.json({ message: error.message }, 500)
})
app.route('/users', users)
app.route('/games', games)
app.route('/forms', forms)
app.route('/oauth', oauth)

export default {
  fetch: app.fetch,
  scheduled: scheduled
}
