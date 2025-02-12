import { type ZodSchema, z } from 'zod'

export const Paginated = <T extends ZodSchema>(S: T) =>
  z.object({
    count: z.number().int().min(0),
    results: z.array(S)
  })

// export type Paginated<T extends ZodSchema> = z.infer<ReturnType<typeof Paginated<T>>>

export type Paginated<T extends ZodSchema> = {
  count: number
  results: z.infer<T>[]
}
