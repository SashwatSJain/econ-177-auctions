import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import InstructorPanel from '@/components/InstructorPanel'

export default async function InstructorPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/instructor/login')
  }

  return <InstructorPanel userEmail={user.email ?? ''} />
}
