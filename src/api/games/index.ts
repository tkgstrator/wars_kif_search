import { GameType } from '@/enums/game_type'
import { HTTPMethod } from '@/enums/method'
import { Game as GameModel } from '@/models/game.dto'
import { type GameInfo, GameInfoList } from '@/models/game_info.dto'
import { Game } from '@/requests/game'
import { User } from '@/requests/user'
import type { Bindings } from '@/utils/bindings'
import { bearerToken } from '@/utils/middlewares/bearerToken'
import { request } from '@/utils/request_type'
import { NotFoundResponse } from '@/utils/response'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

export const app = new OpenAPIHono<{ Bindings: Bindings }>()

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/',
    tags: ['棋譜'],
    summary: '一覧',
    middleware: [bearerToken],
    description: '棋譜一覧を取得します',
    request: {},
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.array(GameModel).openapi({ description: '棋譜一覧' })
          }
        },
        description: '棋譜一覧'
      },
      ...NotFoundResponse
    }
  }),
  async (c) => {
    const { uid } = c.get('jwtPayload')
    console.log(uid)
    const games: GameInfo[] = (
      await Promise.all([
        // @ts-ignore
        request(c, new User(uid, GameType.MIN_10, 1), GameInfoList),
        // @ts-ignore
        request(c, new User(uid, GameType.MIN_3, 1), GameInfoList),
        // @ts-ignore
        request(c, new User(uid, GameType.SEC_10, 1), GameInfoList)
      ])
    ).flat()
    console.log(games)
    return c.json(games)
  }
)

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/{game_id}',
    middleware: [bearerToken],
    tags: ['棋譜'],
    summary: '詳細',
    description: '指定した対局IDの棋譜を取得します',
    request: {
      params: z.object({
        game_id: z.string()
      })
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.array(GameModel).openapi({ description: '棋譜' })
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
    return c.text((await request(c, new Game(c, game_id), GameModel)).csa)
  }
)
