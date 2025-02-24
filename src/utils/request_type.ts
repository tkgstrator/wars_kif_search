import { HTTPEncoding } from '@/enums/encoding'
import { HTTPMethod } from '@/enums/method'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
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
  } else {
    url.search = new URLSearchParams({ locale: 'en', version: 'webapp_10.0.0_standard' }).toString()
  }

  if (request.encoding === HTTPEncoding.JSON) {
    request.headers = { 'Content-Type': 'application/json', Accept: '*/*' }
  }
  if (request.encoding === HTTPEncoding.FORM) {
    request.headers = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: '*/*' }
  }
  request.headers = { ...request.headers, Cookie: `_web_session=${c.env.WARS_COOKIE}` }

  // console.log(url.href)
  // console.log(request.headers)
  // console.log(request.parameters)

  const response = await fetch(url.href, {
    method: request.method,
    headers: request.headers,
    body:
      request.parameters === undefined || request.method === HTTPMethod.GET
        ? undefined
        : request.encoding === HTTPEncoding.JSON
          ? JSON.stringify(request.parameters)
          : new URLSearchParams(
              Object.fromEntries(Object.entries(request.parameters).map(([key, value]) => [key, String(value)]))
            ),
    redirect: 'follow'
  })

  if (!response.ok) {
    throw new HTTPException(response.status as ContentfulStatusCode, { message: response.statusText })
  }

  // ステータスコードで判定
  if (response.headers.get('content-type')?.includes('application/json')) {
    return S.parse(await response.json())
  }

  // return await S.parseAsync(response)
  // 良くわからないときはHTMLとしてパースする
  return await S.parseAsync(await response.text())
}
