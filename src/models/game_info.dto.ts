import { Platform } from '@/enums/platform'
import { PlayerResult } from '@/enums/player_result'
import { ResultType } from '@/enums/result_type'
import { RuleType } from '@/enums/rule_type'
import { TimeType } from '@/enums/time_type'
import { z } from '@hono/zod-openapi'
import selectAll from 'css-select'
import dayjs from 'dayjs'
import { HTTPException } from 'hono/http-exception'
import { DomUtils, parseDocument } from 'htmlparser2'

const Player = z.object({
  name: z.string(),
  rank: z.number().int(),
  is_win: z.boolean()
})

export const GameInfo = z.preprocess(
  (input: unknown) => {
    if (input === null || input === undefined) {
      return input
    }
    // @ts-ignore
    const is_win: boolean = input.match(/<div class="contents winner">/) !== null
    // 千日手の場合にはどちらもlose_playerになる
    // @ts-ignore
    const player_match: RegExpMatchArray | null = input.match(/win_player" href="\/users\/mypage\/(.+?)\?/)
    // @ts-ignore
    const players = [...input.matchAll(/(.*?)\s(\d+?)\s(Dan|Kyu)/g)].map((rank) => rank.map((v) => v.trim()))
    // @ts-ignore
    const category_match: RegExpMatchArray | null = input.match(
      /<div class="game_category">\s*\[([\s\S]*?)\]\s*([\s\S]+?)\s*<\/div>/
    )
    if (category_match === null) {
      console.error('ERROR!!!!!!')
      throw new HTTPException(400, { message: 'category parse error' })
    }
    const time: TimeType =
      category_match[1] === '10 minutes'
        ? TimeType.MIN_10
        : category_match[1] === '3 minutes'
          ? TimeType.MIN_3
          : TimeType.SEC_10
    const rule: RuleType = category_match[2] === 'normal' ? RuleType.NORMAL : RuleType.UNKNOWN
    // @ts-ignore
    const match: RegExpMatchArray | null = input.match(/wars_game_id=([a-zA-Z0-9_-]+)/)
    if (match === null) {
      throw new HTTPException(400, { message: 'game id parse error' })
    }
    const game_id: string = match[1]
    const black: RegExpMatchArray | null = game_id.match(/^(\w*)-/)
    const white: RegExpMatchArray | null = game_id.match(/\-(\w*)-/)
    if (black === null || white === null) {
      throw new HTTPException(400, { message: 'player name parse error' })
    }
    const play_time: RegExpMatchArray | null = game_id.match(/(\d{8}_\d{6})/)
    if (play_time === null) {
      throw new HTTPException(400, { message: 'play time parse error' })
    }
    // @ts-ignore
    const tags: number[] = [...input.matchAll(/\/trophy\/(\d+)/g)].map((tag) => Number.parseInt(tag[1], 10))
    return {
      game_id: game_id,
      play_time: dayjs.tz(play_time[1], 'YYYYMMDD_HHmmss', 'Asia/Tokyo').utc().toISOString(),
      black: {
        name: players[0][1],
        rank: Number.parseInt(players[0][2], 10),
        is_win: player_match === null ? false : player_match[1] === players[0][1]
      },
      white: {
        name: players[1][1],
        rank: Number.parseInt(players[1][2], 10),
        is_win: player_match === null ? false : player_match[1] === players[1][1]
      },
      platform: Platform.SHOGI_WARS,
      time: time,
      rule: rule,
      status: player_match === null ? PlayerResult.DRAW : is_win ? PlayerResult.WIN : PlayerResult.LOSE,
      result:
        player_match === null
          ? ResultType.DRAW
          : player_match[1] === players[0][1]
            ? ResultType.BLACK_WIN
            : ResultType.WHITE_WIN,
      tags: tags
    }
  },
  z.object({
    game_id: z.string(),
    play_time: z.string(),
    black: Player,
    white: Player,
    time: z.nativeEnum(TimeType),
    rule: z.nativeEnum(RuleType),
    status: z.nativeEnum(PlayerResult),
    result: z.nativeEnum(ResultType),
    platform: z.nativeEnum(Platform),
    tags: z.array(z.number())
  })
)

export const GameInfoList = z.preprocess((input: unknown) => {
  if (input === null || input === undefined) {
    return input
  }
  // @ts-ignore
  const document = parseDocument(input)
  return selectAll('.contents', document).map((content) => DomUtils.getOuterHTML(content, { encodeEntities: false }))
}, z.array(GameInfo))

export type GameInfo = z.infer<typeof GameInfo>
export type GameInfoList = z.infer<typeof GameInfoList>
