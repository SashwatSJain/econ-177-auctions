import type { SupabaseClient } from '@supabase/supabase-js'

export async function getActiveQuarterId(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin.from('quarters').select('id').eq('is_active', true).single()
  return data?.id ?? null
}

export async function resolveQuarterId(
  admin: SupabaseClient,
  quarterParam: string | null | undefined,
): Promise<string | null> {
  if (quarterParam) return quarterParam
  return getActiveQuarterId(admin)
}
