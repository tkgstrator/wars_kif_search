import { HTTPMethod } from '@/enums/method'
import type { Bindings } from '@/utils/bindings'
import { create_token } from '@/utils/discord'
import { NotFoundResponse } from '@/utils/response'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { setCookie } from 'hono/cookie'

export const app = new OpenAPIHono<{ Bindings: Bindings }>()

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/callback',
    tags: ['認証'],
    summary: 'Discord OAuth2',
    description: 'Discord OAuth2のコールバックです。',
    request: {
      query: z.object({
        code: z.string(),
        state: z.string()
      })
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({})
          }
        },
        description: '認証情報'
      },
      ...NotFoundResponse
    }
  }),
  async (c) => {
    const { code, state } = c.req.valid<'query'>('query')
    const token = await create_token(c, code, state)
    setCookie(c, 'access_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    })
    return c.redirect(new URL(c.env.APP_REDIRECT_URI).href)
  }
)
