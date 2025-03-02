import { HTTPMethod } from '@/enums/method'
import { FriendInfo } from '@/models/friend_info.dto'
import { GameInfo, GameInfoList } from '@/models/game_info.dto'
import { UserInfo } from '@/models/user.dto'
import { FriendQuery, GameListQuery, UserQuery } from '@/requests/user'
import type { Bindings } from '@/utils/bindings'
import { KV } from '@/utils/kv'
import { bearerToken } from '@/utils/middlewares/bearerToken'
import { request } from '@/utils/request_type'
import { NotFoundResponse } from '@/utils/response'
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

export const app = new OpenAPIHono<{ Bindings: Bindings }>()

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/@me',
    tags: ['ユーザー'],
    summary: '取得',
    middleware: [bearerToken],
    description: 'ユーザー情報を返します。',
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

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/',
    tags: ['ユーザー'],
    summary: '検索',
    // middleware: [bearerToken],
    description: 'ユーザーの検索結果を返します。',
    request: {
      query: z.object({
        q: z.string().openapi({ description: 'ユーザー名', example: 'its' }),
        limit: z.string().optional(),
        offset: z.string().optional()
      })
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.array(GameInfo).openapi({ description: 'ユーザー情報一覧' })
          }
        },
        description: 'ユーザー情報'
      },
      ...NotFoundResponse
    }
  }),
  async (c) => {
    const { q, limit, offset } = c.req.valid<'query'>('query')
    return c.json(await request(c, new FriendQuery(c, q), FriendInfo))
  }
)

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/{user_id}',
    tags: ['ユーザー'],
    summary: '棋譜一覧',
    description: '指定したユーザーの棋譜一覧を返します。',
    request: {
      params: z.object({
        user_id: z.string().openapi({ description: 'ユーザーID', example: 'its' })
      })
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.array(GameInfo).openapi({ description: '棋譜詳細' })
          }
        },
        description: '棋譜一覧'
      },
      ...NotFoundResponse
    }
  }),
  async (c) => {
    const { user_id } = c.req.valid<'param'>('param')
    const games: GameInfo[] = await KV.GAMES.set(
      c,
      await Promise.all([
        request(c, new GameListQuery(user_id, 'normal', 'normal', ''), GameInfoList),
        request(c, new GameListQuery(user_id, 'normal', 'normal', 'sb'), GameInfoList),
        request(c, new GameListQuery(user_id, 'normal', 'normal', 's1'), GameInfoList),
        request(c, new GameListQuery(user_id, 'normal', 'sprint', 'sb'), GameInfoList)
      ])
    )
    return c.json({
      user_id: user_id,
      results: games
    })
  }
)

app.openapi(
  createRoute({
    method: HTTPMethod.GET,
    path: '/{user_id}/status',
    tags: ['ユーザー'],
    summary: '棋譜一覧',
    description: '指定したユーザーの情報を返します。',
    request: {
      params: z.object({
        user_id: z.string().openapi({ description: 'ユーザーID', example: 'its' })
      })
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.array(GameInfo).openapi({ description: '棋譜詳細' })
          }
        },
        description: '棋譜一覧'
      },
      ...NotFoundResponse
    }
  }),
  async (c) => {
    const { user_id } = c.req.valid<'param'>('param')
    return c.json(await request(c, new UserQuery(user_id), UserInfo))
  }
)
