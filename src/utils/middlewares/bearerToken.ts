import type { Bindings } from '@/utils/bindings'
import type { Next } from 'hono'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { jwt, verify } from 'hono/jwt'
import type { JwtVariables } from 'hono/jwt'
import { AlgorithmTypes } from 'hono/utils/jwt/jwa'
import {
  JwtAlgorithmNotImplemented,
  JwtHeaderInvalid,
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenIssuedAt,
  JwtTokenNotBefore,
  JwtTokenSignatureMismatched
} from 'hono/utils/jwt/types'
type Variables = JwtVariables

/**
 * 認証されたユーザーのみがアクセスできるエンドポイント
 * @param c
 * @param next
 * @returns
 */

export const bearerToken = async (
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
  // biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
): Promise<void | Response> => {
  return jwt({ secret: c.env.JWT_PRIVATE_KEY, alg: AlgorithmTypes.HS256 })(c, next)
}
