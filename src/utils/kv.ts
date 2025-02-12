import { Discord } from '@/models/discord_token.dto'
import dayjs, { type Dayjs } from 'dayjs'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { AlgorithmTypes } from 'hono/utils/jwt/jwa'
import { sign } from 'hono/utils/jwt/jwt'
import { uuidv7 } from 'uuidv7'
import type { Bindings } from './bindings'

export namespace KV {
  export namespace USER {
    export const get = async (c: Context<{ Bindings: Bindings }>, id: string) => {
      const data: unknown | null = await c.env.USERS.get(id, { type: 'json' })
      if (data === null) {
        throw new HTTPException(404, { message: 'Not Found' })
      }
      return Discord.User.parse(data)
    }

    export const set = async (c: Context<{ Bindings: Bindings }>, data: Discord.User): Promise<Discord.User> => {
      await c.env.USERS.put(data.id, JSON.stringify(data))
      return data
    }

    export const create_token = async (
      c: Context<{ Bindings: Bindings }>,
      data: Discord.User,
      state: string
    ): Promise<string> => {
      const current_time: Dayjs = dayjs()
      const token: Record<string, string | number | boolean> = {
        aud: c.env.DISCORD_CLIENT_ID,
        exp: current_time.add(356, 'd').unix(),
        iat: current_time.unix(),
        nbf: current_time.unix(),
        iss: new URL(c.req.url).hostname,
        jti: uuidv7(),
        sub: data.id,
        typ: 'access_token',
        uid: state
      }
      return sign(token, c.env.APP_JWT_SECRET, AlgorithmTypes.HS256)
    }
  }
}
