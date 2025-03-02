import { GameType } from '@/enums/game_type'
import { Platform } from '@/enums/platform'
import { z } from '@hono/zod-openapi'
import selectAll, { selectOne } from 'css-select'
import dayjs from 'dayjs'
import { HTTPException } from 'hono/http-exception'
import { DomUtils, parseDocument } from 'htmlparser2'

const Player = z.preprocess(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (input: any) => {
    return input
  },
  z.object({
    name: z.string(),
    rank: z.number().int(),
    is_win: z.boolean()
  })
)

export const GameInfo = z.object({
  game_id: z.string(),
  play_time: z.string(),
  black: Player,
  white: Player,
  mode: z.nativeEnum(GameType.Mode),
  time: z.nativeEnum(GameType.Time),
  rule: z.nativeEnum(GameType.Rule),
  status: z.nativeEnum(GameType.Status),
  result: z.nativeEnum(GameType.Result),
  platform: z.nativeEnum(Platform),
  tags: z.array(z.number())
})

const _GameInfo = z.preprocess(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (input: any) => {
    if (input === null || input === undefined) {
      return input
    }
    const game_id: string | null = new URL(
      selectOne('div.caption_right_side .analytics_link a', input).attribs.href
    ).searchParams.get('wars_game_id')
    if (game_id === null) {
      throw new HTTPException(400, { message: 'game_id parse error' })
    }
    const is_win: boolean = input.attribs.class === 'game_list_contents winner_bg'
    const is_draw: boolean = input.attribs.class === 'game_list_contents flat_bg'
    const is_playing: boolean = selectOne(
      'div.game_players .left_right_players .left_player img.win_lose_img',
      input
    ).attribs.src.includes('playing')
    const mode: string = selectOne('div.game_category .opponent_type_text', input).children[0].data.trim()
    const rule: string = selectOne('div.game_category .init_pos_type_text', input).children[0].data.trim()
    const time: string = selectOne('div.game_category .time_mode_text', input).children[0].data.trim()
    const play_time: string = selectOne('div.game_footer .game_date', input).children[0].data.trim()
    const black = (() => {
      // const player = selectOne('div.game_players .left_right_players .left_player', input)
      const name = selectOne('.player_name_text_left', input).children[0].data.trim()
      const rank = selectOne('.player_dan_text_left', input).children[0].data.trim()
      const is_lose = selectOne('.left_player_avatar.lose_avatar', input) !== null
      return {
        name: name,
        rank: Number.parseInt(rank.match(/(\d+) (Dan|Kyu)/)[1], 10) * (rank.includes('Dan') ? 1 : -1),
        is_win: is_draw ? false : !is_lose
      }
    })()
    const white = (() => {
      // const player = selectOne('div.game_players .left_right_players .right_player', input)
      const name = selectOne('.player_name_text_right', input).children[0].data.trim()
      const rank = selectOne('.player_dan_text_right', input).children[0].data.trim()
      const is_lose = selectOne('.right_player_avatar.lose_avatar', input) !== null
      return {
        name: name,
        rank: Number.parseInt(rank.match(/(\d+) (Dan|Kyu)/)[1], 10) * (rank.includes('Dan') ? 1 : -1),
        is_win: is_draw ? false : !is_lose
      }
    })()
    const tags = selectAll('div.game_footer .game_badges span a', input).map(
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      (tag: any) => Number.parseInt(tag.attribs.href.match(/trophy\/(\d+)/)[1], 10)
    )
    return {
      game_id: game_id,
      play_time: dayjs.tz(play_time, 'Asia/Tokyo').toISOString(),
      black: black,
      white: white,
      mode: mode.toLocaleLowerCase(),
      time: time.toLocaleLowerCase(),
      rule: rule.toLocaleLowerCase(),
      status: is_playing
        ? GameType.Status.PLAYING
        : is_draw
          ? GameType.Status.DRAW
          : is_win
            ? GameType.Status.WIN
            : GameType.Status.LOSE,
      result: is_playing
        ? GameType.Result.PLAYING
        : is_draw
          ? GameType.Result.DRAW
          : black.is_win
            ? GameType.Result.BLACK_WIN
            : GameType.Result.WHITE_WIN,
      platform: Platform.SHOGI_WARS,
      tags: tags
    }
  },
  GameInfo
)

export const GameInfoList = z.preprocess((input: unknown) => {
  if (input === null || input === undefined) {
    return input
  }
  // @ts-ignore
  const document = parseDocument(DomUtils.getInnerHTML(parseDocument(input)))
  return selectAll('div.game_list_contents', document)
}, z.array(_GameInfo))

export type GameInfo = z.infer<typeof GameInfo>
export type GameInfoList = z.infer<typeof GameInfoList>
