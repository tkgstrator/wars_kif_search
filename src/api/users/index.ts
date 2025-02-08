import { GameType } from '@/enums/game_type'
import { HTTPMethod } from '@/enums/method'
import { GameInfo, GameInfoList } from '@/models/game_info.dto'
import { User } from '@/requests/user'
import type { Bindings } from '@/utils/bindings'
import { request } from '@/utils/request_type'
import { BadRequestResponse, NotFoundResponse } from '@/utils/response'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

export const app = new OpenAPIHono<{ Bindings: Bindings }>()

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/users/{user_id}',
    tags: ['ユーザー'],
    summary: '棋譜一覧',
    description: '指定したユーザーの棋譜を取得します。',
    request: {
      params: z.object({
        user_id: z.string().openapi({ description: 'ユーザーID', example: 'its' })
      })
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.array(GameInfo).openapi({ description: '棋譜一覧' })
          }
        },
        description: '棋譜一覧'
      },
      ...NotFoundResponse
    }
  }),
  async (c) => {
    const { user_id } = c.req.valid('param')
    const games: GameInfo[] = (
      await Promise.all([
        request(c, new User(user_id, GameType.MIN_10, 1), GameInfoList),
        request(c, new User(user_id, GameType.MIN_3, 1), GameInfoList),
        request(c, new User(user_id, GameType.SEC_10, 1), GameInfoList)
      ])
    ).flat()
    console.log(games)
    return c.json(games)
  }
)
