import { HTTPMethod } from '@/enums/method'
import { Game } from '@/models/game.dto'
import {} from '@/models/game_info.dto'
import { GameQuery } from '@/requests/game'
import type { Bindings } from '@/utils/bindings'
import { KV } from '@/utils/kv'
import { request } from '@/utils/request_type'
import { NotFoundResponse } from '@/utils/response'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

export const app = new OpenAPIHono<{ Bindings: Bindings }>()

// app.openapi(
//   createRoute({
//     method: HTTPMethod.GET,
//     path: '/',
//     tags: ['棋譜'],
//     summary: '一覧',
//     // middleware: [bearerToken],
//     description: '棋譜一覧を返します。',
//     request: {},
//     responses: {
//       200: {
//         content: {
//           'application/json': {
//             schema: Paginated(Game).openapi({ description: '棋譜一覧' })
//           }
//         },
//         description: '棋譜一覧'
//       },
//       ...NotFoundResponse
//     }
//   }),
//   async (c) => {
//     const { uid } = c.get('jwtPayload')
//     const games: GameInfo[] = (
//       await Promise.all([
//         // @ts-ignore
//         request(c, new User(uid, GameType.MIN_10, 1), GameInfoList),
//         // @ts-ignore
//         request(c, new User(uid, GameType.MIN_3, 1), GameInfoList),
//         // @ts-ignore
//         request(c, new User(uid, GameType.SEC_10, 1), GameInfoList)
//       ])
//     ).flat()
//     return c.json({
//       count: games.length,
//       results: games
//     })
//   }
// )

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/{game_id}',
    // middleware: [bearerToken],
    tags: ['棋譜'],
    summary: '詳細',
    description: '指定した対局IDの棋譜をCSA形式で返します。',
    request: {
      params: z.object({
        game_id: z.string()
      })
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.array(Game).openapi({ description: '棋譜' })
          }
        },
        description: '棋譜'
      },
      ...NotFoundResponse
    }
  }),
  async (c) => {
    const { game_id } = c.req.valid<'param'>('param')
    // @ts-ignore
    return c.text(await KV.CSA.set(c, game_id, (await request(c, new GameQuery(c, game_id), Game)).csa))
  }
)

app.openapi(
  createRoute({
    method: HTTPMethod.DELETE,
    path: '/',
    // middleware: [bearerToken],
    tags: ['棋譜'],
    summary: '削除',
    description: '対局情報を削除します',
    request: {},
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.array(Game).openapi({ description: '棋譜' })
          }
        },
        description: '棋譜'
      },
      ...NotFoundResponse
    }
  }),
  async (c) => {
    return c.json(await KV.GAMES.remove(c))
  }
)
