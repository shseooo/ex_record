import { isOpArray, MAX_OPS_PER_REQUEST } from '@/lib/data/ops'
import { withRepository } from '@/lib/server/http'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!isOpArray(body?.ops) || body.ops.length === 0 || body.ops.length > MAX_OPS_PER_REQUEST) {
    return Response.json({ error: 'invalid ops' }, { status: 400 })
  }
  return withRepository(req, async (repo) => Response.json(await repo.apply(body.ops)))
}
