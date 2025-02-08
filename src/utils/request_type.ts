import { HTTPEncoding } from '@/enums/encoding'
import type { HTTPMethod } from '@/enums/method'
import select from 'css-select'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { RequestContext } from 'hono/jsx-renderer'
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import { parseDocument } from 'htmlparser2'
import { DomUtils } from 'htmlparser2'
import type { ZodSchema } from 'zod'
import type { Bindings } from './bindings'

export type HTTPHeaders = Record<string, string>
export type HTTPParameters = Record<string, string | number | boolean>

export interface RequestType {
  method: HTTPMethod
  path: string
  headers?: HTTPHeaders
  parameters?: HTTPParameters
  encoding?: HTTPEncoding
}

export const request = async <T, U>(
  c: Context<{ Bindings: Bindings }>,
  request: RequestType,
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  S: ZodSchema<T, any, U>
): Promise<T> => {
  const url: URL = new URL(request.path, 'https://shogiwars.heroz.jp/')

  if (request.encoding === HTTPEncoding.QUERY && request.parameters !== undefined) {
    url.search = new URLSearchParams(
      Object.fromEntries(Object.entries(request.parameters).map(([key, value]) => [key, String(value)]))
    ).toString()
  }

  request.headers = { ...request.headers, Cookie: `_web_session=${c.env.COOKIE}` }
  if (request.encoding === HTTPEncoding.JSON) {
    request.headers = { 'Content-Type': 'application/json' }
  }

  // console.debug('[URL]:', url.href)
  // console.debug('[Headers]:', request.headers)
  // console.debug('[Parameters]:', request.parameters)

  const response = await fetch(url.href, {
    method: request.method,
    headers: request.headers,
    body:
      request.parameters === undefined
        ? undefined
        : request.encoding === HTTPEncoding.JSON
          ? JSON.stringify(request.parameters)
          : undefined
  })

  if (!response.ok) {
    throw new HTTPException(response.status as ContentfulStatusCode, { message: response.statusText })
  }

  // ステータスコードで判定
  if (response.headers.get('content-type')?.includes('application/json')) {
    return S.parse(await response.json())
  }

  // 良くわからないときはHTMLとしてパースする
  return S.parse(await response.text())
}
