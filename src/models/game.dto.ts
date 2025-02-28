import { GameType } from '@/enums/game_type'
import { z } from '@hono/zod-openapi'
import dayjs from 'dayjs'
import { HTTPException } from 'hono/http-exception'
import { Move, Position, Record, RecordMetadataKey, exportCSA, parseCSAMove } from 'tsshogi'

declare module 'tsshogi' {
  interface Position {
    createMoveByCSA(move: string): Move | null
  }
}

Position.prototype.createMoveByCSA = (move: string): Move | null => {
  // 先手と後手の判定
  const is_black: boolean = move.startsWith('+')
  const pattern: RegExp = /(\+|\-)(\d{2})(\d{2})(\w{2})/
  const match: RegExpMatchArray | null = move.match(pattern)
  console.log(match)
  if (move === '投了') {
    return new Move({ to: null, piece: null, from: null, promote: false, capture: false })
  }
  return null
}

const Player = z.preprocess(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (input: any) => {
    if (input === null || input === undefined) {
      return input
    }
    return {
      name: input.name,
      rank: input.dan,
      avatar: input.avatar
    }
  },
  z.object({
    name: z.string(),
    rank: z.number().int().min(-10000).max(10),
    avatar: z.string()
  })
)

export const Game = z.preprocess(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (input: any) => {
    if (input === null || input === undefined) {
      return input
    }
    const play_time_match: RegExpMatchArray | null = input.game_id.match(/(\d{8}_\d{6})/)
    if (play_time_match === null) {
      throw new HTTPException(400, { message: 'play time parse error' })
    }
    return {
      game_id: input.game_id,
      play_time: dayjs(play_time_match[1], 'YYYYMMDD_HHmmss').tz('Asia/Tokyo').format('YYYY/MM/DD HH:mm:ss'),
      mode: (() => {
        switch (input.game_type) {
          case 0:
            return GameType.Mode.NORMAL
          case 1:
            return GameType.Mode.FRIENDS
          case 2:
            return GameType.Mode.COACH
          case 3:
            return GameType.Mode.EVENT
          case 4:
            return GameType.Mode.LEARNING
          default:
            return GameType.Mode.NORMAL
        }
      })(),
      time: (() => {
        switch (input.game_type) {
          case 's1':
            return GameType.Time.SEC_10
          case 'sb':
            return GameType.Time.MIN_3
          default:
            return GameType.Time.MIN_10
        }
      })(),
      rule: (() => {
        switch (input.init_pos_type) {
          case 0:
            return GameType.Rule.NORMAL
          case 1:
            return GameType.Rule.SPRINT
          default:
            return GameType.Rule.NORMAL
        }
      })(),
      kif: input.kif,
      black: input.user_info[0],
      white: input.user_info[1],
      result: input.result,
      init_pos: input.init_sfen_position
    }
  },
  z
    .object({
      game_id: z.string(),
      play_time: z.string(),
      mode: z.nativeEnum(GameType.Mode),
      time: z.nativeEnum(GameType.Time),
      rule: z.nativeEnum(GameType.Rule),
      kif: z.string(),
      black: Player,
      white: Player,
      result: z.enum([
        'SENTE_WIN_TORYO',
        'GOTE_WIN_TORYO',
        'SENTE_WIN_CHECKMATE',
        'GOTE_WIN_CHECKMATE',
        'SENTE_WIN_TIMEOUT',
        'GOTE_WIN_TIMEOUT'
      ]),
      init_pos: z.string()
    })
    .transform((v) => ({
      ...v,
      get csa(): string {
        const time_format: string = (() => {
          switch (v.time) {
            case GameType.Time.MIN_10:
              return '600+0+0'
            case GameType.Time.MIN_3:
              return '180+0+0'
            default:
              return '0+10+0'
          }
        })()
        let black_init_time: number = v.time === GameType.Time.MIN_10 ? 600 : 180
        let white_init_time: number = v.time === GameType.Time.MIN_10 ? 600 : 180
        const result: string = (() => {
          switch (v.result) {
            case 'SENTE_WIN_TORYO':
              return 'TORYO'
            case 'GOTE_WIN_TORYO':
              return 'TORYO'
            case 'SENTE_WIN_CHECKMATE':
              return 'TORYO'
            case 'GOTE_WIN_CHECKMATE':
              return 'TORYO'
            case 'GOTE_WIN_TIMEOUT':
              return 'TORYO'
            case 'SENTE_WIN_TIMEOUT':
              return 'TORYO'
            default:
              return 'TORYO'
          }
        })()
        const moves = v.kif.split('|').map((entry, index) => {
          const [move, timeStr] = entry.split(',')
          const time: number = Number.parseInt(timeStr, 10)
          const consumed_time: number = (index & 1 ? black_init_time : white_init_time) - time
          if (index & 1) {
            black_init_time = time
          } else {
            white_init_time = time
          }
          return {
            csa: move,
            time: consumed_time
          }
        })
        const position: Position | null = Position.newBySFEN(v.init_pos)
        if (position == null) {
          throw new HTTPException(400, { message: 'init_pos parse error' })
        }
        const record: Record = new Record(position)
        if (v.mode !== GameType.Mode.COACH) {
          record.metadata.setStandardMetadata(RecordMetadataKey.BLACK_NAME, v.black.name)
          record.metadata.setStandardMetadata(RecordMetadataKey.BLACK_SHORT_NAME, v.black.name)
          record.metadata.setStandardMetadata(RecordMetadataKey.WHITE_NAME, v.white.name)
          record.metadata.setStandardMetadata(RecordMetadataKey.WHITE_SHORT_NAME, v.white.name)
        }
        record.metadata.setStandardMetadata(RecordMetadataKey.START_DATETIME, v.play_time)
        record.metadata.setStandardMetadata(RecordMetadataKey.TITLE, `${v.mode},${v.rule}`)
        record.metadata.setStandardMetadata(RecordMetadataKey.BLACK_TIME_LIMIT, black_init_time.toString())
        record.metadata.setStandardMetadata(RecordMetadataKey.WHITE_TIME_LIMIT, white_init_time.toString())
        for (const move of moves) {
          const _move: Move | Error = parseCSAMove(record.position, move.csa)
          if (_move instanceof Error) {
            throw new HTTPException(400, { message: 'move parse error' })
          }
          record.append(_move)
          record.current.setElapsedMs(move.time * 1000)
        }
        return exportCSA(record, { v3: { encoding: 'UTF-8' } })
      }
    }))
)

export type Game = z.infer<typeof Game>
