import { HTTPMethod } from '@/enums/method'
import { GameInfo } from '@/models/game_info.dto'
import type { Bindings } from '@/utils/bindings'
import { KV } from '@/utils/kv'
import { bearerToken } from '@/utils/middlewares/bearerToken'
import { NotFoundResponse } from '@/utils/response'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

export const app = new OpenAPIHono<{ Bindings: Bindings }>()

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/',
    tags: ['ユーザー'],
    summary: '取得',
    middleware: [bearerToken],
    description: 'ユーザー情報を取得します',
    request: {},
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.array(GameInfo).openapi({ description: '棋譜詳細' })
          }
        },
        description: 'ユーザー情報'
      },
      ...NotFoundResponse
    }
  }),
  async (c) => {
    const { sub } = c.get('jwtPayload')
    // @ts-ignore
    return c.json(await KV.USER.get(c, sub))
  }
)

// app.openapi(
//   createRoute({
//     method: HTTPMethod.GET,
//     path: '/{user_id}',
//     tags: ['ユーザー'],
//     summary: '棋譜一覧',
//     description: '指定したユーザーの棋譜を取得します。',
//     request: {
//       params: z.object({
//         user_id: z.string().openapi({ description: 'ユーザーID', example: 'its' })
//       })
//     },
//     responses: {
//       200: {
//         content: {
//           'application/json': {
//             schema: z.array(GameInfo).openapi({ description: '棋譜詳細' })
//           }
//         },
//         description: '棋譜一覧'
//       },
//       ...NotFoundResponse
//     }
//   }),
//   async (c) => {
//     const { user_id } = c.req.valid<'param'>('param')
//     const games: GameInfo[] = (
//       await Promise.all([
//         request(c, new User(user_id, GameType.MIN_10, 1), GameInfoList),
//         request(c, new User(user_id, GameType.MIN_3, 1), GameInfoList),
//         request(c, new User(user_id, GameType.SEC_10, 1), GameInfoList)
//       ])
//     ).flat()
//     console.log(games)
//     return c.json(games)
//   }
// )
