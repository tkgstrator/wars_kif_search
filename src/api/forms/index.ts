import { HTTPMethod } from '@/enums/method'
import {} from '@/requests/user'
import type { Bindings } from '@/utils/bindings'
import { BadRequestResponse } from '@/utils/response'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export const app = new OpenAPIHono<{ Bindings: Bindings }>()

app.openapi(
  createRoute({
    method: HTTPMethod.POST,
    path: '/',
    tags: ['フォーム'],
    summary: '送信',
    description: '問い合わせを受け付けます。',
    request: {
      body: {
        content: {
          'application/json': {
            schema: z.object({
              device: z.object({
                os: z.object({
                  name: z.string(),
                  version: z.string()
                }),
                browser: z.object({
                  name: z.string(),
                  version: z.string(),
                  short_version: z.string()
                }),
                mobile: z.object({
                  vendor: z.string(),
                  model: z.string()
                }),
                engine: z.object({
                  name: z.string(),
                  version: z.string()
                })
              }),
              data: z.object({
                category: z.string(),
                content: z.string(),
                username: z.string().optional(),
                title: z.string(),
                tags: z.array(z.string())
              })
            })
          }
        }
      }
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              status: z.boolean()
            })
          }
        },
        description: 'ユーザー情報'
      },
      ...BadRequestResponse
    }
  }),
  async (c) => {
    const body = c.req.valid<'json'>('json')
    const url: URL = new URL(c.env.DISCORD_WEBHOOK_URL)
    const response = await fetch(url.href, {
      method: HTTPMethod.POST,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        thread_name: body.data.title,
        content: body.data.content,
        // username: body.data.username,
        embeds: [
          {
            fields: [
              {
                name: 'os',
                value: `${body.device.os.name} ${body.device.os.version}`,
                inline: true
              },
              {
                name: 'browser',
                value: `${body.device.browser.name} ${body.device.browser.version}`,
                inline: true
              },
              {
                name: 'mobile',
                value: `${body.device.mobile.vendor} ${body.device.mobile.model}`,
                inline: true
              }
            ]
          }
        ],
        applied_tags: [body.data.category].concat(body.data.tags)
      })
    })
    if (response.ok) {
      return c.json({ status: true })
    }
    throw new HTTPException(response.status as ContentfulStatusCode, await response.json())
  }
)
