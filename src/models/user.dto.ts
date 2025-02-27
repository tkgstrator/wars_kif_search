import { InitPosType } from '@/enums/init_pos_type'
import { TimeType } from '@/enums/time_type'
import { z } from '@hono/zod-openapi'
import { selectAll, selectOne } from 'css-select'
import { HTTPException } from 'hono/http-exception'
import { DomUtils, parseDocument } from 'htmlparser2'

const Result = z.object({
  win: z.number().int().min(0),
  lose: z.number().int().min(0)
})

const Rule = z.object({
  time: z.nativeEnum(TimeType),
  rule: z.nativeEnum(InitPosType),
  rank: z.number().int().min(-10000).max(10),
  rate: z.number().min(0).max(100)
})

const Record = z.object({
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
const _Rule = z.preprocess(
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
      time: timeText === '10 min' ? TimeType.MIN_10 : timeText === '10 sec' ? TimeType.SEC_10 : TimeType.MIN_3,
      rule: timeText.toLocaleLowerCase() === InitPosType.SPRINT ? InitPosType.SPRINT : InitPosType.NORMAL,
      rank: rank,
      rate: rate
    }
  },
  Rule
)

/**
 * 戦績とか
 */
const _Record = z.preprocess(
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
  Record
)

export const UserInfo = z.preprocess(
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  async (input: any) => {
    if (input === null || input === undefined) {
      return input
    }
    const document = parseDocument(DomUtils.getInnerHTML(parseDocument(input)))
    // @ts-ignore
    const src = selectOne('#user_profile .profile img', document).attribs.src
    const match = src.match(/\/(\w+)-l\.png/)
    if (match === null) {
      throw new HTTPException(400, { message: 'User Avatar Parse Failed' })
    }
    const rules = selectAll('table#user_dankyu tr', document).map((rule) => _Rule.parse(rule))
    const records = selectAll('.game_record.data_rows', document).map((record) => _Record.parse(record))
    return {
      avatar: match[1],
      status: rules.map((rule, index) => Object.assign({}, rule, records[index]))
    }
  },
  z.object({
    avatar: z.string(),
    status: z.array(Record.merge(Rule))
  })
)
