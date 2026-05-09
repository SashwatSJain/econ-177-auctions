import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import InstructorHeader from '@/components/instructor/InstructorHeader'

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/instructor/login')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <InstructorHeader userEmail={user.email ?? ''} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </div>
    </div>
  )
}
