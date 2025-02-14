import { HTTPMethod } from '@/enums/method'
import { Discord } from '@/models/discord_token.dto'
import type { z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Bindings } from './bindings'
import { KV } from './kv'

/**
 * 既にユーザーがいればそのユーザーのデータを, なければ新規作成して返す
 * @param c
 * @param code
 * @returns
 */
export const create_token = async (
  c: Context<{ Bindings: Bindings }>,
  code: string,
  state: string
): Promise<string> => {
  const user: Discord.User = await get_user(await get_token(c, code))
  console.log(user)
  try {
    return await KV.USER.create_token(c, await KV.USER.get(c, user.id), state)
  } catch (error) {
    if (error instanceof HTTPException && error.status === 404) {
      return await KV.USER.create_token(c, await KV.USER.set(c, user), state)
    }
    throw error
  }
}

/**
 * Discordの認証用トークンを取得する
 * @param c
 * @param code
 * @returns
 */
const get_token = async (c: Context<{ Bindings: Bindings }>, code: string): Promise<Discord.Token> => {
  return await request(Discord.Token, {
    method: HTTPMethod.POST,
    path: 'oauth2/token',
    body: new URLSearchParams({
      client_id: c.env.DISCORD_CLIENT_ID,
      client_secret: c.env.DISCORD_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: new URL('api/oauth/callback', 'http://localhost:28787').href
    })
  })
}

/**
 * Discordのユーザーデータを取得する
 * @param c
 * @param token
 * @returns
 */
const get_user = async (token: Discord.Token): Promise<Discord.User> => {
  return await request(Discord.User, {
    method: HTTPMethod.GET,
    headers: {
      Authorization: `Bearer ${token.access_token}`
    },
    path: 'users/@me'
  })
}

/**
 * Discordへのリクエストを実行するラッパーメソッド
 * @param S
 * @param c
 * @param options
 * @returns
 */
const request = async <T, U>(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  S: z.ZodSchema<T, any, U>,
  options: {
    method: HTTPMethod
    headers?: Record<string, string | number | boolean>
    path: string
    body?: URLSearchParams | Record<string, string | number | boolean> | undefined
    version?: number
  }
): Promise<T> => {
  const url: URL = new URL(`api/v${options.version || 10}/${options.path}`, 'https://discord.com/')
  if (options.method === HTTPMethod.GET && options.body !== undefined) {
    throw new HTTPException(400, { message: 'GET method does not support body' })
  }
  const headers: Headers = new Headers({
    ...{
      'Content-Type': options.body instanceof URLSearchParams ? 'application/x-www-form-urlencoded' : 'application/json'
    },
    ...options.headers
  })
  const response = await fetch(url.href, {
    method: options.method,
    headers: headers,
    body:
      options.body === undefined
        ? undefined
        : options.body instanceof URLSearchParams
          ? options.body
          : JSON.stringify(options.body)
  })
  if (response.ok) {
    return S.parse(await response.json())
  }
  throw new HTTPException(response.status as ContentfulStatusCode, { message: response.statusText })
}
