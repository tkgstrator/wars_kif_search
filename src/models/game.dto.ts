import { GameType } from '@/enums/game_type'
import { z } from '@hono/zod-openapi'
import dayjs from 'dayjs'
import { HTTPException } from 'hono/http-exception'
import { type Record, exportCSA, importCSA } from 'tsshogi'

export const Game = z
  .object({
    game_id: z.string(),
    game_time: z.nativeEnum(GameType.Time),
    kif: z.string(),
    result: z.string(),
    status: z.boolean(),
    opponent_type: z.number().int().min(0),
    init_sfen_position: z.string()
  })
  .transform((v) => ({
    ...v,
    get csa(): string {
      const black_match: RegExpMatchArray | null = v.game_id.match(/^(\w*)-/)
      const white_match: RegExpMatchArray | null = v.game_id.match(/\-(\w*)-/)
      if (black_match === null || white_match === null) {
        throw new HTTPException(400, { message: 'player name parse error' })
      }
      const start_time_match: RegExpMatchArray | null = v.game_id.match(/(\d{8}_\d{6})/)
      if (start_time_match === null) {
        throw new HTTPException(400, { message: 'start time parse error' })
      }
      const black: string = black_match[1]
      const white: string = white_match[1]
      const start_time: string = dayjs(start_time_match[1], 'YYYYMMDD_HHmmss')
        .tz('Asia/Tokyo')
        .format('YYYY/MM/DD HH:mm:ss')
      const time_format: string =
        v.game_time === GameType.Time.MIN_10 ? '600+0+0' : v.game_time === GameType.Time.MIN_3 ? '180+0+0' : '0+10+0'
      let black_init_time: number = v.game_time === GameType.Time.MIN_10 ? 600 : 180
      let white_init_time: number = v.game_time === GameType.Time.MIN_10 ? 600 : 180
      const moves = v.kif.split('|').map((entry, index) => {
        const [move, timeStr] = entry.split(',')
        const time: number = Number.parseInt(timeStr, 10)
        const consumed_time: number = (index & 1 ? black_init_time : white_init_time) - time
        if (index & 1) {
          black_init_time = time
        } else {
          white_init_time = time
        }
        return { move, consumed_time }
      })
      const game_type: string =
        v.game_time === GameType.Time.MIN_10 ? '10m' : v.game_time === GameType.Time.MIN_3 ? '3m' : '10s'
      const game: string = [
        'v3.0',
        `N+${black}`,
        `N-${white}`,
        `$EVENT:ShogiWars ${game_type}`,
        `$START_TIME:${start_time}`,
        `$TIME:${time_format}`,
        'PI',
        '+',
        moves.map((move) => `${move.move},T${move.consumed_time}`),
        v.result
      ]
        .flat()
        .join('\n')
      const record: Record | Error = importCSA(game)
      if (record instanceof Error) {
        throw new HTTPException(400, { message: 'record parse error' })
      }
      return exportCSA(record, { v3: { encoding: 'UTF-8', milliseconds: true } })
    }
  }))

export type Game = z.infer<typeof Game>
