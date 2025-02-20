const requestHistory = new Map<string, number[]>()
const TIME_WINDOW_MS = 5 * 60 * 1000 // 5分
const LATE_LIMIT = 5

// /**
//  * 認証されたユーザーのみがアクセスできるエンドポイント
//  * @param c
//  * @param next
//  * @returns
//  */
// export const rateLimit = (option: { windowMs: number }): MiddlewareHandler => {
//   const identifier: string =
//     c.req.header('x-forwarded-for') ||
//     c.req.header('CF-Connecting-IP') ||
//     c.req.header('X-Real-IP') ||
//     c.env?.remoteAddr || // Cloudflare Workers環境用
//     'unknown'
//   const current: number = dayjs().valueOf()
//   // 同一IPからのリクエスト数を取得
//   const timestamps: number[] = (requestHistory.get(identifier) || []).filter(
//     (timestamp: number) => current - timestamp < option.windowMs
//   )
//   timestamps.push(current)
//   requestHistory.set(identifier, timestamps)
//   console.info(`Request from ${identifier} (${timestamps.length + 1}/${LATE_LIMIT})`)
//   if (timestamps.length >= LATE_LIMIT) {
//     throw new HTTPException(429, { message: 'Too many requests' })
//   }
//   await next()
// }
