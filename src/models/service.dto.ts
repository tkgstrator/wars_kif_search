import { ServiceId } from '@/enums/service_id'
import { z } from '@hono/zod-openapi'

export const Service = z.object({
  service_id: z.nativeEnum(ServiceId),
  id: z.string()
})

export type Service = z.infer<typeof Service>
