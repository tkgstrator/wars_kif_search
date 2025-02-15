import { HTTPEncoding } from '@/enums/encoding'
import type { GameType } from '@/enums/game_type'
import { HTTPMethod } from '@/enums/method'
import type { HTTPHeaders, RequestType } from '@/utils/request_type'

export class User implements RequestType {
  method = HTTPMethod.GET
  path = 'games/history'
  headers?: HTTPHeaders | undefined
  parameters?: Record<string, string | number | boolean> | undefined
  encoding?: HTTPEncoding | undefined = HTTPEncoding.QUERY

  constructor(user_id: string, gtype: GameType, page: number) {
    this.parameters = {
      gtype: gtype,
      locale: 'en',
      page: page,
      user_id: user_id,
      version: 'webapp_9.0.0_standard'
    }
  }
}
