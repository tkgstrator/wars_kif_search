import { TimeType } from '@/enums/time_type'
import { z } from '@hono/zod-openapi'
import { selectAll, selectOne } from 'css-select'
import { HTTPException } from 'hono/http-exception'
import { DomUtils, parseDocument } from 'htmlparser2'

const Result = z.object({
  win: z.number().int().min(0),
  lose: z.number().int().min(0)
})

const Status = z.object({
  time: z.nativeEnum(TimeType),
  rank: z.number().int().min(-10000).max(10),
  rate: z.number().min(0).max(100),
  black: Result,
  white: Result
})

const Trophy = z.object({
  id: z.number().int().min(0),
  owned: z.boolean()
})

/**
 * ルールごとの達成率とか段位とか
 */
const Rule = z.preprocess(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (document: any) => {
    const timeText: string = selectOne('th', document)?.children[0].data.trim()
    const rankText: string = selectOne('.dankyu', document)?.children[0].data.trim()
    const rateText: string = selectOne('.progress_bar span', document)?.children[0].data.trim()
    const rank = (() => {
      const match: RegExpMatchArray | null = rankText.match(/^(\d+)\s*(Dan|Kyu)$/)
      if (match === null) {
        throw new HTTPException(400, { message: 'rank parse error' })
      }
      const [, rank, type] = match
      return type === 'Dan' ? Number.parseInt(rank, 10) : -Number.parseInt(rank, 10)
    })()
    const rate = (() => {
      const match: RegExpMatchArray | null = rateText.match(/(\d+(\.\d+)?)%/)
      if (match === null) {
        throw new HTTPException(400, { message: 'rate parse error' })
      }
      const [, rate] = match
      return Number.parseFloat(rate)
    })()
    return {
      time: timeText === '10 minutes' ? TimeType.MIN_10 : timeText === '3 minutes' ? TimeType.MIN_3 : TimeType.SEC_10,
      rank: rank,
      rate: rate
    }
  },
  z.object({
    time: z.string(),
    rank: z.number().int().min(-10000).max(10),
    rate: z.number().min(0).max(100)
  })
)

/**
 * 戦績とか
 */
const Record = z.preprocess(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  (document: any) => {
    const divs = selectAll('div', document)
    const black = (() => {
      const div = divs[1].children[1].data.trim()
      const match = div.match(/(\d+)\s*win\s+(\d+)\s*lose/)
      if (match === null) {
        throw new HTTPException(400, { message: 'Record Black Parse Error' })
      }
      return {
        win: Number.parseInt(match[1], 10),
        lose: Number.parseInt(match[2], 10)
      }
    })()
    const white = (() => {
      const div = divs[2].children[1].data.trim()
      const match = div.match(/(\d+)\s*win\s+(\d+)\s*lose/)
      if (match === null) {
        throw new HTTPException(400, { message: 'Record White Parse Error' })
      }
      return {
        win: Number.parseInt(match[1], 10),
        lose: Number.parseInt(match[2], 10)
      }
    })()
    return {
      black: black,
      white: white
    }
  },
  z.object({
    black: z.object({
      win: z.number().int().min(0),
      lose: z.number().int().min(0)
    }),
    white: z.object({
      win: z.number().int().min(0),
      lose: z.number().int().min(0)
    })
  })
)

export const UserInfo = z.preprocess(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  async (input: any) => {
    const document = parseDocument(DomUtils.getInnerHTML(parseDocument(input)))
    // @ts-ignore
    const src = selectOne('#user_profile .profile img', document).attribs.src
    const match = src.match(/\/(\w+)-l\.png/)
    if (match === null) {
      throw new HTTPException(400, { message: 'User Avatar Parse Failed' })
    }
    const rules = selectAll('table#user_dankyu tr', document).map((rule) => Rule.parse(rule))
    const records = selectAll('.game_record.data_rows', document).map((record) => Record.parse(record))
    return {
      avatar: match[1],
      status: rules.map((rule, index) => Object.assign({}, rule, records[index]))
    }
  },
  z.object({
    avatar: z.string(),
    status: z.array(Status)
  })
)
