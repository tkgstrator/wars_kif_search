import { HTTPEncoding } from '@/enums/encoding'
import type { GameType } from '@/enums/game_type'
import { HTTPMethod } from '@/enums/method'
import type { Bindings } from '@/utils/bindings'
import type { HTTPHeaders, RequestType } from '@/utils/request_type'
import type { Context } from 'hono'

export class Game implements RequestType {
  method = HTTPMethod.GET
  path = 'api/app/games/game_analysis_info'
  headers?: HTTPHeaders | undefined
  parameters?: Record<string, string | number | boolean> | undefined
  encoding?: HTTPEncoding | undefined = HTTPEncoding.QUERY

  constructor(c: Context<{ Bindings: Bindings }>, game_id: string) {
    this.parameters = {
      user_id: c.env.USER_ID,
      secret: c.env.SECRET,
      game_id: game_id,
      locale: 'en',
      version: 'webapp_9.0.0_standard'
    }
  }
}
