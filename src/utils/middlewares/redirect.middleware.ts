import type { Context, Next, NotFoundHandler } from 'hono'
import { createMiddleware } from 'hono/factory'

export const redirect = (c: Context) => {
  return c.redirect('/docs')
}
