import { z } from '@hono/zod-openapi'
import selectAll, { selectOne } from 'css-select'
import dayjs from 'dayjs'
import { HTTPException } from 'hono/http-exception'
import { DomUtils, parseDocument } from 'htmlparser2'

export const GameInfo = z.preprocess(
  (input: unknown) => {
    if (input === null || input === undefined) {
      return input
    }
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
    const tags = [...input.matchAll(/<a class="hashtag_badge"[^>]*>#(.*?)<\/a>/g)]
    return {
      game_id: game_id,
      play_time: dayjs(play_time[1], 'YYYYMMDD_HHmmss').tz('Asia/Tokyo').toISOString(),
      black: black[1],
      white: white[1],
      tags: tags.map((tag) => tag[1].trim())
    }
  },
  z.object({
    game_id: z.string(),
    play_time: z.string(),
    black: z.string(),
    white: z.string(),
    tags: z.array(z.string())
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
