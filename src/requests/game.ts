import { HTTPEncoding } from '@/enums/encoding'
import { HTTPMethod } from '@/enums/method'
import type { Bindings } from '@/utils/bindings'
import type { HTTPHeaders, RequestType } from '@/utils/request_type'
import type { Context } from 'hono'

export class GameQuery implements RequestType {
  method = HTTPMethod.GET
  path = 'api/app/games/game_analysis_info'
  headers?: HTTPHeaders | undefined
  parameters?: Record<string, string | number | boolean> | undefined
  encoding?: HTTPEncoding | undefined = HTTPEncoding.QUERY

  constructor(c: Context<{ Bindings: Bindings }>, game_id: string) {
    this.parameters = {
      user_id: c.env.WARS_USER_ID,
      secret: c.env.WARS_SECRET,
      game_id: game_id,
      locale: 'en',
      version: 'webapp_10.0.0_standard'
    }
  }
}
