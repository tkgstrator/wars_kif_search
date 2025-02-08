import { HTTPMethod } from '@/enums/method'
import { Game as GameModel } from '@/models/game.dto'
import { Game } from '@/requests/game'
import type { Bindings } from '@/utils/bindings'
import { request } from '@/utils/request_type'
import { BadRequestResponse, NotFoundResponse } from '@/utils/response'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

export const app = new OpenAPIHono<{ Bindings: Bindings }>()

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/games/{game_id}',
    tags: ['棋譜詳細'],
    summary: '棋譜検索',
    description: '指定したユーザーの棋譜を取得します。',
    request: {
      params: z.object({
        game_id: z.string()
      })
    },
    responses: {
      200: {},
      ...NotFoundResponse
    }
  }),
  async (c) => {
    const { game_id } = c.req.valid('param')
    return c.text((await request(c, new Game(c, game_id), GameModel)).csa)
  }
)
