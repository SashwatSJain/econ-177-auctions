'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function InstructorHeader({
  userEmail,
  expTitle,
}: {
  userEmail: string
  expTitle?: string
}) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/instructor/login')
    router.refresh()
  }

  return (
    <header
      className="border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-3"
      style={{ borderColor: 'var(--border)', background: '#fff' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--navy)' }}>
            UCSB · Econ 177
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <Link
              href="/instructor"
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--text)' }}
            >
              Instructor Dashboard
            </Link>
            {expTitle && (
              <>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>/</span>
                <span className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
                  {expTitle}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <span className="text-xs hidden sm:block truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
          {userEmail}
        </span>
        <button
          onClick={handleSignOut}
          className="btn-ghost text-xs px-3 py-1.5 rounded"
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
